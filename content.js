// Sticky Notes Extension - v2.1.0
// Main entry point

import { createNotesContainer, createNote, setActiveContainer } from './modules/ui.js';
import { initDragCleanup } from './modules/drag.js';
import { loadNotes, migrateStorage } from './modules/storage.js';
import { initKeyboardShortcuts } from './modules/keyboard.js';
import { initRichTextToolbar } from './modules/richtext.js';
import { initDarkMode } from './modules/darkmode.js';
import { initMarkdownSupport } from './modules/markdown.js';
import { withErrorBoundary } from './modules/error.js';
import { getSiteDefaults } from './modules/config.js';

let notesContainer = null;

async function init() {
  // Run storage migrations first
  migrateStorage();

  notesContainer = createNotesContainer();
  setActiveContainer(notesContainer);

  // Load notes (applying per-site defaults for new notes)
  loadNotes();

  // Initialize features
  initDragCleanup();
  initKeyboardShortcuts();
  initRichTextToolbar();
  initDarkMode();
  initMarkdownSupport();
  
  // Add listener for extension icon clicks
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === 'createNote') {
        createNote();
        sendResponse({success: true});
      }
      // Handle context menu text selection
      if (request.action === 'createNoteWithText') {
        createNote(request.text || '');
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

// Start the extension with error boundary
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => withErrorBoundary(init, 'Sticky Notes Init'));
} else {
  withErrorBoundary(init, 'Sticky Notes Init');
}