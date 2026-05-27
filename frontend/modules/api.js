/**
 * API client for Sticky Notes backend.
 */

const API_BASE = 'https://api.bryht.net/stick-notes';

/**
 * Get the API key from chrome.storage.sync.
 * @returns {Promise<string|null>} The API key or null if not set
 */
export async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to get API key:', chrome.runtime.lastError.message);
        resolve(null);
        return;
      }
      resolve(result.apiKey || null);
    });
  });
}

/**
 * Set the API key in chrome.storage.sync.
 * @param {string} apiKey - The API key to store
 * @returns {Promise<void>}
 */
export async function setApiKey(apiKey) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ apiKey }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Make an authenticated API request.
 * @param {string} endpoint - The API endpoint (e.g., '/notes')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} The response data
 */
async function apiRequest(endpoint, options = {}) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set your API key in the extension settings.');
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null; // No content
  }

  return response.json();
}

/**
 * Create a new note.
 * @param {Object} note - The note data
 * @returns {Promise<Object>} The created note
 */
export async function createNote(note) {
  return apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(note)
  });
}

/**
 * Get all notes for the current user.
 * @returns {Promise<Array>} List of notes
 */
export async function listNotes() {
  return apiRequest('/notes');
}

/**
 * Get a specific note by ID.
 * @param {string} noteId - The note ID
 * @returns {Promise<Object>} The note
 */
export async function getNote(noteId) {
  return apiRequest(`/notes/${noteId}`);
}

/**
 * Update a note.
 * @param {string} noteId - The note ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} The updated note
 */
export async function updateNote(noteId, updates) {
  return apiRequest(`/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

/**
 * Delete a note.
 * @param {string} noteId - The note ID
 * @returns {Promise<void>}
 */
export async function deleteNote(noteId) {
  return apiRequest(`/notes/${noteId}`, {
    method: 'DELETE'
  });
}
