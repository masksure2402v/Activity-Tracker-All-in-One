const BACKEND_URL = "http://127.0.0.1:5173/api/chrome-activity";
const SYNC_INTERVAL_SECONDS = 10;
const DOMAIN_CHANGE_MIN_MS = 2000;

let currentSession = null;
const pendingTimers = new Map();

// --- Storage promisified helpers ---
function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, res => resolve(res)));
}
function storageSet(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, () => resolve()));
}
function storageRemove(key) {
  return new Promise(resolve => chrome.storage.local.remove(key, () => resolve()));
}

// --- Time helper (IST format) ---
function toISTIsoString(date = new Date()) {
  const istOffsetMs = 330 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  const pad = (n) => String(n).padStart(2, '0');
  const Y = istDate.getUTCFullYear();
  const M = pad(istDate.getUTCMonth() + 1);
  const D = pad(istDate.getUTCDate());
  const h = pad(istDate.getUTCHours());
  const m = pad(istDate.getUTCMinutes());
  const s = pad(istDate.getUTCSeconds());
  const ms = istDate.getUTCMilliseconds();
  const msStr = ms ? '.' + String(ms).padStart(3, '0') : '';
  return `${Y}-${M}-${D} ${h}:${m}:${s}${msStr}`;
}

function getDomainFromUrl(urlStr) {
  try { const u = new URL(urlStr); return u.hostname.replace(/^www\./, ''); } catch { return ''; }
}

// --- Storage accessors used by main logic ---
async function saveCurrentSessionToStorage(session) { await storageSet({ currentSession: session }); }
async function removeCurrentSessionFromStorage() { await storageRemove('currentSession'); }
async function readCurrentSessionFromStorage() { const res = await storageGet('currentSession'); return res.currentSession || null; }
async function getQueuedSessions() { const res = await storageGet('unsentSessions'); return res.unsentSessions || []; }
async function setQueuedSessions(sessions) { await storageSet({ unsentSessions: sessions }); }

// --- Session lifecycle ---
async function startSession(windowId, url) {
  if (!url || url.startsWith('chrome://')) return;
  const nowIso = toISTIsoString();
  const session = { windowId, url, domain: getDomainFromUrl(url), start_time: nowIso };
  currentSession = session;
  await saveCurrentSessionToStorage(session);
}

async function endSession(endReason = 'unknown') {
  await ensureCurrentSessionLoaded();
  if (!currentSession || !currentSession.start_time) return;
  const endIso = toISTIsoString();
  const payload = {
    domain: currentSession.domain || '',
    url: currentSession.url || '',
    start_time: currentSession.start_time,
    end_time: endIso,
    windowId: currentSession.windowId,
    end_reason: endReason
  };
  await removeCurrentSessionFromStorage();
  const queue = await getQueuedSessions();
  queue.push({ created_at: toISTIsoString(), session: payload });
  await setQueuedSessions(queue);
  currentSession = null;
  syncQueuedSessions();
}

// --- Backend helpers ---
async function backendIsOnline() {
  try {
    const resp = await fetch(BACKEND_URL, { method: 'GET' });
    return resp.ok;
  } catch { return false; }
}

async function syncQueuedSessions() {
  const items = await getQueuedSessions();
  if (items.length === 0) return;
  if (!(await backendIsOnline())) return;
  for (const it of items) {
    const session = it.session;
    // attach chrome_profile before sending
    const { chrome_profile } = await storageGet('chrome_profile');
    session.chrome_profile = chrome_profile || null;
    try {
      const resp = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      if (!resp.ok) return; // stop on first bad response
    } catch { return; }
  }
  await setQueuedSessions([]);
}

// --- Timers ---
function scheduleDomainChangeVerification(windowId, candidateUrl) {
  const candidateDomain = getDomainFromUrl(candidateUrl);
  // use per-window key so multiple profiles/tabs don't overwrite each other
  const key = `domain_${windowId}`;
  clearPendingTimer(key);
  const timerId = setTimeout(async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs && tabs[0];
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
      const stillDomain = getDomainFromUrl(tab.url);
      if (stillDomain === candidateDomain) {
        if (currentSession && currentSession.domain !== candidateDomain) {
          await endSession('domain_change');
          await startSession(windowId, tab.url);
        } else if (!currentSession) {
          await startSession(windowId, tab.url);
        } else {
          currentSession.url = tab.url;
          currentSession.domain = stillDomain;
          await saveCurrentSessionToStorage(currentSession);
        }
      }
    } catch {} finally { pendingTimers.delete(key); }
  }, DOMAIN_CHANGE_MIN_MS);
  pendingTimers.set(key, { timerId });
}

