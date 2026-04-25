// Background script for Sticky Notes Extension v2.1.0

const STORAGE_VERSION = 2;

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install' || reason === 'update') {
    initializeStorage();
  }

  // Register context menu
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-sticky-note',
      title: 'Save selection to Sticky Note',
      contexts: ['selection']
    });
  });
});

// Handle context menu clicks
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

function initializeStorage() {
  chrome.storage.local.get(['allNotes', 'urlIndex', 'hasDonated', 'storageVersion'], (result) => {
    if (!result.allNotes) chrome.storage.local.set({ allNotes: {} });
    if (!result.urlIndex) chrome.storage.local.set({ urlIndex: {} });
    if (result.hasDonated === undefined) chrome.storage.local.set({ hasDonated: false });

    // Storage migration
    const currentVersion = result.storageVersion || 1;
    if (currentVersion < STORAGE_VERSION) {
      migrateStorage(currentVersion, result);
    }
  });
}

function migrateStorage(fromVersion, data) {
  const allNotes = data.allNotes || {};
  const urlIndex = data.urlIndex || {};

  if (fromVersion < 2) {
    // v1 → v2: Add missing fields with defaults
    Object.keys(allNotes).forEach(noteId => {
      const note = allNotes[noteId];
      if (!note.timestamp) note.timestamp = Date.now();
      if (note.pinned === undefined) note.pinned = false;
      if (note.markdown === undefined) note.markdown = false;
      if (!note.size) {
        note.size = { width: '200px', height: '150px' };
      }
    });
  }

  chrome.storage.local.set({
    allNotes,
    urlIndex,
    storageVersion: STORAGE_VERSION
  }, () => {
    console.log(`Sticky Notes: Storage migrated from v${fromVersion} to v${STORAGE_VERSION}`);
  });
}

// Update badge with note count
function updateBadge() {
  chrome.storage.local.get(['allNotes'], (result) => {
    const count = Object.keys(result.allNotes || {}).length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF9800' });
  });
}

// Initial badge update
updateBadge();

// Click extension icon to create note
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'createNote' }, () => {
    // Handle missing content script
    if (chrome.runtime.lastError) {
      console.log('Tab not ready for sticky notes');
    }
  });
});

// Message router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'saveNotes':
        saveNotes(request.url, request.notes).then(() => {
          updateBadge();
          sendResponse({ success: true });
        }).catch(err => sendResponse({ success: false, error: err.message }));
        return true;
        
      case 'getNotes':
        getNotes(request.url).then(notes => {
          sendResponse({ notes });
        }).catch(err => sendResponse({ notes: [], error: err.message }));
        return true;
        
      case 'getAllNotes':
        getAllNotes().then(notes => {
          sendResponse({ notes });
        }).catch(err => sendResponse({ notes: [], error: err.message }));
        return true;
        
      case 'deleteNote':
        deleteNote(request.noteId, request.url).then(() => {
          updateBadge();
          sendResponse({ success: true });
        }).catch(err => sendResponse({ success: false, error: err.message }));
        return true;
        
      case 'checkPremiumStatus':
        chrome.storage.local.get(['hasDonated'], (result) => {
          sendResponse({ isPremium: result.hasDonated === true });
        });
        return true;
        
      case 'setDonationStatus':
        chrome.storage.local.set({ hasDonated: request.hasDonated }, () => {
          sendResponse({ success: true });
        });
        return true;
        
      case 'importNotes':
        importNotes(request.data).then(() => {
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

// ===================
// Storage Operations
// ===================

function get(url, key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key ? [key] : null, (result) => {
      resolve(result);
    });
  });
}

function set(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function saveNotes(url, notes) {
  const result = await get(url, ['allNotes', 'urlIndex']);
  const allNotes = result.allNotes || {};
  const urlIndex = result.urlIndex || {};
  
  if (!urlIndex[url]) urlIndex[url] = [];
  
  // Remove old notes for this URL
  const previousNoteIds = urlIndex[url];
  previousNoteIds.forEach(noteId => delete allNotes[noteId]);
  
  // Reset and add new notes
  urlIndex[url] = [];
  notes.forEach(noteData => {
    allNotes[noteData.id] = noteData;
    urlIndex[url].push(noteData.id);
  });
  
  await set({ allNotes, urlIndex });
}

async function getNotes(url) {
  const result = await get(url, ['allNotes', 'urlIndex']);
  const allNotes = result.allNotes || {};
  const urlIndex = result.urlIndex || {};
  
  const notes = [];
  if (urlIndex[url]) {
    urlIndex[url].forEach(noteId => {
      if (allNotes[noteId]) notes.push(allNotes[noteId]);
    });
  }
  return notes;
}

async function getAllNotes() {
  const result = await get(null, ['allNotes']);
  return Object.values(result.allNotes || {});
}

async function deleteNote(noteId, url) {
  const result = await get(null, ['allNotes', 'urlIndex']);
  const allNotes = result.allNotes || {};
  const urlIndex = result.urlIndex || {};
  
  delete allNotes[noteId];
  
  if (urlIndex[url]) {
    urlIndex[url] = urlIndex[url].filter(id => id !== noteId);
  }
  
  await set({ allNotes, urlIndex });
}

async function importNotes(data) {
  await set({
    allNotes: {},
    urlIndex: {}
  });
  
  // Rebuild from imported notes
  const allNotes = {};
  const urlIndex = {};
  
  data.notes.forEach(note => {
    allNotes[note.id] = note;
    if (!urlIndex[note.url]) urlIndex[note.url] = [];
    urlIndex[note.url].push(note.id);
  });
  
  await set({ allNotes, urlIndex });
}