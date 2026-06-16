let activeToolbar = null;

export function initRichTextToolbar() {
  const container = document.getElementById('sticky-notes-container');
  if (!container) return;

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

  document.addEventListener('mousedown', (e) => {
    if (activeToolbar && !activeToolbar.contains(e.target) &&
        !e.target.classList.contains('rt-toggle-btn')) {
      hideToolbar();
    }
  });
}

function attachFormatButton(note) {
  const buttons = note.querySelector('.note-buttons');
  if (!buttons || buttons.querySelector('.rt-toggle-btn')) return;

  const fmtBtn = document.createElement('span');
  fmtBtn.innerHTML = 'B';
  fmtBtn.title = 'Bold formatting';
  fmtBtn.className = 'note-btn rt-toggle-btn';
  fmtBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeToolbar && activeToolbar._linkedNote === note) {
      hideToolbar();
    } else {
      const content = note.querySelector('.note-content');
      if (content) showToolbar(note, content);
    }
  });

  buttons.insertBefore(fmtBtn, buttons.firstChild);
}

function showToolbar(note, noteContent) {
  hideToolbar();

  const toolbar = document.createElement('div');
  toolbar.className = 'richtext-toolbar';
  toolbar._linkedNote = note;

  const buttons = [
    { label: '<strong>B</strong>', action: () => execFormat('bold'), title: 'Bold (Ctrl+B)' },
    { label: '<em>I</em>', action: () => execFormat('italic'), title: 'Italic (Ctrl+I)' },
    { label: '• List', action: () => applyBulletList(noteContent), title: 'Bullet List' },
    { label: '🔗', action: () => insertLink(noteContent), title: 'Insert Link' },
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

function insertLink(noteContent) {
  saveSelection();

  const note = noteContent.closest('.sticky-note');
  if (!note) return;

  const existing = note.querySelector('.sticky-notes-link-input');
  if (existing) existing.remove();

  const footer = note.querySelector('.note-footer');
  if (!footer) return;

  const bar = document.createElement('div');
  bar.className = 'sticky-notes-link-input';

  const input = document.createElement('input');
  input.type = 'url';
  input.placeholder = 'Paste or type a URL...';
  input.setAttribute('aria-label', 'Enter URL');

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (input.value.trim()) {
      restoreSelection();
      document.execCommand('createLink', false, input.value.trim());
    }
    bar.remove();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'link-cancel';
  cancelBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    bar.remove();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.value.trim()) {
        restoreSelection();
        document.execCommand('createLink', false, input.value.trim());
      }
      bar.remove();
    } else if (e.key === 'Escape') {
      bar.remove();
    }
  });

  bar.appendChild(input);
  bar.appendChild(applyBtn);
  bar.appendChild(cancelBtn);
  footer.appendChild(bar);
  input.focus();
}

function applyBulletList(noteContent) {
  saveSelection();
  restoreSelection();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !noteContent.contains(sel.anchorNode)) {
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.textContent = '​';
    ul.appendChild(li);
    noteContent.appendChild(ul);
    const range = document.createRange();
    range.selectNodeContents(li);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  const anchorLi = sel.anchorNode.nodeType === Node.ELEMENT_NODE
    ? sel.anchorNode.closest?.('li') ?? sel.anchorNode.parentElement?.closest('li')
    : sel.anchorNode.parentElement?.closest('li');

  if (anchorLi && noteContent.contains(anchorLi)) {
    const parentList = anchorLi.parentElement;
    if (parentList && (parentList.tagName === 'UL' || parentList.tagName === 'OL')) {
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

  const result = document.execCommand('insertUnorderedList', false, null);

  const hasList = !!noteContent.querySelector('ul, ol');
  if (result && hasList) {
    noteContent.focus();
    return;
  }

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

  const afterRange = document.createRange();
  afterRange.setStartAfter(ul);
  afterRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(afterRange);

  noteContent.focus();
}