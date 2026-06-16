chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install' || reason === 'update') {
    initializeStorage();
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-sticky-note',
      title: 'Save selection to Sticky Note',
      contexts: ['selection']
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-sticky-note' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'createNoteWithText',
      text: info.selectionText
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Tab not ready for sticky notes');
      }
    });
  }
});

const STORAGE_VERSION = 2;
const BADGE_COLOR = '#FF9800';
const DEFAULT_NOTE_SIZE = { width: '200px', height: '150px' };
const MAX_IMPORT_NOTES = 10000;

function initializeStorage() {
  chrome.storage.local.get(['allNotes', 'urlIndex', 'storageVersion'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('initializeStorage failed:', chrome.runtime.lastError);
      return;
    }
    if (!result.allNotes) chrome.storage.local.set({ allNotes: {} });
    if (!result.urlIndex) chrome.storage.local.set({ urlIndex: {} });

    const currentVersion = result.storageVersion || 1;
    if (currentVersion < STORAGE_VERSION) {
      migrateStorage(currentVersion, result, STORAGE_VERSION);
    }
  });
}

function migrateStorage(fromVersion, data, storageVersion) {
  const allNotes = data.allNotes || {};
  const urlIndex = data.urlIndex || {};

  if (fromVersion < 2) {
    Object.keys(allNotes).forEach(noteId => {
      const note = allNotes[noteId];
      if (!note.timestamp) note.timestamp = Date.now();
      if (!note.size) {
        note.size = { ...DEFAULT_NOTE_SIZE };
      }
    });
  }

  chrome.storage.local.set({
    allNotes,
    urlIndex,
    storageVersion: storageVersion
  }, () => {
    console.log(`Sticky Notes: Storage migrated from v${fromVersion} to v${storageVersion}`);
  });
}

function updateBadge() {
  chrome.storage.local.get(['allNotes'], (result) => {
    if (chrome.runtime.lastError) return;
    const count = Object.keys(result.allNotes || {}).length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  });
}

updateBadge();

chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadgeForTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  if (changeInfo.url) {
    updateBadgeForTab(tabId);
  }
});

function updateBadgeForTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    try {
      const url = tab.url.split('#')[0];
      chrome.storage.local.get(['urlIndex'], (result) => {
        if (chrome.runtime.lastError) return;
        const urlIndex = result.urlIndex || {};
        const count = (urlIndex[url] || []).length;
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : '', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: count > 0 ? BADGE_COLOR : '#999', tabId: tabId });
      });
    } catch(_e) { /* Tab may have been closed */ }
  });
}

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'createNote' }, (_response) => {
    if (chrome.runtime.lastError) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'createNote' }, () => {
          if (chrome.runtime.lastError) {
            console.log('Could not create note on this page');
          }
        });
      }).catch(() => {
        console.log('Cannot inject content script on this page (e.g. chrome:// URL)');
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'importNotes':
        importNotes(request.data, request.mode || 'replace').then(() => {
          updateBadge();
          sendResponse({ success: true });
        }).catch(err => sendResponse({ success: false, error: err.message }));
        return true;

      case 'updateBadge':
        updateBadge();
        sendResponse({ success: true });
        return false;

      default:
        sendResponse({ error: 'Unknown action: ' + request.action });
        return false;
    }
  } catch (err) {
    console.error('Background error:', err);
    sendResponse({ error: err.message });
    return false;
  }
});

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function importNotes(data, mode = 'replace') {
  if (!data || !Array.isArray(data.notes)) {
    throw new Error('Invalid import data: notes must be an array');
  }

  if (data.notes.length > MAX_IMPORT_NOTES) {
    throw new Error(`Too many notes to import (max ${MAX_IMPORT_NOTES})`);
  }

  if (mode === 'replace') {
    await setStorage({ allNotes: {}, urlIndex: {} });
  }

  const result = mode === 'merge' ? await getStorage(['allNotes', 'urlIndex']) : { allNotes: {}, urlIndex: {} };
  const allNotes = result.allNotes || {};
  const urlIndex = result.urlIndex || {};

  data.notes.forEach(note => {
    let noteId = note.id;
    if (mode === 'merge' && allNotes[noteId]) {
      noteId = noteId + '-imported-' + Date.now();
      note.id = noteId;
    }
    allNotes[noteId] = note;
    if (!urlIndex[note.url]) urlIndex[note.url] = [];
    if (!urlIndex[note.url].includes(noteId)) {
      urlIndex[note.url].push(noteId);
    }
  });

  await setStorage({ allNotes, urlIndex });
}