function scheduleActivationVerification(windowId, candidateUrl) {
  const key = `activate_${windowId}`;
  clearPendingTimer(key);
  const timerId = setTimeout(async () => {
    try {
      const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!activeTabs || activeTabs.length === 0) return;
      const tab = activeTabs[0];
      if (!tab.url || tab.url.startsWith('chrome://')) return;
      const stillDomain = getDomainFromUrl(tab.url);
      if (stillDomain === getDomainFromUrl(candidateUrl)) {
        if (currentSession) { await endSession('switch_tab'); }
        await startSession(windowId, tab.url);
      }
    } catch {} finally { pendingTimers.delete(key); }
  }, DOMAIN_CHANGE_MIN_MS);
  pendingTimers.set(key, { timerId });
}

function scheduleUrlChangeRotation(windowId, candidateUrl) {
  const key = `urlchange_${windowId}`;
  clearPendingTimer(key);
  const timerId = setTimeout(async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs && tabs[0];
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
      if (tab.url === candidateUrl) {
        await ensureCurrentSessionLoaded();
        if (currentSession) {
          await endSession('url_change_same_domain');
          await startSession(windowId, candidateUrl);
        } else {
          await startSession(windowId, candidateUrl);
        }
      }
    } catch {} finally { pendingTimers.delete(key); }
  }, DOMAIN_CHANGE_MIN_MS);
  pendingTimers.set(key, { timerId });
}

function clearPendingTimer(key) { const p = pendingTimers.get(key); if (p) { clearTimeout(p.timerId); pendingTimers.delete(key); } }

// --- Ensure session loaded ---
async function ensureCurrentSessionLoaded() {
  if (!currentSession) {
    try {
      const stored = await readCurrentSessionFromStorage();
      if (stored) currentSession = stored;
    } catch {}
  }
}

// --- Event listeners ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
    scheduleActivationVerification(tab.windowId, tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (!changeInfo.url) return;
    if (!tab.url || tab.url.startsWith('chrome://')) return;
    await ensureCurrentSessionLoaded();
    const oldDomain = currentSession ? currentSession.domain : null;
    const newDomain = getDomainFromUrl(changeInfo.url);
    if (oldDomain !== newDomain) scheduleDomainChangeVerification(tab.windowId, changeInfo.url);
    else scheduleUrlChangeRotation(tab.windowId, changeInfo.url);
  } catch {}
});

chrome.tabs.onRemoved.addListener(async () => { await ensureCurrentSessionLoaded(); if (currentSession) { await endSession('tab_closed'); } });

// --- Init on start/install ---
async function initOnStart() {
  const stored = await readCurrentSessionFromStorage();
  if (stored) currentSession = stored;
  else {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
      scheduleActivationVerification(tabs[0].windowId, tabs[0].url);
    }
  }
  setInterval(syncQueuedSessions, SYNC_INTERVAL_SECONDS * 1000);
  syncQueuedSessions();
}

chrome.runtime.onInstalled.addListener(async () => {
  // open setup popup if profile not set
  const res = await storageGet('chrome_profile');
  if (!res.chrome_profile) chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  initOnStart();
});
chrome.runtime.onStartup.addListener(initOnStart);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'sync-now') { syncQueuedSessions().then(() => sendResponse({ status: 'sync_started' })); return true; }
  if (msg?.type === 'get-queued-count') { getQueuedSessions().then(items => sendResponse({ count: items.length })); return true; }
});

// --- Sending single session helper used by other parts if needed ---
async function sendSessionToBackend(sessionData) {
  const res = await storageGet('chrome_profile');
  sessionData.chrome_profile = res.chrome_profile || null;
  try { await fetch(BACKEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionData) }); } catch {}
}
