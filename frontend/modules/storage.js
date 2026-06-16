import { SAVE_DEBOUNCE_MS } from './config.js';
import { getApiKey } from './api.js';
import { saveNotesToBackend, loadNotesFromBackend } from './storage-backend.js';
import { markPending, markSaving, markSaved, markError } from './save-status.js';

let notesLoaded = false;

let saveTimeout = null;
let savePending = false;
let saveInProgress = false;

export function debouncedSave() {
  if (!notesLoaded) return;
  if (!savePending) {
    savePending = true;
    markPending();
  }
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    savePending = false;
    saveNotes();
  }, SAVE_DEBOUNCE_MS);
}

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
  pendingNotes.forEach(collectNote);

  return { currentUrl, currentPageNotes };
}

function writeNotesToStorage(currentUrl, currentPageNotes) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['allNotes', 'urlIndex'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const allNotes = result.allNotes || {};
      const urlIndex = result.urlIndex || {};

      const previousNoteIds = urlIndex[currentUrl] || [];
      previousNoteIds.forEach(noteId => delete allNotes[noteId]);

      urlIndex[currentUrl] = [];
      currentPageNotes.forEach(noteData => {
        allNotes[noteData.id] = noteData;
        urlIndex[currentUrl].push(noteData.id);
      });

      const estimatedSize = JSON.stringify(allNotes).length;
      if (estimatedSize > 9 * 1024 * 1024) {
        console.warn('Storage approaching quota limit:', Math.round(estimatedSize / 1024) + 'KB');
      }

      chrome.storage.local.set({ allNotes, urlIndex }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          getApiKey().then(apiKey => {
            if (apiKey && !saveInProgress) {
              saveInProgress = true;
              saveNotesToBackend(currentUrl, currentPageNotes)
                .catch(err => {
                  console.warn('Backend sync failed:', err.message);
                })
                .finally(() => {
                  saveInProgress = false;
                });
            }
          });
          resolve();
        }
      });
    });
  });
}

function notifyBackgroundForBadge(action, data = {}) {
  try {
    chrome.runtime.sendMessage({ action, ...data });
  } catch (_err) {
    // Extension context may be invalidated
  }
}

export function saveNotesNow() {
  if (!notesLoaded) return;

  clearTimeout(saveTimeout);
  const { currentUrl, currentPageNotes } = collectNotesFromDOM();

  markSaving();
  writeNotesToStorage(currentUrl, currentPageNotes)
    .then(markSaved)
    .catch(err => {
      markError(err);
      console.warn('Save failed:', err.message);
    });

  notifyBackgroundForBadge('updateBadge');
}

export function saveNotes() {
  if (!notesLoaded) return Promise.resolve();

  const { currentUrl, currentPageNotes } = collectNotesFromDOM();

  markSaving();
  return writeNotesToStorage(currentUrl, currentPageNotes)
    .then(() => {
      markSaved();
      notifyBackgroundForBadge('updateBadge');
    })
    .catch(err => {
      markError(err);
      console.warn('Save failed:', err);
    });
}

export function loadNotes() {
  const currentUrl = window.location.href.split('#')[0];

  return getApiKey()
    .then(apiKey => {
      if (apiKey) {
        return loadNotesFromBackend(currentUrl)
          .then(notes => renderLoadedNotes(notes))
          .catch(err => {
            console.warn('Failed to load from backend, falling back to local storage:', err.message);
            return loadFromLocalStorage(currentUrl);
          });
      }
      return loadFromLocalStorage(currentUrl);
    })
    .catch(err => {
      console.warn('Load failed:', err);
    })
    .finally(() => {
      notesLoaded = true;
    });
}

function renderLoadedNotes(notes) {
  if (!notes || notes.length === 0) return Promise.resolve();

  return import('./ui.js').then(({ createNote }) => {
    notes.forEach(noteData => {
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
    });
  });
}

function loadFromLocalStorage(currentUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['allNotes', 'urlIndex'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Load failed:', chrome.runtime.lastError.message);
        resolve();
        return;
      }
      const allNotes = result.allNotes || {};
      const urlIndex = result.urlIndex || {};

      const noteIds = urlIndex[currentUrl] || [];
      const notes = [];
      noteIds.forEach(noteId => {
        if (allNotes[noteId]) notes.push(allNotes[noteId]);
      });

      renderLoadedNotes(notes).then(resolve, resolve);
    });
  });
}

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
