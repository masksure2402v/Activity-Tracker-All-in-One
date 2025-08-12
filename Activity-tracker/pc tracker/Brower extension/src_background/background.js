// background.js (Manifest V3 service worker)

const BACKEND_URL = "http://localhost:5000/api/chrome-activity";
const SYNC_INTERVAL_SECONDS = 10;
const STORAGE_LIMIT = 5 * 1024 * 1024; // 5 MB in bytes
let lastNotifiedPercent = 0; // avoid duplicate notifications

let currentSession = null;
let tabSwitchInProgress = false;

function log(...args) {
  console.log("[chrome-tracker]", ...args);
}

function getDomainFromUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function saveCurrentSessionToStorage(session) {
  return chrome.storage.local.set({ currentSession: session });
}

function removeCurrentSessionFromStorage() {
  return chrome.storage.local.remove("currentSession");
}

function readCurrentSessionFromStorage() {
  return chrome.storage.local.get("currentSession").then(res => res.currentSession || null);
}

function getQueuedSessions() {
  return chrome.storage.local.get("unsentSessions").then(res => res.unsentSessions || []);
}

async function setQueuedSessions(sessions) {
  await chrome.storage.local.set({ unsentSessions: sessions });
  await checkStorageUsage(); // Check after each save
}

// --- Storage usage check ---
function checkStorageUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      const percentUsed = Math.round((bytesInUse / STORAGE_LIMIT) * 100);
      if (percentUsed >= lastNotifiedPercent + 10 && percentUsed < 100) {
        lastNotifiedPercent = Math.floor(percentUsed / 10) * 10;
        showStorageNotification(percentUsed);
      }
      resolve(percentUsed);
    });
  });
}

function showStorageNotification(percent) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "Storage Usage Alert",
    message: `You have used ${percent}% of your 5MB storage limit.`,
    priority: 2
  });
}

// --- Session handling ---
async function startSession(tabId, windowId, url) {
  if (!url || url.startsWith("chrome://")) return;
  const now = new Date().toISOString();
  const session = {
    tabId,
    windowId,
    url,
    domain: getDomainFromUrl(url),
    start_time: now
  };
  currentSession = session;
  log("startSession", session);
  await saveCurrentSessionToStorage(session);
}

async function endSession(endReason = "unknown") {
  if (!currentSession || !currentSession.start_time) {
    log("endSession called but no valid currentSession");
    return;
  }
  const endTime = new Date().toISOString();
  const payload = {
    domain: currentSession.domain || "",
    url: currentSession.url || "",
    start_time: currentSession.start_time,
    end_time: endTime,
    tabId: currentSession.tabId,
    windowId: currentSession.windowId,
    end_reason: endReason
  };
  log("Queuing ended session:", payload);
  await removeCurrentSessionFromStorage();
  const queue = await getQueuedSessions();
  queue.push({
    created_at: new Date().toISOString(),
    session: payload
  });
  await setQueuedSessions(queue);
  currentSession = null;
  syncQueuedSessions();
}

async function backendIsOnline() {
  try {
    const resp = await fetch(BACKEND_URL, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}

async function syncQueuedSessions() {
  const items = await getQueuedSessions();
  if (items.length === 0) {
    log("No queued items to sync");
    return;
  }
  if (!(await backendIsOnline())) {
    log("Backend offline, skipping sync");
    return;
  }
  const sessions = items.map(it => it.session);
  log(`Attempting to sync ${sessions.length} sessions to backend`);
  try {
    const resp = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions, client_id: "local-chrome-1" })
    });
    if (resp.ok) {
      await setQueuedSessions([]);
      log("Synced and cleared queued sessions");
    } else {
      const text = await resp.text().catch(() => "");
      log("Backend responded non-OK", resp.status, text);
    }
  } catch (e) {
    log("Sync failed", e);
  }
}

// --- Event listeners ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab || !tab.url || tab.url.startsWith("chrome://")) return;
  if (currentSession && currentSession.tabId !== activeInfo.tabId) {
    tabSwitchInProgress = true;
    await endSession("switch_tab");
  }
  await startSession(tab.id, tab.windowId, tab.url);
  tabSwitchInProgress = false;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  if (tab.url && !tab.url.startsWith("chrome://") && currentSession && currentSession.tabId === tabId) {
    const oldDomain = currentSession.domain;
    const newDomain = getDomainFromUrl(changeInfo.url);
    const reason = oldDomain !== newDomain ? "domain_change" : "url_change";
    await endSession(reason);
    await startSession(tabId, tab.windowId, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (currentSession && currentSession.tabId === tabId) {
    await endSession("tab_closed");
  }
});

chrome.runtime.onSuspend.addListener(async () => {
  if (currentSession) {
    await endSession("browser_close");
  }
});

async function initOnStart() {
  log("Service worker starting");
  const stored = await readCurrentSessionFromStorage();
  if (stored) {
    currentSession = stored;
    log("Restored in-progress session", currentSession);
  } else {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith("chrome://")) {
      await startSession(tabs[0].id, tabs[0].windowId, tabs[0].url);
    }
  }
  setInterval(syncQueuedSessions, SYNC_INTERVAL_SECONDS * 1000);
  syncQueuedSessions();
}

chrome.runtime.onInstalled.addListener(initOnStart);
chrome.runtime.onStartup.addListener(initOnStart);
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "sync-now") {
    syncQueuedSessions().then(() => sendResponse({ status: "sync_started" }));
    return true;
  }
  if (msg?.type === "get-queued-count") {
    getQueuedSessions().then(items => sendResponse({ count: items.length }));
    return true;
  }
});
