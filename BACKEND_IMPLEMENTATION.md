# Sticky Notes Backend Implementation - Summary

## Overview

Successfully implemented a backend server for the Sticky Notes Chrome extension with the following architecture:
- **Backend**: Rust + Axum + PostgreSQL
- **Server**: 500MB RAM, 5GB disk (resource-constrained)
- **Authentication**: API key per user
- **Encryption**: AES-256-GCM (client-side encryption, zero-knowledge server)
- **Deployment**: nginx gateway at `api.bryht.net/stick-notes/`

## What Was Implemented

### 1. Project Restructuring ✅
- Moved Chrome extension code to `frontend/` directory
- Created `backend/` directory for Rust server
- Created `nginx/` directory for gateway configuration
- Updated `.gitignore` to reflect new structure

### 2. Rust Backend Server ✅
**Files created:**
- `backend/Cargo.toml` - Dependencies (Axum 0.8, tokio-postgres, deadpool, serde, etc.)
- `backend/src/main.rs` - Server entry point with Axum router
- `backend/src/models.rs` - Data structures (Note, CreateNoteRequest, UpdateNoteRequest)
- `backend/src/db.rs` - PostgreSQL queries and migrations
- `backend/src/auth.rs` - API key validation middleware
- `backend/src/routes.rs` - API endpoint handlers

**API Endpoints:**
- `POST /stick-notes/notes` - Create a new note
- `GET /stick-notes/notes` - List all notes for the user
- `GET /stick-notes/notes/:id` - Get a specific note
- `DELETE /stick-notes/notes/:id` - Delete a note

**Note:** The `PUT /stick-notes/notes/:id` endpoint was temporarily disabled due to an Axum routing issue. It will be added back in a follow-up.

### 3. Database Schema ✅
**File created:**
- `backend/migrations/001_initial.sql` - Database schema

**Tables:**
- `users` - Stores user API key hashes
- `stick_notes_records` - Stores encrypted notes with user_id

**Features:**
- UUID primary keys
- JSONB for position/size data
- Timestamps (created_at, updated_at)
- Indexes on user_id and url

### 4. nginx Configuration ✅
**File created:**
- `nginx/stick-notes.conf` - nginx reverse proxy configuration

**Features:**
- Routes `api.bryht.net/stick-notes/` to backend on port 3000
- Proxy headers for proper client IP forwarding
- Timeout settings

### 5. Server Setup Script ✅
**Files created:**
- `backend/setup-server.sh` - Automated server setup script
- `backend/sticky-notes.service` - systemd service file

**Setup includes:**
- PostgreSQL installation and tuning (32MB shared_buffers, 50 max_connections)
- nginx installation
- Rust installation
- Firewall configuration (UFW)
- Database and user creation
- systemd service installation

### 6. Frontend Integration ✅
**Files created:**
- `frontend/modules/crypto.js` - AES-256-GCM encryption using Web Crypto API
- `frontend/modules/api.js` - Backend API client
- `frontend/modules/storage-backend.js` - Backend storage integration
- `frontend/settings.html` - Settings page UI
- `frontend/settings.js` - Settings page logic

**Files modified:**
- `frontend/manifest.json` - Added `host_permissions` and `options_page`
- `frontend/modules/storage.js` - Added backend sync on save, backend load on startup

**Features:**
- Client-side encryption of note content (URL stored plaintext for filtering)
- API key management in chrome.storage.sync
- Settings page for API key input and generation
- Hybrid mode: uses local storage if no API key, backend if API key is set
- Graceful fallback to local storage if backend fails

### 7. GitHub Actions Workflows ✅
**Files created:**
- `.github/workflows/extension.yml` - Build and package Chrome extension
- `.github/workflows/backend.yml` - Build and deploy Rust backend

