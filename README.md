# Sticky Notes 📝

A powerful browser extension for creating, managing, and organizing sticky notes on any webpage — with cloud sync across devices. Create, color, and manage sticky notes on any website with undo-delete, touch support, and optional encrypted cloud backup.

![Sticky Notes Extension](frontend/icons/icon128.png)

## Features

### Core
- Create sticky notes on any webpage
- Edit note content with rich text (contentEditable)
- Drag and reposition notes anywhere on the page (mouse + touch)
- Resize notes to any dimension
- Minimize notes to save space
- Choose from 6 colors per note — with hover preview
- Notes persist when you return to the page
- Viewport-aware positioning — notes always appear on-screen

### Cloud Sync
- **Sync across devices** — access your notes from any browser
- **End-to-end encryption** — notes are encrypted with AES-256-GCM before leaving your device
- **API key authentication** — secure access with auto-generated or custom keys
- **Settings page** — manage your API key and sync preferences
- **Self-hostable** — run the backend on your own server

### Dashboard
- View all your notes from different websites in one dashboard
- Paginated dashboard (25 notes per page)
- Search notes by content or URL
- Keyboard navigation (`↑↓` to select, `Delete` to remove)

### Data
- Export all notes to JSON for backup
- Import notes from JSON backup (merge or replace mode)
- Undo delete — 5-second restore window after deleting a note
- Confirmation modal (no more `alert()`/`confirm()`)

### Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` | Create new note |
| `Ctrl+Shift+D` | Toggle dashboard |
| `Ctrl+Shift+E` | Export notes |
| `Ctrl+Shift+I` | Import notes |
| `Ctrl+S` | Force save |
| `Escape` | Close dashboard/color picker |

### Other
- Dark mode support
- Right-click context menu on notes
- Character count in note footer
- Cross-browser compatibility (Chrome, Edge; Firefox requires Manifest V2 adaptation)
- Note count badge on extension icon

## Installation

### From Web Store

Coming soon!

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `frontend/` directory
5. The Sticky Notes extension should now appear in your extensions list
6. Click the icon to create your first note!

### Cloud Sync Setup

1. Right-click the extension icon → **Options** (or go to `chrome://extensions/` → Details → Extension options)
2. Generate an API key (or enter your own)
3. Click **Save**
4. Your notes will now sync automatically to `https://api.bryht.net`
5. Use the same API key on other devices to sync your notes

## Backend Deployment

To self-host the cloud sync server:

### Prerequisites
- Ubuntu/Debian server
- PostgreSQL
- Rust toolchain

### Quick Setup

```bash
# Clone the repo on your server
git clone https://github.com/bryht/sticky-notes.git
cd sticky-notes

# Run the setup script
bash backend/setup-server.sh

# Update the database password
# Edit /etc/systemd/system/sticky-notes.service and change the DATABASE_URL password

# Build and deploy
cd backend && cargo build --release
cp target/release/sticky-notes-server /opt/sticky-notes/
chown www-data:www-data /opt/sticky-notes/sticky-notes-server

# Start the service
systemctl start sticky-notes
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notes` | List all notes for the user |
| `POST` | `/notes` | Create a new note |
| `GET` | `/notes/{id}` | Get a single note |
| `PUT` | `/notes/{id}` | Update a note |
| `DELETE` | `/notes/{id}` | Delete a note |

All endpoints require `X-API-Key` header.

## Usage

1. Click the Sticky Notes icon in your browser toolbar to create a new note
2. Type your content in the note
3. Drag the note by its header to reposition it
4. Resize by dragging the bottom-right corner handle
5. Minimize with the `─` button (restore with `□`)
6. Change color with the 🎨 button
7. Notes are automatically saved (and synced if enabled)
8. Click `☰` on any note to view all your notes across different websites
9. In the dashboard, use 📤 Export or 📥 Import to manage backups
10. Click `✕` to delete a note
11. Right-click the extension icon → **Options** to manage cloud sync settings

## Architecture

```
sticky-notes/
├── frontend/                    # Chrome Extension
│   ├── manifest.json            # Extension config (Manifest v3)
│   ├── content.js               # Entry point
│   ├── background.js            # Service worker (storage + badge + sync)
│   ├── styles.css               # All styles
│   ├── settings.html            # Settings page (API key, cloud sync)
│   ├── settings.js              # Settings page logic
│   ├── modules/
│   │   ├── api.js               # Backend API client
│   │   ├── config.js            # Constants, defaults
│   │   ├── crypto.js            # AES-256-GCM encryption
│   │   ├── ui.js                # Note DOM creation, layout
│   │   ├── drag.js              # Drag logic with cleanup
│   │   ├── storage.js           # CRUD + debounced save
│   │   ├── storage-backend.js   # Cloud sync logic
│   │   ├── dashboard.js         # All-notes view
│   │   ├── features.js          # Resize, minimize, colors, export, import, undo-delete
│   │   ├── contextmenu.js       # Right-click context menu on notes
│   │   └── validation.js        # Shared validation logic
│   └── icons/
│
├── backend/                     # Rust Cloud Sync Server
│   ├── src/
│   │   ├── main.rs              # Axum server entry point
│   │   ├── auth.rs              # API key authentication
│   │   ├── db.rs                # PostgreSQL connection + migrations
│   │   ├── models.rs            # Data models
│   │   └── routes.rs            # REST API endpoints
│   ├── migrations/              # SQL migrations
│   ├── Cargo.toml               # Rust dependencies
│   └── sticky-notes.service     # systemd service file
│
├── nginx/                       # Reverse proxy config
│   └── stick-notes.conf
│
└── .github/workflows/           # CI/CD
    ├── extension.yml            # Build & release extension
    ├── backend.yml              # Build & deploy backend
    └── deploy-pages.yml         # Deploy landing page
```

## How It Works

- Sticky Notes uses Chrome Extension Manifest v3 with `chrome.storage.local` for local persistence
- Notes are associated with the URL they were created on
- Content scripts inject and manage notes on webpages
- A service worker background script handles data storage and communication
- **Cloud sync** encrypts notes with AES-256-GCM using your API key, then syncs to the backend
- The backend stores encrypted notes in PostgreSQL — the server never sees your plaintext data

## Privacy

- **Local storage mode** (default): All notes stored locally on your device, no data sent anywhere
- **Cloud sync mode** (optional): Notes are end-to-end encrypted before leaving your device
  - Encryption key is derived from your API key
  - Server only stores encrypted blobs
  - Self-host the backend for full control
- Export files contain only your own note data

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` | Create new note |
| `Ctrl+Shift+D` | Toggle dashboard |
| `Ctrl+Shift+E` | Export notes |
| `Ctrl+Shift+I` | Import notes |
| `Ctrl+S` | Force save |
| `Escape` | Close dashboard/color picker |

## Browser Compatibility

This extension is designed to work with:
- Google Chrome (v88+)
- Microsoft Edge (v88+)
- Firefox (requires Manifest V2 port — see CONTRIBUTING.md)

## Support Development

If you find this extension useful, consider supporting by:
- Starring ⭐ this repository
- Reporting bugs and suggesting features
- Contributing code improvements

## License

This project is licensed under the MIT License.

---

<p align="center">Built with ❤️ using Manifest v3</p>
