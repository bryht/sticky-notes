import { SAVE_DEBOUNCE_MS, STORAGE_VERSION } from './config.js';

// Debounce utility
let saveTimeout = null;
export function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNotes, SAVE_DEBOUNCE_MS);
}

/**
 * Force-save immediately (no debounce). Used before page unload to
 * prevent data loss on refresh/navigation.
 * Writes directly to chrome.storage.local (no message roundtrip) so
 * the browser doesn't kill the tab before the background script replies.
 */
export function saveNotesNow() {
  clearTimeout(saveTimeout);
  const notes = document.querySelectorAll('.sticky-note:not([style*="display: none"])');
  const currentUrl = window.location.href.split('#')[0];

  const currentPageNotes = [];
  notes.forEach(note => {
    const contentEl = note.querySelector('.note-content');
    const isMarkdown = note.dataset.markdown === 'true';
    const rawContent = isMarkdown
      ? (note.dataset.rawContent || contentEl?.innerText || '')
      : (contentEl ? contentEl.innerHTML : '');
    const noteData = {
      id: note.id,
      content: rawContent,
      position: { top: note.style.top, left: note.style.left },
      size: { width: note.style.width, height: note.style.height },
      color: note.dataset.color || 'yellow',
      minimized: note.dataset.minimized === 'true',
      pinned: note.dataset.pinned === 'true',
      markdown: isMarkdown,
      url: currentUrl,
      timestamp: Date.now()
    };
    currentPageNotes.push(noteData);
  });

  // Direct storage write — no async message roundtrip to background script.
  // This ensures notes survive page refresh even if the browser kills the tab
  // before beforeunload handlers finish their async work.
  chrome.storage.local.get(['allNotes', 'urlIndex'], (result) => {
    const allNotes = result.allNotes || {};
    const urlIndex = result.urlIndex || {};

    // Remove old notes for this URL
    const previousNoteIds = urlIndex[currentUrl] || [];
    previousNoteIds.forEach(noteId => delete allNotes[noteId]);

    // Add current notes
    urlIndex[currentUrl] = [];
    currentPageNotes.forEach(noteData => {
      allNotes[noteData.id] = noteData;
      urlIndex[currentUrl].push(noteData.id);
    });

    chrome.storage.local.set({ allNotes, urlIndex }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Save failed:', chrome.runtime.lastError.message);
      }
    });

    // Also notify background so it can update the badge (fire-and-forget)
    try {
      chrome.runtime.sendMessage({
        action: 'saveNotes',
        url: currentUrl,
        notes: currentPageNotes
      });
    } catch (err) {
      // Ignore — the direct storage write already succeeded
    }
  });
}

// Send message with promise wrapper and error handling
function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function saveNotes() {
  const notes = document.querySelectorAll('.sticky-note:not([style*="display: none"])');
  const currentUrl = window.location.href.split('#')[0];
  
  const currentPageNotes = [];
  notes.forEach(note => {
    const contentEl = note.querySelector('.note-content');
    // If markdown is rendered, save the raw text so we can re-render on load;
    // otherwise save the innerHTML (rich text content)
    const isMarkdown = note.dataset.markdown === 'true';
    const rawContent = isMarkdown
      ? (note.dataset.rawContent || contentEl?.innerText || '')
      : (contentEl ? contentEl.innerHTML : '');
    const noteData = {
      id: note.id,
      content: rawContent,
      position: {
        top: note.style.top,
        left: note.style.left
      },
      size: {
        width: note.style.width,
        height: note.style.height
      },
      color: note.dataset.color || 'yellow',
      minimized: note.dataset.minimized === 'true',
      pinned: note.dataset.pinned === 'true',
      markdown: isMarkdown,
      url: currentUrl,
      timestamp: Date.now()
    };
    currentPageNotes.push(noteData);
  });
  
  return sendMessage({
    action: 'saveNotes',
    url: currentUrl,
    notes: currentPageNotes
  }).catch(err => console.warn('Save failed:', err));
}

/**
 * Save a single note incrementally (avoids race condition from full-page save).
 * The background script merges this note into storage without wiping other notes.
 */
export function saveSingleNote(noteId, noteData) {
  return sendMessage({
    action: 'saveSingleNote',
    noteId: noteId,
    noteData: noteData
  }).catch(err => console.warn('Single note save failed:', err));
}

export function loadNotes() {
  const currentUrl = window.location.href.split('#')[0];
  
  sendMessage({
    action: 'getNotes',
    url: currentUrl
  }).then(response => {
    if (response && response.notes && response.notes.length > 0) {
      response.notes.forEach(noteData => {
        import('./ui.js').then(({ createNote }) => {
          createNote(
            noteData.content,
            noteData.position,
            noteData.id,
            {
              width: noteData.size?.width,
              minHeight: noteData.size?.height,
              color: noteData.color,
              minimized: noteData.minimized,
              pinned: noteData.pinned,
              markdown: noteData.markdown
            }
          );
        });
      });
    }
  }).catch(err => console.warn('Load failed:', err));
}

export function getAllNotes() {
  return sendMessage({ action: 'getAllNotes' })
    .then(r => r.notes || [])
    .catch(err => {
      console.warn('GetAllNotes failed:', err);
      return [];
    });
}

export function deleteNoteById(noteId, url) {
  return sendMessage({
    action: 'deleteNote',
    noteId: noteId,
    url: url
  }).catch(err => console.warn('Delete failed:', err));
}

// ===================
// Storage Migration
// ===================

export function migrateStorage() {
  chrome.storage.local.get(['storageVersion', 'allNotes', 'urlIndex'], (result) => {
    const currentVersion = result.storageVersion || 1;

    if (currentVersion < 2) {
      // Migration v1 → v2: Add timestamp and pinned fields to existing notes
      const allNotes = result.allNotes || {};
      const urlIndex = result.urlIndex || {};

      Object.keys(allNotes).forEach(noteId => {
        const note = allNotes[noteId];
        // Add missing fields with defaults
        if (!note.timestamp) note.timestamp = Date.now();
        if (note.pinned === undefined) note.pinned = false;
        if (note.markdown === undefined) note.markdown = false;
        if (!note.size) {
          note.size = { width: '200px', height: '150px' };
        }
      });

      chrome.storage.local.set({
        allNotes,
        urlIndex,
        storageVersion: STORAGE_VERSION
      }, () => {
        console.log(`Sticky Notes: Storage migrated from v${currentVersion} to v${STORAGE_VERSION}`);
      });
    }
  });
}