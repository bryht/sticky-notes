// Sticky Notes Extension - v2.0.0
// Main entry point

import { createNotesContainer, createNote, setActiveContainer } from './modules/ui.js';
import { initDragCleanup } from './modules/drag.js';
import { loadNotes } from './modules/storage.js';

let notesContainer = null;

function init() {
  notesContainer = createNotesContainer();
  setActiveContainer(notesContainer);
  loadNotes();
  initDragCleanup();
  
  // Add listener for extension icon clicks
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === 'createNote') {
        createNote();
        sendResponse({success: true});
      }
      return true;
    }
  );
  
  // Inject external stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('styles.css');
  document.head.appendChild(link);
}

// Start the extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
