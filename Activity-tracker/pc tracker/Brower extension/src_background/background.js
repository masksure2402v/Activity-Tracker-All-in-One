// background.js

const BACKEND_URL = "http://localhost:5000/api/chrome-activity";
const SYNC_INTERVAL_SECONDS = 10;
const POLL_FOCUS_MS = 1000; // fallback poll interval
const STORAGE_LIMIT = 5 * 1024 * 1024; // 5 MB
const DOMAIN_CHANGE_MIN_MS = 2000; // 2 seconds

let lastNotifiedPercent = 0;
let currentSession = null;
const pendingTimers = new Map(); // tabId -> { timerId, type, ... }
let focusPollIntervalId = null;

function log(...args) { console.log('[chrome-tracker]', ...args); }

// --- IST helper ---
function toISTIsoString(date = new Date()) {
  const istOffsetMs = 330 * 60 * 1000; // 19800000
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

// --- Storage helpers ---
function saveCurrentSessionToStorage(session) { return chrome.storage.local.set({ currentSession: session }); }
function removeCurrentSessionFromStorage() { return chrome.storage.local.remove('currentSession'); }
function readCurrentSessionFromStorage() { return chrome.storage.local.get('currentSession').then(res => res.currentSession || null); }
function getQueuedSessions() { return chrome.storage.local.get('unsentSessions').then(res => res.unsentSessions || []); }
async function setQueuedSessions(sessions) { await chrome.storage.local.set({ unsentSessions: sessions }); await checkStorageUsage(); }

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
  chrome.notifications.create({ type: 'basic', iconUrl: 'icon128.png', title: 'Storage Usage Alert', message: `You have used ${percent}% of your 5MB storage limit.`, priority: 2 });
}

// --- Timer helpers ---
function clearPendingTimer(tabId) { const p = pendingTimers.get(tabId); if (p) { clearTimeout(p.timerId); pendingTimers.delete(tabId); } }
function clearAllPendingTimers() { for (const [tabId, p] of pendingTimers) clearTimeout(p.timerId); pendingTimers.clear(); }

async function ensureCurrentSessionLoaded() {
  if (!currentSession) {
    try {
      const stored = await readCurrentSessionFromStorage();
      if (stored) {
        currentSession = stored;
        log('Loaded currentSession from storage', { tabId: currentSession.tabId, domain: currentSession.domain });
      }
    } catch (e) { log('ensureCurrentSessionLoaded failed', e); }
  }
}

// --- Pause / Resume ---
async function pauseCurrentSession(reason = 'blur') {
  await ensureCurrentSessionLoaded();
  if (!currentSession) { return; }
  if (currentSession.paused) { return; }
  const nowMs = Date.now();
  currentSession.paused = true;
  currentSession.pause_start_ts = nowMs;
  if (!Array.isArray(currentSession.paused_segments)) currentSession.paused_segments = [];
  currentSession.paused_segments.push({ start: toISTIsoString(new Date(nowMs)), start_ts: nowMs });
  await saveCurrentSessionToStorage(currentSession);
}

async function resumeCurrentSession(reason = 'focus') {
  await ensureCurrentSessionLoaded();
  if (!currentSession) { return; }
  if (!currentSession.paused) { return; }
  const nowMs = Date.now();
  const pausedStart = currentSession.pause_start_ts || nowMs;
  const pausedMs = Math.max(0, nowMs - pausedStart);
  currentSession.accumulated_paused_ms = (currentSession.accumulated_paused_ms || 0) + pausedMs;
  const lastSeg = currentSession.paused_segments && currentSession.paused_segments[currentSession.paused_segments.length - 1];
  if (lastSeg && !lastSeg.end) { lastSeg.end = toISTIsoString(new Date(nowMs)); lastSeg.end_ts = nowMs; }
  currentSession.paused = false;
  delete currentSession.pause_start_ts;
  await saveCurrentSessionToStorage(currentSession);
}

