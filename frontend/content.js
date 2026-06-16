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

  showOnboardingIfNeeded();
}

function showOnboardingIfNeeded() {
  chrome.storage.local.get(['onboardingComplete'], (result) => {
    if (result.onboardingComplete) return;
    const existing = document.getElementById('sticky-notes-onboarding');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sticky-notes-onboarding';
    overlay.className = 'sticky-notes-onboarding';

    const panel = document.createElement('div');
    panel.className = 'sticky-notes-onboarding-panel';

    const title = document.createElement('h2');
    title.textContent = 'Welcome to Sticky Notes!';

    const steps = [
      { icon: '📌', title: 'Create notes', desc: 'Click the extension icon in your toolbar, or press Ctrl+Shift+N' },
      { icon: '✋', title: 'Move & resize', desc: 'Drag the header to move. Resize from corners and edges.' },
      { icon: '🖱️', title: 'More options', desc: 'Right-click any note for color, minimize, and more.' },
    ];

    const stepsContainer = document.createElement('div');
    steps.forEach(s => {
      const step = document.createElement('div');
      step.className = 'onboarding-step';
      step.innerHTML = `<div class="step-icon">${s.icon}</div><div class="step-text"><strong>${s.title}</strong><span>${s.desc}</span></div>`;
      stepsContainer.appendChild(step);
    });

    const dontShow = document.createElement('label');
    dontShow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:16px;font-size:13px;color:#666;cursor:pointer;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = 'onboarding-dont-show';
    const label = document.createElement('span');
    label.textContent = "Don't show again";
    dontShow.appendChild(checkbox);
    dontShow.appendChild(label);

    const gotIt = document.createElement('button');
    gotIt.className = 'modal-btn';
    gotIt.style.cssText = 'margin-top:16px;width:100%;padding:10px;background:var(--sn-primary, #1976d2);color:white;border:none;border-radius:var(--sn-border-radius, 8px);font-size:14px;font-weight:600;cursor:pointer;';
    gotIt.textContent = 'Got it!';
    gotIt.addEventListener('click', () => {
      if (checkbox.checked) {
        chrome.storage.local.set({ onboardingComplete: true });
      }
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (checkbox.checked) chrome.storage.local.set({ onboardingComplete: true });
        overlay.remove();
      }
    });

    panel.appendChild(title);
    panel.appendChild(stepsContainer);
    panel.appendChild(dontShow);
    panel.appendChild(gotIt);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => withErrorBoundary(init, 'Sticky Notes Init'));
} else {
  withErrorBoundary(init, 'Sticky Notes Init');
}
