import { getAllNotes, deleteNoteById } from './storage.js';
import { NOTE_COLORS, DARK_NOTE_COLORS } from './config.js';
import { toggleDarkMode, getDarkMode } from './darkmode.js';
import { showToast } from './error.js';
import { escapeHtml } from './sanitizer.js';

let currentSearchFilter = '';
let selectedRowIndex = -1;
let tableRows = [];
let sortedNotes = [];
let currentSort = 'date-desc';
const NOTES_PER_PAGE = 25;
let currentPage = 1;
let searchDebounceTimer = null;

function isSafeURL(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'file:';
  } catch(e) {
    return false;
  }
}

function sortNotes(notes) {
  const sorted = [...notes];
  switch (currentSort) {
    case 'date-asc':
      sorted.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      break;
    case 'color':
      sorted.sort((a, b) => (a.color || 'yellow').localeCompare(b.color || 'yellow'));
      break;
    case 'url':
      sorted.sort((a, b) => {
        let ha = '', hb = '';
        try { ha = new URL(a.url).hostname; } catch(e) { /* ignore */ }
        try { hb = new URL(b.url).hostname; } catch(e) { /* ignore */ }
        return ha.localeCompare(hb);
      });
      break;
    case 'date-desc':
    default:
      sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      break;
  }
  return sorted;
}

function highlightMatch(text, filter) {
  if (!filter) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="sn-highlight">$1</mark>');
}

