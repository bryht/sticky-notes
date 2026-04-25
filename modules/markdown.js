// Markdown Support for Sticky Notes
// Basic markdown parsing: **bold**, *italic*, - bullet, # heading, [link](url)
// Toggle per-note with 📝 button in header

const noteMarkdownState = new Map(); // noteId -> boolean

export function initMarkdownSupport() {
  // No global init needed; works per-note
}

export function toggleMarkdown(note) {
  const noteId = note.id;
  const currentState = noteMarkdownState.get(noteId) || false;
  const newState = !currentState;
  noteMarkdownState.set(noteId, newState);

  const contentEl = note.querySelector('.note-content');
  const mdBtn = note.querySelector('.markdown-btn');

  if (newState) {
    // Render markdown
    if (mdBtn) mdBtn.title = 'Disable Markdown';
    if (mdBtn) mdBtn.style.opacity = '1';

    // Store raw text, render markdown HTML
    if (!note.dataset.rawContent) {
      note.dataset.rawContent = contentEl.innerText;
    }
    contentEl.innerHTML = parseMarkdown(contentEl.innerText || note.dataset.rawContent);
    contentEl.classList.add('markdown-rendered');
    contentEl.classList.remove('markdown-editing');
  } else {
    // Show raw text
    if (mdBtn) mdBtn.title = 'Enable Markdown';
    if (mdBtn) mdBtn.style.opacity = '0.5';

    const rawText = note.dataset.rawContent || contentEl.innerText;
    contentEl.innerText = rawText;
    contentEl.classList.remove('markdown-rendered');
    contentEl.classList.add('markdown-editing');
    delete note.dataset.rawContent;
  }

  // Save the markdown preference
  import('./storage.js').then(({ debouncedSave }) => debouncedSave());
}

export function isMarkdownEnabled(noteId) {
  return noteMarkdownState.get(noteId) || false;
}

export function setMarkdownState(noteId, enabled) {
  noteMarkdownState.set(noteId, enabled);
}

function parseMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Headings: # H1, ## H2, ### H3
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Unordered lists: - item (consecutive lines)
  html = html.replace(/(?:^- .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      return '<li>' + line.replace(/^- /, '') + '</li>';
    }).join('');
    return '<ul>' + items + '</ul>';
  });

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}