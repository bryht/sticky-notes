const API_BASE = 'https://api.bryht.net/stick-notes';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

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

export async function setApiKey(apiKey) {
  if (apiKey && (typeof apiKey !== 'string' || apiKey.trim().length === 0)) {
    throw new Error('API key must be a non-empty string');
  }
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ apiKey: apiKey || '' }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

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

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `API request failed: ${response.status}`);
      }

      if (response.status === 204) {
        return null;
      }

      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }

      if (attempt < MAX_RETRIES && (err.name === 'AbortError' || err.name === 'TypeError')) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

export async function registerAccount(apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Registration failed: ${response.status}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Registration request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

export async function createNote(note) {
  return apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(note)
  });
}

export async function listNotes(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const qs = query.toString();
  return apiRequest(`/notes${qs ? '?' + qs : ''}`);
}

export async function getNote(noteId) {
  return apiRequest(`/notes/${noteId}`);
}

export async function updateNote(noteId, updates) {
  return apiRequest(`/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteNote(noteId) {
  return apiRequest(`/notes/${noteId}`, {
    method: 'DELETE'
  });
}

export async function checkHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}
