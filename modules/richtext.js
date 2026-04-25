// Rich Text Toolbar for Sticky Notes
// Provides a floating mini-toolbar with Bold, Italic, Bullet, Link buttons

let activeToolbar = null;

export function initRichTextToolbar() {
  // Listen for focus on note content areas (uses event delegation)
  document.addEventListener('focusin', (e) => {
    if (e.target.classList && e.target.classList.contains('note-content')) {
      showToolbar(e.target);
    }
  });

  document.addEventListener('focusout', (e) => {
    // Small delay to allow toolbar button clicks to register
    setTimeout(() => {
      if (activeToolbar && !activeToolbar.contains(document.activeElement)) {
        const noteContent = activeToolbar._linkedContent;
        if (noteContent && document.activeElement !== noteContent) {
          hideToolbar();
        }
      }
    }, 150);
  });
}

function showToolbar(noteContent) {
  // Remove existing toolbar
  hideToolbar();

  const note = noteContent.closest('.sticky-note');
  if (!note) return;

  const toolbar = document.createElement('div');
  toolbar.className = 'richtext-toolbar';
  toolbar._linkedContent = noteContent;

  const buttons = [
    { label: '<strong>B</strong>', command: 'bold', title: 'Bold (Ctrl+B)' },
    { label: '<em>I</em>', command: 'italic', title: 'Italic (Ctrl+I)' },
    { label: '•━', command: 'insertUnorderedList', title: 'Bullet List' },
    { label: '🔗', command: 'createLink', title: 'Insert Link' },
  ];

  buttons.forEach(({ label, command, title }) => {
    const btn = document.createElement('button');
    btn.className = 'rt-btn';
    btn.innerHTML = label;
    btn.title = title;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent focus loss from contentEditable
      e.stopPropagation();

      if (command === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand(command, false, url);
        }
      } else {
        document.execCommand(command, false, null);
      }
      // Refocus the content area
      noteContent.focus();
    });
    toolbar.appendChild(btn);
  });

  // Insert toolbar inside the note, before content
  note.insertBefore(toolbar, noteContent);

  activeToolbar = toolbar;
}

function hideToolbar() {
  if (activeToolbar) {
    activeToolbar.remove();
    activeToolbar = null;
  }
}