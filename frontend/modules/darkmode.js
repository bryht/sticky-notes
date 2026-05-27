
// Dark Mode for Sticky Notes
// Auto-detects system preference, with manual toggle in dashboard
// Stores preference in chrome.storage.local

import { NOTE_COLORS, DARK_NOTE_COLORS } from './config.js';

let isDarkMode = false;

export function initDarkMode() {
  // Check stored preference first, then system preference
  chrome.storage.local.get(['darkMode'], (result) => {
    if (result.darkMode !== undefined) {
      isDarkMode = result.darkMode;
    } else {
      // Auto-detect system preference
      isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyDarkMode();

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      chrome.storage.local.get(['darkMode'], (result) => {
        // Only auto-switch if user hasn't manually set preference
        if (result.darkMode === undefined) {
          isDarkMode = e.matches;
          applyDarkMode();
        }
      });
    });
  });
}

export function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  chrome.storage.local.set({ darkMode: isDarkMode });
  applyDarkMode();
}

export function getDarkMode() {
  return isDarkMode;
}

function applyDarkMode() {
  const container = document.getElementById('sticky-notes-container');
  if (!container) return;

  container.classList.toggle('dark-mode', isDarkMode);
  document.body.classList.toggle('sticky-notes-dark', isDarkMode);

  // Repaint every existing note so inline bg colors track the current theme.
  // Without this, notes created/loaded before the theme was applied keep their
  // original palette and look out of sync with newly created ones.
  const palette = isDarkMode ? DARK_NOTE_COLORS : NOTE_COLORS;
  container.querySelectorAll('.sticky-note').forEach((note) => {
    const colorKey = note.dataset.color || 'yellow';
    const colors = palette[colorKey] || palette.yellow;
    note.style.backgroundColor = colors.bg;
    const header = note.querySelector('.note-header');
    if (header) header.style.backgroundColor = colors.header;
  });
}