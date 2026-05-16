// Configuration and constants

export const NOTE_COLORS = {
  yellow: { bg: '#fff59d', header: '#ffeb3b' },
  pink:   { bg: '#f8bbd0', header: '#f48fb1' },
  blue:   { bg: '#b3e5fc', header: '#4fc3f7' },
  green:  { bg: '#c8e6c9', header: '#81c784' },
  purple: { bg: '#e1bee7', header: '#ce93d8' },
  white:  { bg: '#ffffff', header: '#e0e0e0' }
};

// Dark mode color palette — muted but light enough for comfortable reading
export const DARK_NOTE_COLORS = {
  yellow: { bg: '#5a5028', header: '#7a6e38' },
  pink:   { bg: '#5a2a3a', header: '#7a3a52' },
  blue:   { bg: '#2a4a66', header: '#3a6088' },
  green:  { bg: '#2a5232', header: '#3e7048' },
  purple: { bg: '#4a2e62', header: '#62408a' },
  white:  { bg: '#3a3a3a', header: '#4a4a4a' }
};

export const DEFAULT_NOTE = {
  width: '200px',
  minHeight: '150px',
  color: 'yellow'
};

export const SAVE_DEBOUNCE_MS = 300;
export const Z_INDEX_BASE = 9998;
export const PINNED_Z_INDEX = 2147483640; // Near max z-index for pinned notes
export const STORAGE_VERSION = 2;

// Per-site defaults — get/set preferred note size/color per hostname
export function getSiteDefaults(hostname) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['siteDefaults'], (result) => {
      const defaults = result.siteDefaults || {};
      resolve(defaults[hostname] || {});
    });
  });
}

export function setSiteDefaults(hostname, settings) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['siteDefaults'], (result) => {
      const defaults = result.siteDefaults || {};
      defaults[hostname] = { ...defaults[hostname], ...settings };
      chrome.storage.local.set({ siteDefaults: defaults }, resolve);
    });
  });
}