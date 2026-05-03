import { getAllNotes, deleteNoteById } from './storage.js';
import { createNote, deleteNoteElement } from './ui.js';
import { NOTE_COLORS } from './config.js';
import { toggleDarkMode, getDarkMode } from './darkmode.js';

let currentSearchFilter = '';
let selectedRowIndex = -1;
let tableRows = [];
const NOTES_PER_PAGE = 25;
let currentPage = 1;

export function showAllNotesDashboard() {
  currentPage = 1;
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

  const headerButtons = document.createElement('div');
  headerButtons.className = 'dashboard-header-buttons';

  // Dark mode toggle
  const darkBtn = document.createElement('button');
  darkBtn.className = 'dash-btn dark-toggle-btn';
  darkBtn.innerHTML = getDarkMode() ? '☀️' : '🌙';
  darkBtn.title = getDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  darkBtn.addEventListener('click', () => {
    toggleDarkMode();
    darkBtn.innerHTML = getDarkMode() ? '☀️' : '🌙';
    darkBtn.title = getDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    // Also refresh dashboard dark mode styles
    const dashContent = dashboard.querySelector('.dashboard-content');
    if (dashContent) {
      dashContent.classList.toggle('dashboard-dark', getDarkMode());
    }
  });
  headerButtons.appendChild(darkBtn);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.className = 'dashboard-close';
  closeBtn.addEventListener('click', () => dashboard.remove());
  headerButtons.appendChild(closeBtn);
  
  header.append(title, headerButtons);
  content.appendChild(header);

  // Search bar
  const searchBar = document.createElement('div');
  searchBar.className = 'dashboard-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'dashboard-search-input';
  searchInput.placeholder = 'Search notes...';
  searchInput.addEventListener('input', (e) => {
    currentSearchFilter = e.target.value.toLowerCase();
    selectedRowIndex = -1;
    filterNotes();
  });
  const clearBtn = document.createElement('button');
  clearBtn.className = 'dashboard-search-clear';
  clearBtn.innerHTML = '✕';
  clearBtn.title = 'Clear search';
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchFilter = '';
    filterNotes();
  });
  searchBar.appendChild(searchInput);
  searchBar.appendChild(clearBtn);
  content.appendChild(searchBar);
  
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

  // Keyboard navigation
  dashboard.addEventListener('keydown', handleDashboardKeyboard);
  dashboard.tabIndex = -1;
  dashboard.focus();
  
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
          <th>Pinned</th>
          <th>Actions</th>
        </tr>
      </thead>
    `;
    
    const tbody = document.createElement('tbody');
    tableRows = [];

    notes.forEach(note => {
      const tr = document.createElement('tr');
      
      // Content preview
      const temp = document.createElement('div');
      temp.innerHTML = note.content;
      const text = (temp.textContent || '').substring(0, 80) + (note.content && note.content.length > 80 ? '...' : '');
      
      // Hostname
      let hostname = 'unknown';
      try {
        hostname = new URL(note.url).hostname;
      } catch(e) {}
      
      // Color swatch
      const color = NOTE_COLORS[note.color]?.bg || '#fff59d';
      const pinned = note.pinned ? '📌' : '';

      tr.innerHTML = `
        <td class="dash-content">${escapeHtml(text)}</td>
        <td><a href="${escapeHtml(note.url)}" target="_blank">${escapeHtml(hostname)}</a></td>
        <td><span class="color-swatch" style="background:${color}"></span></td>
        <td>${pinned}</td>
        <td><button class="dash-delete-btn" data-id="${note.id}" data-url="${note.url}">Delete</button></td>
      `;
      
      const delBtn = tr.querySelector('.dash-delete-btn');
      delBtn.addEventListener('click', () => {
        deleteNoteById(note.id, note.url).then(() => {
          const el = document.getElementById(note.id);
          if (el) el.remove();
          tr.remove();
          tableRows = tableRows.filter(r => r !== tr);
          filterNotes();
        });
      });
      
      tbody.appendChild(tr);
      tableRows.push({ row: tr, note: note });
    });
    
    table.appendChild(tbody);
    list.appendChild(table);

    // Pagination controls
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'dashboard-pagination';
    paginationDiv.id = 'dashboard-pagination';
    list.appendChild(paginationDiv);

    function renderPagination() {
      const filtered = tableRows.filter(({ row }) => row.style.display !== 'none');
      const totalPages = Math.max(1, Math.ceil(filtered.length / NOTES_PER_PAGE));
      if (currentPage > totalPages) currentPage = totalPages;

      // Hide/show rows based on page
      filtered.forEach(({ row }, idx) => {
        const start = (currentPage - 1) * NOTES_PER_PAGE;
        const end = start + NOTES_PER_PAGE;
        row.style.display = (idx >= start && idx < end) ? '' : 'none';
      });

      // Unfiltered rows (those that don't match search) stay hidden
      tableRows.forEach(({ row }) => {
        if (row.dataset.filterHidden === 'true') {
          row.style.display = 'none';
        }
      });

      // Update pagination div
      if (filtered.length <= NOTES_PER_PAGE) {
        paginationDiv.style.display = 'none';
        return;
      }
      paginationDiv.style.display = 'flex';
      paginationDiv.innerHTML = '';

      const info = document.createElement('span');
      info.className = 'pagination-info';
      info.textContent = `${((currentPage - 1) * NOTES_PER_PAGE) + 1}-${Math.min(currentPage * NOTES_PER_PAGE, filtered.length)} of ${filtered.length}`;

      const prevBtn = document.createElement('button');
      prevBtn.className = 'pagination-btn';
      prevBtn.textContent = '← Prev';
      prevBtn.disabled = currentPage <= 1;
      prevBtn.addEventListener('click', () => { currentPage--; renderPagination(); });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'pagination-btn';
      nextBtn.textContent = 'Next →';
      nextBtn.disabled = currentPage >= totalPages;
      nextBtn.addEventListener('click', () => { currentPage++; renderPagination(); });

      paginationDiv.append(prevBtn, info, nextBtn);
    }

    // Filter notes if search is already filled, then render pagination
    if (currentSearchFilter) filterNotes();
    renderPagination();
  });

  function filterNotes() {
    const filter = currentSearchFilter;
    tableRows.forEach(({ row, note }) => {
      const temp = document.createElement('div');
      temp.innerHTML = note.content || '';
      const text = temp.textContent || '';
      let hostname = '';
      try { hostname = new URL(note.url).hostname; } catch(e) {}

      const match = !filter || 
        text.toLowerCase().includes(filter) || 
        hostname.toLowerCase().includes(filter);
      row.style.display = match ? '' : 'none';
    });
  }

  // Keyboard navigation handler
  function handleDashboardKeyboard(e) {
    // Focus search with /
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    // Arrow keys navigate rows
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const visibleRows = tableRows.filter(({ row }) => row.style.display !== 'none').map(({ row }) => row);
      if (visibleRows.length === 0) return;

      // Remove previous selection
      visibleRows.forEach(r => r.classList.remove('dashboard-row-selected'));

      if (e.key === 'ArrowDown') {
        selectedRowIndex = Math.min(selectedRowIndex + 1, visibleRows.length - 1);
      } else {
        selectedRowIndex = Math.max(selectedRowIndex - 1, 0);
      }
      visibleRows[selectedRowIndex].classList.add('dashboard-row-selected');
      visibleRows[selectedRowIndex].scrollIntoView({ block: 'nearest' });
      return;
    }

    // Enter to jump to note
    if (e.key === 'Enter') {
      const visibleRows = tableRows.filter(({ row }) => row.style.display !== 'none');
      if (selectedRowIndex >= 0 && selectedRowIndex < visibleRows.length) {
        const noteData = visibleRows[selectedRowIndex].note;
        dashboard.remove(); // Close dashboard
        const noteEl = document.getElementById(noteData.id);
        if (noteEl) {
          noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          noteEl.classList.add('note-highlight');
          setTimeout(() => noteEl.classList.remove('note-highlight'), 2000);
        }
      }
      return;
    }

    // Delete to remove note
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Only when not in search input
      if (document.activeElement === searchInput) return;
      const visibleRows = tableRows.filter(({ row }) => row.style.display !== 'none');
      if (selectedRowIndex >= 0 && selectedRowIndex < visibleRows.length) {
        const { note, row } = visibleRows[selectedRowIndex];
        deleteNoteById(note.id, note.url).then(() => {
          const el = document.getElementById(note.id);
          if (el) el.remove();
          row.remove();
          tableRows = tableRows.filter(r => r.row !== row);
          selectedRowIndex = Math.max(0, selectedRowIndex - 1);
        });
      }
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}