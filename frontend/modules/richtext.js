// Rich Text Toolbar for Sticky Notes
// Provides a floating mini-toolbar (Bold, Italic, Bullet, Link) that appears
// only when the formatting button in the note header is clicked.
// The toolbar floats on top of the text — it never shifts note content.

let activeToolbar = null;

export function initRichTextToolbar() {
  const container = document.getElementById('sticky-notes-container');
  if (!container) return;

  // Add the formatting button to every note (existing and future)
  container.querySelectorAll('.sticky-note').forEach(attachFormatButton);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.classList && node.classList.contains('sticky-note')) {
          attachFormatButton(node);
        }
      }
    }
  });
  observer.observe(container, { childList: true });

  // Close toolbar when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (activeToolbar && !activeToolbar.contains(e.target) &&
        !e.target.classList.contains('rt-toggle-btn')) {
      hideToolbar();
    }
  });
}

/**
 * Inject a formatting button (A̲) into the note header's button row.
 * Clicking it toggles the floating toolbar popup.
 */
function attachFormatButton(note) {
  const buttons = note.querySelector('.note-buttons');
  if (!buttons || buttons.querySelector('.rt-toggle-btn')) return;

  const fmtBtn = document.createElement('span');
  fmtBtn.innerHTML = 'A̲';
  fmtBtn.title = 'Formatting';
  fmtBtn.className = 'note-btn rt-toggle-btn';
  fmtBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeToolbar && activeToolbar._linkedNote === note) {
      hideToolbar();
    } else {
      const content = note.querySelector('.note-content');
      if (content) showToolbar(note, content, fmtBtn);
    }
  });

  // Insert as the first button so it's easy to find
  buttons.insertBefore(fmtBtn, buttons.firstChild);
}

/**
 * Create and position the floating toolbar popup next to the format button.
 */
function showToolbar(note, noteContent, anchorBtn) {
  hideToolbar();

  const toolbar = document.createElement('div');
  toolbar.className = 'richtext-toolbar';
  toolbar._linkedNote = note;

  const buttons = [
    { label: '<strong>B</strong>', action: () => execFormat('bold'), title: 'Bold (Ctrl+B)' },
    { label: '<em>I</em>', action: () => execFormat('italic'), title: 'Italic (Ctrl+I)' },
    { label: '• List', action: () => applyBulletList(noteContent), title: 'Bullet List' },
    { label: '🔗', action: () => insertLink(), title: 'Insert Link' },
  ];

  buttons.forEach(({ label, action, title }) => {
    const btn = document.createElement('button');
    btn.className = 'rt-btn';
    btn.innerHTML = label;
    btn.title = title;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      action();
      noteContent.focus();
    });
    toolbar.appendChild(btn);
  });

  note.appendChild(toolbar);

  // Position the toolbar below the header
  const header = note.querySelector('.note-header');
  if (header) {
    const headerH = header.offsetHeight;
    toolbar.style.top = headerH + 'px';
  }

  activeToolbar = toolbar;
}

function hideToolbar() {
  if (activeToolbar) {
    activeToolbar.remove();
    activeToolbar = null;
  }
}

// ── Formatting helpers ─────────────────────────────────────────────────────

/**
 * Run a simple execCommand (bold / italic). The selection is saved before
 * the toolbar steals focus and restored before executing the command so
 * that execCommand operates on the correct range.
 */
let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  if (!savedRange) return;
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

function execFormat(command) {
  saveSelection();
  restoreSelection();
  document.execCommand(command, false, null);
}

function insertLink() {
  saveSelection();
  restoreSelection();
  const url = self.prompt('Enter URL:');
  if (url) {
    document.execCommand('createLink', false, url);
  }
}

/**
 * Toggle a bullet list on the current selection.
 * Uses execCommand with a manual DOM-manipulation fallback for browsers
 * where execCommand('insertUnorderedList') is unreliable or disabled.
 */
function applyBulletList(noteContent) {
  saveSelection();
  restoreSelection();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !noteContent.contains(sel.anchorNode)) {
    // No valid selection inside the note — create a default bullet
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.textContent = '​'; // zero-width space as placeholder
    ul.appendChild(li);
    noteContent.appendChild(ul);
    // Place caret inside the new li
    const range = document.createRange();
    range.selectNodeContents(li);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  // If the selection is already inside a list, unwrap it (toggle off)
  const anchorLi = sel.anchorNode.nodeType === Node.ELEMENT_NODE
    ? sel.anchorNode.closest?.('li') ?? sel.anchorNode.parentElement?.closest('li')
    : sel.anchorNode.parentElement?.closest('li');

  if (anchorLi && noteContent.contains(anchorLi)) {
    const parentList = anchorLi.parentElement;
    if (parentList && (parentList.tagName === 'UL' || parentList.tagName === 'OL')) {
      // Unwrap: replace each <li> with its text content + <br>
      const fragment = document.createDocumentFragment();
      Array.from(parentList.children).forEach((li) => {
        const textNode = document.createTextNode(li.textContent || '');
        fragment.appendChild(textNode);
        fragment.appendChild(document.createElement('br'));
      });
      parentList.replaceWith(fragment);
      noteContent.focus();
      return;
    }
  }

  // Try execCommand first (works in most Chromium versions)
  const result = document.execCommand('insertUnorderedList', false, null);

  // Verify it actually created a list
  const hasList = !!noteContent.querySelector('ul, ol');
  if (result && hasList) {
    noteContent.focus();
    return;
  }

  // ── Manual fallback ──────────────────────────────────────────────────────
  // Build a <ul> from the selected lines
  const range = sel.getRangeAt(0);
  const selectedText = range.toString();

  const lines = (selectedText || 'Item').split(/\n/).filter((l) => l.trim() !== '');
  const ul = document.createElement('ul');
  lines.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    ul.appendChild(li);
  });

  range.deleteContents();
  range.insertNode(ul);

  // Place caret after the inserted list
  const afterRange = document.createRange();
  afterRange.setStartAfter(ul);
  afterRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(afterRange);

  noteContent.focus();
}