// --- Start / End sessions ---
async function startSession(tabId, windowId, url) {
  if (!url || url.startsWith('chrome://')) return;
  clearPendingTimer(tabId);
  const nowMs = Date.now();
  const nowIso = toISTIsoString(new Date(nowMs));
  const session = {
    tabId,
    windowId,
    url,
    domain: getDomainFromUrl(url),
    start_time: nowIso,
    start_ts: nowMs,
    paused: false,
    accumulated_paused_ms: 0,
    paused_segments: []
  };
  currentSession = session;
  await saveCurrentSessionToStorage(session);
}

function finalizeActivePauseIfAny() {
  if (currentSession && currentSession.paused) {
    const nowMs = Date.now();
    const pausedStart = currentSession.pause_start_ts || nowMs;
    const pausedMs = Math.max(0, nowMs - pausedStart);
    currentSession.accumulated_paused_ms = (currentSession.accumulated_paused_ms || 0) + pausedMs;
    const lastSeg = currentSession.paused_segments && currentSession.paused_segments[currentSession.paused_segments.length - 1];
    if (lastSeg && !lastSeg.end) { lastSeg.end = toISTIsoString(new Date(nowMs)); lastSeg.end_ts = nowMs; }
    currentSession.paused = false;
    delete currentSession.pause_start_ts;
  }
}

async function endSession(endReason = 'unknown') {
  await ensureCurrentSessionLoaded();
  if (!currentSession || !currentSession.start_time) return;

  finalizeActivePauseIfAny();
  clearPendingTimer(currentSession.tabId);

  const endNowMs = Date.now();
  const endIso = toISTIsoString(new Date(endNowMs));

  const totalPausedMs = currentSession.accumulated_paused_ms || 0;
  const rawDurationMs = Math.max(0, endNowMs - (currentSession.start_ts || endNowMs));
  const activeMs = Math.max(0, rawDurationMs - totalPausedMs);

  const payload = {
    domain: currentSession.domain || '',
    url: currentSession.url || '',
    start_time: currentSession.start_time,
    end_time: endIso,
    start_ts: currentSession.start_ts,
    end_ts: endNowMs,
    tabId: currentSession.tabId,
    windowId: currentSession.windowId,
    end_reason: endReason,
    paused_ms: totalPausedMs,
    active_ms: activeMs,
    paused_segments: currentSession.paused_segments || []
  };

  await removeCurrentSessionFromStorage();
  const queue = await getQueuedSessions();
  queue.push({ created_at: toISTIsoString(new Date()), session: payload });
  await setQueuedSessions(queue);
  currentSession = null;
  syncQueuedSessions();
}

// --- Backend helpers ---
async function backendIsOnline() { try { const resp = await fetch(BACKEND_URL, { method: 'GET' }); return resp.ok; } catch { return false; } }
async function syncQueuedSessions() {
  const items = await getQueuedSessions();
  if (items.length === 0) return;
  if (!(await backendIsOnline())) return;
  const sessions = items.map(it => it.session);
  try {
    const resp = await fetch(BACKEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessions, client_id: 'local-chrome-1' }) });
    if (resp.ok) { await setQueuedSessions([]); } 
  } catch (e) {}
}

// --- Verify domain change / activation ---
function scheduleDomainChangeVerification(tabId, windowId, candidateUrl) {
  clearPendingTimer(tabId);
  const candidateDomain = getDomainFromUrl(candidateUrl);
  const timerId = setTimeout(async () => {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
      const stillDomain = getDomainFromUrl(tab.url);
      if (stillDomain === candidateDomain) {
        if (currentSession && currentSession.tabId === tabId && currentSession.domain !== candidateDomain) {
          await endSession('domain_change');
          await startSession(tabId, windowId, tab.url);
        } else if (!currentSession) {
          await startSession(tabId, windowId, tab.url);
        } else {
          if (currentSession.tabId === tabId) {
            currentSession.url = tab.url;
            currentSession.domain = stillDomain;
            await saveCurrentSessionToStorage(currentSession);
          }
        }
      }
    } catch (e) {} 
    finally { pendingTimers.delete(tabId); }
  }, DOMAIN_CHANGE_MIN_MS);
  pendingTimers.set(tabId, { timerId, type: 'domain_verify', candidateDomain, candidateUrl, windowId });
}

