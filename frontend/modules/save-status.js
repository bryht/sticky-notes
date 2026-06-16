// Per-note "Saving… / Saved / Save failed" indicator shown in the note footer.
// Lets the user know a save is still in flight before they close the tab.
//
// Because saves are page-wide (all notes are written together), the indicator
// is rendered into whichever note the user last edited — set via
// setSaveStatusTarget() from the UI layer.

let targetEl = null;
let hideTimer = null;
let pendingCount = 0;

const STATE_CLASSES = [
  'note-save-status-saving',
  'note-save-status-saved',
  'note-save-status-error',
];

/** Point the indicator at the footer status span of the active note. */
export function setSaveStatusTarget(el) {
  targetEl = el;
}

function render(state, label) {
  const el = targetEl;
  if (!el) return;
  clearTimeout(hideTimer);
  el.classList.remove(...STATE_CLASSES);
  el.removeAttribute('title');
  el.textContent = label;
  if (state) el.classList.add(`note-save-status-${state}`);
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
  const el = targetEl;
  hideTimer = setTimeout(() => {
    if (el) {
      el.textContent = '';
      el.classList.remove(...STATE_CLASSES);
    }
  }, 1500);
}

export function markError(err) {
  pendingCount = Math.max(0, pendingCount - 1);
  render('error', 'Save failed');
  if (targetEl) {
    targetEl.title = err && err.message ? `Save failed: ${err.message}` : 'Save failed';
  }
}
