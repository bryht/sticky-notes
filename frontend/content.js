import { createNotesContainer, createNote, setActiveContainer } from './modules/ui.js';
import { initDragCleanup } from './modules/drag.js';
import { loadNotes, saveNotesNow } from './modules/storage.js';
import { initKeyboardShortcuts } from './modules/keyboard.js';
import { initContextMenu } from './modules/contextmenu.js';
import { initRichTextToolbar } from './modules/richtext.js';
import { initDarkMode } from './modules/darkmode.js';
import { withErrorBoundary } from './modules/error.js';

let notesContainer = null;
let savingBeforeUnload = false;

async function init() {
  notesContainer = createNotesContainer();
  setActiveContainer(notesContainer);

  initDarkMode();

  await loadNotes();

  initDragCleanup();
  initKeyboardShortcuts();
  initContextMenu();
  initRichTextToolbar();

  window.addEventListener('beforeunload', () => {
    if (!savingBeforeUnload) {
      savingBeforeUnload = true;
      saveNotesNow();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !savingBeforeUnload) {
      savingBeforeUnload = true;
      saveNotesNow();
      setTimeout(() => { savingBeforeUnload = false; }, 500);
    }
  });

  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === 'createNote') {
        createNote();
        sendResponse({success: true});
      }
      if (request.action === 'createNoteWithText') {
        createNote(request.text || '');
        sendResponse({success: true});
      }
      return true;
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => withErrorBoundary(init, 'Sticky Notes Init'));
} else {
  withErrorBoundary(init, 'Sticky Notes Init');
}
