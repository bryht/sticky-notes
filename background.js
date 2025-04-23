// Background script for Sticky Notes Extension

// Storage structure:
// - allNotes: Object with noteId as key and note data as value
// - urlIndex: Object with URL as key and array of noteIds as value

// Initialize storage if needed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['allNotes', 'urlIndex'], function(result) {
    if (!result.allNotes) {
      chrome.storage.local.set({ allNotes: {} });
    }
    if (!result.urlIndex) {
      chrome.storage.local.set({ urlIndex: {} });
    }
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, {action: 'createNote'});
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveNotes') {
    saveNotes(request.url, request.notes, sendResponse);
    return true; // Indicates async response
  } else if (request.action === 'getNotes') {
    getNotes(request.url, sendResponse);
    return true; // Indicates async response
  } else if (request.action === 'getAllNotes') {
    getAllNotes(sendResponse);
    return true; // Indicates async response
  } else if (request.action === 'deleteNote') {
    deleteNote(request.noteId, request.url, sendResponse);
    return true; // Indicates async response
  }
});

// Save notes for a specific URL
function saveNotes(url, notes, callback) {
  chrome.storage.local.get(['allNotes', 'urlIndex'], function(result) {
    const allNotes = result.allNotes || {};
    const urlIndex = result.urlIndex || {};
    
    // Initialize URL index for this page if it doesn't exist
    if (!urlIndex[url]) {
      urlIndex[url] = [];
    }
    
    // Clear previous notes for this URL
    const previousNoteIds = urlIndex[url];
    previousNoteIds.forEach(noteId => {
      if (allNotes[noteId]) {
        delete allNotes[noteId];
      }
    });
    
    // Reset URL index for this page
    urlIndex[url] = [];
    
    // Process current notes
    notes.forEach(noteData => {
      allNotes[noteData.id] = noteData;
      urlIndex[url].push(noteData.id);
    });
    
    // Save to storage
    chrome.storage.local.set({ allNotes, urlIndex }, function() {
      if (callback) callback({ success: true });
    });
  });
}

// Get notes for a specific URL
function getNotes(url, callback) {
  chrome.storage.local.get(['allNotes', 'urlIndex'], function(result) {
    const allNotes = result.allNotes || {};
    const urlIndex = result.urlIndex || {};
    
    const notes = [];
    if (urlIndex[url]) {
      urlIndex[url].forEach(noteId => {
        if (allNotes[noteId]) {
          notes.push(allNotes[noteId]);
        }
      });
    }
    
    callback({ notes });
  });
}

// Get all notes from all URLs
function getAllNotes(callback) {
  chrome.storage.local.get(['allNotes'], function(result) {
    const allNotes = result.allNotes || {};
    const notes = Object.values(allNotes);
    callback({ notes });
  });
}

// Delete a specific note
function deleteNote(noteId, url, callback) {
  chrome.storage.local.get(['allNotes', 'urlIndex'], function(result) {
    const allNotes = result.allNotes || {};
    const urlIndex = result.urlIndex || {};
    
    // Delete note from allNotes
    if (allNotes[noteId]) {
      delete allNotes[noteId];
    }
    
    // Update URL index
    if (urlIndex[url]) {
      urlIndex[url] = urlIndex[url].filter(id => id !== noteId);
    }
    
    // Save updated data
    chrome.storage.local.set({ allNotes, urlIndex }, function() {
      if (callback) callback({ success: true });
    });
  });
}
