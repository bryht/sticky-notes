// Small "Saving… / Saved / Save failed" indicator pill.
// Lets the user know a save is still in flight before they close the tab.

let statusEl = null;
let hideTimer = null;
let pendingCount = 0;

function ensureEl() {
  if (statusEl && statusEl.isConnected) return statusEl;
  statusEl = document.createElement('div');
  statusEl.id = 'sticky-notes-save-status';
  statusEl.className = 'sticky-notes-save-status sticky-notes-save-status-hidden';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(statusEl);
  return statusEl;
}

function render(state, label) {
  const el = ensureEl();
  clearTimeout(hideTimer);
  el.classList.remove(
    'sticky-notes-save-status-saving',
    'sticky-notes-save-status-saved',
    'sticky-notes-save-status-error',
    'sticky-notes-save-status-hidden'
  );
  el.textContent = label;
  el.classList.add(`sticky-notes-save-status-${state}`);
}

export function markPending() {
  pendingCount++;
  render('saving', 'Saving…');
}

export function markSaving() {
  render('saving', 'Saving…');
}

export function markSaved() {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount > 0) return; // another save is queued; stay in "saving"
  render('saved', 'Saved');
  hideTimer = setTimeout(() => {
    if (statusEl) statusEl.classList.add('sticky-notes-save-status-hidden');
  }, 1500);
}

export function markError(err) {
  pendingCount = Math.max(0, pendingCount - 1);
  const msg = err && err.message ? `Save failed: ${err.message}` : 'Save failed';
  render('error', msg);
}