function scheduleActivationVerification(tabId, windowId, candidateUrl) {
  clearPendingTimer(tabId);
  const candidateDomain = getDomainFromUrl(candidateUrl);
  const timerId = setTimeout(async () => {
    try {
      const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!activeTabs || activeTabs.length === 0 || activeTabs[0].id !== tabId) return;
      const tab = activeTabs[0];
      if (!tab.url || tab.url.startsWith('chrome://')) return;
      const stillDomain = getDomainFromUrl(tab.url);
      if (stillDomain === candidateDomain) {
        if (currentSession && currentSession.tabId !== tabId) { await endSession('switch_tab'); }
        await startSession(tabId, windowId, tab.url);
      }
    } catch (e) {} 
    finally { pendingTimers.delete(tabId); }
  }, DOMAIN_CHANGE_MIN_MS);
  pendingTimers.set(tabId, { timerId, type: 'activate_verify', candidateDomain, candidateUrl, windowId });
}

// Rotate session on same-domain URL change after short verify
function scheduleUrlChangeRotation(tabId, windowId, candidateUrl) {
  clearPendingTimer(tabId);
  const timerId = setTimeout(async () => {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
      // Only rotate if we stayed on the exact same URL (avoids transient redirects)
      if (tab.url === candidateUrl) {
        await ensureCurrentSessionLoaded();
        if (currentSession && currentSession.tabId === tabId) {
          await endSession('url_change_same_domain');
          await startSession(tabId, windowId, candidateUrl);
        } else if (!currentSession) {
          await startSession(tabId, windowId, candidateUrl);
        }
      }
    } catch (e) {}
    finally { pendingTimers.delete(tabId); }
  }, DOMAIN_CHANGE_MIN_MS);
  pendingTimers.set(tabId, { timerId, type: 'url_change_rotate', candidateUrl, windowId });
}

// --- Event listeners ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
    scheduleActivationVerification(tab.id, tab.windowId, tab.url);
  } catch (e) {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (!changeInfo.url) return;
    if (!tab.url || tab.url.startsWith('chrome://')) return;
    await ensureCurrentSessionLoaded();
    if (currentSession && currentSession.tabId === tabId) {
      const oldDomain = currentSession.domain;
      const newDomain = getDomainFromUrl(changeInfo.url);
      if (oldDomain !== newDomain) {
        scheduleDomainChangeVerification(tabId, tab.windowId, changeInfo.url);
      } else {
        scheduleUrlChangeRotation(tabId, tab.windowId, changeInfo.url);
      }
    }
  } catch (e) {}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  clearPendingTimer(tabId);
  await ensureCurrentSessionLoaded();
  if (currentSession && currentSession.tabId === tabId) { await endSession('tab_closed'); }
});

// removed chrome.windows.onFocusChanged and pollChromeFocus to avoid logging app switches

chrome.runtime.onSuspend.addListener(async () => { clearAllPendingTimers(); await ensureCurrentSessionLoaded(); if (currentSession) { await endSession('browser_close'); } });

// Startup init
async function initOnStart() {
  const stored = await readCurrentSessionFromStorage();
  if (stored) { currentSession = stored; }
  else {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
      scheduleActivationVerification(tabs[0].id, tabs[0].windowId, tabs[0].url);
    }
  }
  setInterval(syncQueuedSessions, SYNC_INTERVAL_SECONDS * 1000);
  syncQueuedSessions();
}

chrome.runtime.onInstalled.addListener(initOnStart);
chrome.runtime.onStartup.addListener(initOnStart);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'sync-now') { syncQueuedSessions().then(() => sendResponse({ status: 'sync_started' })); return true; }
  if (msg?.type === 'get-queued-count') { getQueuedSessions().then(items => sendResponse({ count: items.length })); return true; }
});
