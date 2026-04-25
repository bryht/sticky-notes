// Dark Mode for Sticky Notes
// Auto-detects system preference, with manual toggle in dashboard
// Stores preference in chrome.storage.local

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

  if (isDarkMode) {
    container.classList.add('dark-mode');
  } else {
    container.classList.remove('dark-mode');
  }

  // Also apply to body for dashboard overlay
  if (isDarkMode) {
    document.body.classList.add('sticky-notes-dark');
  } else {
    document.body.classList.remove('sticky-notes-dark');
  }
}

// Dark mode color palette for notes
export const DARK_NOTE_COLORS = {
  yellow: { bg: '#3e3a1a', header: '#5c5420' },
  pink:   { bg: '#3e1a26', header: '#5c2030' },
  blue:   { bg: '#1a2e3e', header: '#204060' },
  green:  { bg: '#1a3e20', header: '#205c2e' },
  purple: { bg: '#2e1a3e', header: '#40205c' },
  white:  { bg: '#2a2a2a', header: '#3a3a3a' },
};