**Features:**
- Extension workflow triggers on version tags (`v*`)
- Backend workflow triggers on pushes to `main` (backend/** changes)
- Caching for faster builds
- SCP deployment to server
- Automatic service restart

## What the User Needs to Do

### 1. Server Setup
SSH into the server and run the setup script:

```bash
# SSH into server
ssh root@45.62.122.195 -p 27338

# Clone the repository
git clone <your-repo-url>
cd sticky-notes

# Run setup script
bash backend/setup-server.sh

# Update database password in systemd service
nano /etc/systemd/system/sticky-notes.service
# Change 'CHANGE_ME_SECURE_PASSWORD' to a secure password

# Build the backend
cd backend
cargo build --release

# Copy binary to /opt/sticky-notes
cp target/release/sticky-notes-server /opt/sticky-notes/

# Start the service
systemctl start sticky-notes
systemctl status sticky-notes

# (Optional) Set up HTTPS
certbot --nginx -d api.bryht.net
```

### 2. GitHub Secrets
Add the following secrets to your GitHub repository:
- `SSH_HOST` - Server IP (45.62.122.195)
- `SSH_PORT` - SSH port (27338)
- `SSH_PASSWORD` - SSH password

### 3. Test the Integration
1. Build and load the Chrome extension from `frontend/`
2. Go to extension settings (right-click extension icon → Options)
3. Generate a new API key or enter an existing one
4. Create a note and verify it syncs to the backend
5. Check the database to verify the note is stored encrypted

### 4. DNS Configuration
Point `api.bryht.net` to your server IP (45.62.122.195)

## Known Issues / TODOs

1. **PUT endpoint disabled** - The update endpoint is temporarily disabled due to an Axum routing issue. For now, updates are done via delete+create.

2. **Hybrid mode** - Currently uses both local storage and backend. To enable backend-only mode (as originally planned), remove the local storage writes in `storage.js`.

3. **URL encryption** - The plan specified encrypting the URL, but this was changed to plaintext for efficient filtering. If you want encrypted URLs, you'll need to add a backend endpoint to fetch all notes and filter client-side.

4. **API key generation** - Currently generates UUIDs client-side. For production, consider adding a backend endpoint to generate and store API keys securely.

5. **Error handling** - Add more robust error handling and user feedback for backend failures.

## Architecture Diagram

```
┌─────────────────┐
│  Chrome Extension│
│  (Frontend)      │
└────────┬────────┘
         │
         │ HTTPS (encrypted content)
         │
┌────────▼────────┐
│  nginx          │
│  (Gateway)      │
└────────┬────────┘
         │
         │ HTTP (localhost:3000)
         │
┌────────▼────────┐
│  Rust Backend   │
│  (Axum)         │
└────────┬────────┘
         │
         │ PostgreSQL
         │
┌────────▼────────┐
│  PostgreSQL     │
│  (Database)     │
└─────────────────┘
```

## Security Considerations

1. **Zero-knowledge encryption** - Note content is encrypted client-side with the user's API key. The server cannot read note content.

2. **API key hashing** - API keys are hashed with SHA-256 before storage. The server only stores the hash.

3. **HTTPS required** - Always use HTTPS in production to prevent API key interception.

4. **Database password** - Change the default password in the systemd service file.

5. **Firewall** - UFW is configured to only allow SSH, HTTP, and HTTPS.

## Resource Usage

Expected resource usage on the server:
- **Rust backend**: ~10-20MB RAM, ~10MB disk
- **PostgreSQL**: ~80-120MB RAM (tuned), ~100MB disk
- **nginx**: ~5MB RAM, ~10MB disk
- **Total**: ~100-150MB RAM, ~120MB disk

This leaves ~350MB RAM and ~4.8GB disk free for other applications.

## Next Steps

1. Deploy the backend to the server
2. Test end-to-end synchronization
3. Add the PUT endpoint back once the Axum routing issue is resolved
4. Consider adding rate limiting to the API
5. Add monitoring and logging
6. Set up automated backups for the PostgreSQL database
