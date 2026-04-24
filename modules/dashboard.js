import { getAllNotes, deleteNoteById } from './storage.js';
import { createNote, deleteNoteElement } from './ui.js';
import { NOTE_COLORS } from './config.js';

export function showAllNotesDashboard() {
  const existing = document.getElementById('notes-dashboard');
  if (existing) existing.remove();
  
  const dashboard = document.createElement('div');
  dashboard.id = 'notes-dashboard';
  
  const content = document.createElement('div');
  content.className = 'dashboard-content';
  
  const header = document.createElement('div');
  header.className = 'dashboard-header';
  
  const title = document.createElement('h2');
  title.textContent = 'All Notes';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.className = 'dashboard-close';
  closeBtn.addEventListener('click', () => dashboard.remove());
  
  header.append(title, closeBtn);
  content.appendChild(header);
  
  const list = document.createElement('div');
  list.className = 'dashboard-list';
  list.innerHTML = '<p class="dashboard-loading">Loading notes...</p>';
  content.appendChild(list);
  
  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'dashboard-toolbar';
  toolbar.innerHTML = `
    <button id="dash-export" class="dash-btn">📤 Export</button>
    <button id="dash-import" class="dash-btn">📥 Import</button>
  `;
  toolbar.querySelector('#dash-export').addEventListener('click', () => import('./features.js').then(m => m.exportNotes()));
  toolbar.querySelector('#dash-import').addEventListener('click', () => import('./features.js').then(m => m.importNotes()));
  content.appendChild(toolbar);
  
  dashboard.appendChild(content);
  document.body.appendChild(dashboard);
  
  // Close on backdrop click
  dashboard.addEventListener('click', (e) => {
    if (e.target === dashboard) dashboard.remove();
  });
  
  // Load data
  getAllNotes().then(notes => {
    list.innerHTML = '';
    
    if (notes.length === 0) {
      list.innerHTML = '<p class="dashboard-empty">No notes found.</p>';
      return;
    }
    
    // Sort by timestamp desc
    notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    const table = document.createElement('table');
    table.className = 'dashboard-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Content</th>
          <th>Page</th>
          <th>Color</th>
          <th>Actions</th>
        </tr>
      </thead>
    `;
    
    const tbody = document.createElement('tbody');
    notes.forEach(note => {
      const tr = document.createElement('tr');
      
      // Content preview
      const temp = document.createElement('div');
      temp.innerHTML = note.content;
      const text = (temp.textContent || '').substring(0, 80) + '...';
      
      // Hostname
      let hostname = 'unknown';
      try {
        hostname = new URL(note.url).hostname;
      } catch(e) {}
      
      // Color swatch
      const color = NOTE_COLORS[note.color]?.bg || '#fff59d';
      
      tr.innerHTML = `
        <td class="dash-content">${escapeHtml(text)}</td>
        <td><a href="${escapeHtml(note.url)}" target="_blank">${escapeHtml(hostname)}</a></td>
        <td><span class="color-swatch" style="background:${color}"></span></td>
        <td><button class="dash-delete-btn" data-id="${note.id}" data-url="${note.url}">Delete</button></td>
      `;
      
      const delBtn = tr.querySelector('.dash-delete-btn');
      delBtn.addEventListener('click', () => {
        deleteNoteById(note.id, note.url).then(() => {
          const el = document.getElementById(note.id);
          if (el) el.remove();
          tr.remove();
        });
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    list.appendChild(table);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
