import { SAVE_DEBOUNCE_MS } from './config.js';

// Debounce utility
let saveTimeout = null;
export function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNotes, SAVE_DEBOUNCE_MS);
}

/**
 * Collect all visible notes from the DOM and return as serializable data.
 */
function collectNotesFromDOM() {
  const notes = document.querySelectorAll('.sticky-note:not([data-pending-delete])');
  const pendingNotes = document.querySelectorAll('.sticky-note[data-pending-delete]');
  const currentUrl = window.location.href.split('#')[0];
  const currentPageNotes = [];

  const collectNote = (note) => {
    const contentEl = note.querySelector('.note-content');
    currentPageNotes.push({
      id: note.id,
      content: contentEl ? contentEl.innerHTML : '',
      position: { top: note.style.top, left: note.style.left },
      size: { width: note.style.width, height: note.style.height },
      color: note.dataset.color || 'yellow',
      minimized: note.dataset.minimized === 'true',
      url: currentUrl,
      timestamp: Date.now()
    });
  };

  notes.forEach(collectNote);
  // Include pending-delete notes so they survive in storage during the undo window
  pendingNotes.forEach(collectNote);

  return { currentUrl, currentPageNotes };
}

/**
 * Write current page notes directly to chrome.storage.local.
 * Used by saveNotes(), saveNotesNow() — no background script roundtrip.
 */
function writeNotesToStorage(currentUrl, currentPageNotes) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['allNotes', 'urlIndex'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
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
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Notify background script for badge updates (fire-and-forget).
 */
function notifyBackgroundForBadge(action, data = {}) {
  try {
    chrome.runtime.sendMessage({ action, ...data });
  } catch (_err) {
    // Ignore — the direct storage write already succeeded
  }
}

/**
 * Force-save immediately (no debounce). Used before page unload to
 * prevent data loss on refresh/navigation.
 * Writes directly to chrome.storage.local (no message roundtrip) so
 * the browser doesn't kill the tab before the background script replies.
 */
export function saveNotesNow() {
  clearTimeout(saveTimeout);
  const { currentUrl, currentPageNotes } = collectNotesFromDOM();

  // Direct storage write — no async message roundtrip to background script.
  writeNotesToStorage(currentUrl, currentPageNotes).catch(err => {
    console.warn('Save failed:', err.message);
  });

  // Also notify background so it can update the badge (fire-and-forget)
  notifyBackgroundForBadge('updateBadge');
}

/**
 * Save all current page notes directly to chrome.storage.local.
 * Sends a fire-and-forget message to background for badge updates.
 */
export function saveNotes() {
  const { currentUrl, currentPageNotes } = collectNotesFromDOM();

  return writeNotesToStorage(currentUrl, currentPageNotes)
    .then(() => {
      notifyBackgroundForBadge('updateBadge');
    })
    .catch(err => console.warn('Save failed:', err));
}

/**
 * Load notes for the current URL directly from chrome.storage.local.
 * No background script dependency — works even if the service worker is dormant.
 */
export function loadNotes() {
  const currentUrl = window.location.href.split('#')[0];

  chrome.storage.local.get(['allNotes', 'urlIndex'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('Load failed:', chrome.runtime.lastError.message);
      return;
    }
    const allNotes = result.allNotes || {};
    const urlIndex = result.urlIndex || {};

    const noteIds = urlIndex[currentUrl] || [];
    const notes = [];
    noteIds.forEach(noteId => {
      if (allNotes[noteId]) notes.push(allNotes[noteId]);
    });

    if (notes.length > 0) {
      notes.forEach(noteData => {
        import('./ui.js').then(({ createNote }) => {
          createNote(
            noteData.content,
            noteData.position,
            noteData.id,
            {
              width: noteData.size?.width,
              minHeight: noteData.size?.height,
              color: noteData.color,
              minimized: noteData.minimized
            }
          );
        }).catch(err => console.warn('Failed to create note:', err));
      });
    }
  });
}

/**
 * Get all notes directly from chrome.storage.local.
 */
export function getAllNotes() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['allNotes'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('GetAllNotes failed:', chrome.runtime.lastError.message);
        resolve([]);
        return;
      }
      resolve(Object.values(result.allNotes || {}));
    });
  });
}

/**
 * Delete a single note directly from chrome.storage.local.
 */
export function deleteNoteById(noteId, url) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['allNotes', 'urlIndex'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const allNotes = result.allNotes || {};
      const urlIndex = result.urlIndex || {};

      delete allNotes[noteId];

      if (urlIndex[url]) {
        urlIndex[url] = urlIndex[url].filter(id => id !== noteId);
      }

      chrome.storage.local.set({ allNotes, urlIndex }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          notifyBackgroundForBadge('updateBadge');
          resolve();
        }
      });
    });
  }).catch(err => console.warn('Delete failed:', err));
}