export function showAllNotesDashboard() {
  currentPage = 1;
  currentSort = 'date-desc';
  const existing = document.getElementById('notes-dashboard');
  if (existing) existing.remove();

  const dashboard = document.createElement('div');
  dashboard.id = 'notes-dashboard';
  dashboard.setAttribute('role', 'dialog');
  dashboard.setAttribute('aria-label', 'All Notes Dashboard');

  const content = document.createElement('div');
  content.className = 'dashboard-content';

  const header = document.createElement('div');
  header.className = 'dashboard-header';

  const title = document.createElement('h2');
  title.textContent = 'All Notes';

  const headerButtons = document.createElement('div');
  headerButtons.className = 'dashboard-header-buttons';

  const darkBtn = document.createElement('button');
  darkBtn.className = 'dash-btn dark-toggle-btn';
  darkBtn.innerHTML = getDarkMode() ? '☀️' : '🌙';
  darkBtn.title = getDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  darkBtn.setAttribute('aria-label', darkBtn.title);
  darkBtn.addEventListener('click', () => {
    toggleDarkMode();
    darkBtn.innerHTML = getDarkMode() ? '☀️' : '🌙';
    darkBtn.title = getDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    darkBtn.setAttribute('aria-label', darkBtn.title);
  });
  headerButtons.appendChild(darkBtn);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.className = 'dashboard-close';
  closeBtn.setAttribute('aria-label', 'Close dashboard');
  closeBtn.addEventListener('click', () => dashboard.remove());
  headerButtons.appendChild(closeBtn);

  header.append(title, headerButtons);
  content.appendChild(header);

  const searchBar = document.createElement('div');
  searchBar.className = 'dashboard-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'dashboard-search-input';
  searchInput.placeholder = 'Search notes...';
  searchInput.setAttribute('aria-label', 'Search notes');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchFilter = e.target.value.toLowerCase();
      selectedRowIndex = -1;
      filterNotes();
      renderPagination();
    }, 150);
  });
  const clearBtn = document.createElement('button');
  clearBtn.className = 'dashboard-search-clear';
  clearBtn.innerHTML = '✕';
  clearBtn.title = 'Clear search';
  clearBtn.setAttribute('aria-label', 'Clear search');
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchFilter = '';
    selectedRowIndex = -1;
    filterNotes();
    renderPagination();
  });
  searchBar.appendChild(searchInput);
  searchBar.appendChild(clearBtn);

  const searchCount = document.createElement('span');
  searchCount.className = 'dashboard-search-count';
  searchCount.id = 'dashboard-search-count';
  searchBar.appendChild(searchCount);

  content.appendChild(searchBar);

  const sortBar = document.createElement('div');
  sortBar.className = 'dashboard-sort';
  sortBar.style.cssText = 'display:flex;gap:8px;padding:4px 20px;border-bottom:1px solid #eee;font-size:13px;';

  const sorts = [
    { key: 'date-desc', label: 'Newest' },
    { key: 'date-asc', label: 'Oldest' },
    { key: 'color', label: 'Color' },
    { key: 'url', label: 'Page' },
  ];

  sorts.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'dash-btn' + (s.key === currentSort ? ' dash-btn-active' : '');
    btn.textContent = s.label;
    btn.style.cssText = s.key === currentSort ? 'background:#e3f2fd;color:#1565c0;border-color:#1976d2;' : '';
    btn.addEventListener('click', () => {
      currentSort = s.key;
      sortBar.querySelectorAll('.dash-btn').forEach(b => {
        b.style.cssText = '';
      });
      btn.style.cssText = 'background:#e3f2fd;color:#1565c0;border-color:#1976d2;';
      sortedNotes = sortNotes(sortedNotes);
      renderTable();
    });
    sortBar.appendChild(btn);
  });
  content.appendChild(sortBar);

  const list = document.createElement('div');
  list.className = 'dashboard-list';
  list.id = 'dashboard-list';
  list.innerHTML = '<p class="dashboard-loading">Loading notes...</p>';
  content.appendChild(list);

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

  dashboard.addEventListener('click', (e) => {
    if (e.target === dashboard) dashboard.remove();
  });

  dashboard.addEventListener('keydown', handleDashboardKeyboard);
  dashboard.tabIndex = -1;
  dashboard.focus();

  getAllNotes().then(notes => {
    if (notes.length === 0) {
      list.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'dashboard-empty';
      empty.innerHTML = `
        <div style="font-size:40px;margin-bottom:12px;">📝</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px;">No notes yet</div>
        <div style="font-size:14px;color:#888;margin-bottom:16px;">Click the Sticky Notes icon or press Ctrl+Shift+N to create your first note.</div>
      `;
      list.appendChild(empty);
      return;
    }

    sortedNotes = sortNotes(notes);
    renderTable();
  });

  function renderTable() {
    const listEl = document.getElementById('dashboard-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'dashboard-table';
    table.setAttribute('role', 'grid');
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Content</th>
          <th scope="col">Page</th>
          <th scope="col">Color</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    tableRows = [];

    const textCache = new Map();

    sortedNotes.forEach(note => {
      const tr = document.createElement('tr');
      tr.setAttribute('role', 'row');

      if (!textCache.has(note.id)) {
        const temp = document.createElement('div');
        temp.innerHTML = note.content || '';
        textCache.set(note.id, temp.textContent || '');
      }
      const text = textCache.get(note.id);
      const preview = text.substring(0, 80) + (text.length > 80 ? '...' : '');

      let hostname = 'unknown';
      try {
        hostname = new URL(note.url).hostname;
      } catch(e) { /* Invalid URL */ }

      const palette = getDarkMode() ? DARK_NOTE_COLORS : NOTE_COLORS;
      const color = palette[note.color]?.bg || palette.yellow.bg;

      const safeHref = isSafeURL(note.url) ? note.url : '#';

      const contentHtml = currentSearchFilter ? highlightMatch(preview, currentSearchFilter) : escapeHtml(preview);

      tr.innerHTML = `
        <td class="dash-content">${contentHtml}</td>
        <td><a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hostname)}</a></td>
        <td><span class="color-swatch" style="background:${color}" aria-label="${escapeHtml(note.color || 'yellow')}"></span></td>
        <td><button class="dash-delete-btn" data-id="${escapeHtml(note.id)}" data-url="${escapeHtml(note.url)}">Delete</button></td>
      `;

      const delBtn = tr.querySelector('.dash-delete-btn');
      delBtn.addEventListener('click', () => {
        deleteNoteById(note.id, note.url).then(() => {
          const el = document.getElementById(note.id);
          if (el) el.remove();
          tr.remove();
          tableRows = tableRows.filter(r => r !== tr);
          sortedNotes = sortedNotes.filter(n => n.id !== note.id);
          filterNotes();
          renderPagination();
        });
      });

      tbody.appendChild(tr);
      tableRows.push({ row: tr, note: note, textContent: text });
    });

    table.appendChild(tbody);
    listEl.appendChild(table);

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'dashboard-pagination';
    paginationDiv.id = 'dashboard-pagination';
    listEl.appendChild(paginationDiv);

    if (currentSearchFilter) filterNotes();
    renderPagination();
  }

  function filterNotes() {
    const filter = currentSearchFilter;
    tableRows.forEach(({ row, note, textContent }) => {
      let hostname = '';
      try { hostname = new URL(note.url).hostname; } catch(e) { /* Invalid URL */ }

      const match = !filter ||
        textContent.toLowerCase().includes(filter) ||
        hostname.toLowerCase().includes(filter);
      row.style.display = match ? '' : 'none';
      row.dataset.filterHidden = match ? '' : 'true';
    });

    const matchCount = tableRows.filter(({ row }) => row.dataset.filterHidden !== 'true').length;
    const countEl = document.getElementById('dashboard-search-count');
    if (countEl) countEl.textContent = filter ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : '';
  }

  function renderPagination() {
    const paginationDiv = document.getElementById('dashboard-pagination');
    if (!paginationDiv) return;

    const filtered = tableRows.filter(({ row }) => row.dataset.filterHidden !== 'true');
    const totalPages = Math.max(1, Math.ceil(filtered.length / NOTES_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    filtered.forEach(({ row }, idx) => {
      const start = (currentPage - 1) * NOTES_PER_PAGE;
      const end = start + NOTES_PER_PAGE;
      const isOnPage = idx >= start && idx < end;
      row.style.display = (row.dataset.filterHidden === 'true') ? 'none' : (isOnPage ? '' : 'none');
    });

    tableRows.forEach(({ row }) => {
      if (row.dataset.filterHidden === 'true') {
        row.style.display = 'none';
      }
    });

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

  function handleDashboardKeyboard(e) {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const visibleRows = tableRows.filter(({ row }) => row.style.display !== 'none');
      if (visibleRows.length === 0) return;

      visibleRows.forEach(({ row }) => row.classList.remove('dashboard-row-selected'));

      if (e.key === 'ArrowDown') {
        selectedRowIndex = Math.min(selectedRowIndex + 1, visibleRows.length - 1);
      } else {
        selectedRowIndex = Math.max(selectedRowIndex - 1, 0);
      }
      visibleRows[selectedRowIndex].row.classList.add('dashboard-row-selected');
      visibleRows[selectedRowIndex].row.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (e.key === 'Enter') {
      const visibleRows = tableRows.filter(({ row }) => row.style.display !== 'none');
      if (selectedRowIndex >= 0 && selectedRowIndex < visibleRows.length) {
        const noteData = visibleRows[selectedRowIndex].note;
        dashboard.remove();
        const noteEl = document.getElementById(noteData.id);
        if (noteEl) {
          noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          noteEl.classList.add('note-highlight');
          setTimeout(() => noteEl.classList.remove('note-highlight'), 2000);
        } else {
          showToast('This note is on a different page', 'info');
        }
      }
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement === searchInput) return;
      const visibleRows = tableRows.filter(({ row }) => row.style.display !== 'none');
      if (selectedRowIndex >= 0 && selectedRowIndex < visibleRows.length) {
        const { note, row } = visibleRows[selectedRowIndex];
        deleteNoteById(note.id, note.url).then(() => {
          const el = document.getElementById(note.id);
          if (el) el.remove();
          row.remove();
          tableRows = tableRows.filter(r => r.row !== row);
          sortedNotes = sortedNotes.filter(n => n.id !== note.id);
          selectedRowIndex = Math.max(0, selectedRowIndex - 1);
          renderPagination();
        });
      }
    }
  }
}