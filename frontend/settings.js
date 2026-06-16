import { getApiKey, setApiKey, registerAccount, checkHealth } from './modules/api.js';

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');
const toggleVisibilityBtn = document.getElementById('toggleVisibility');
const testConnectionBtn = document.getElementById('testConnection');
const syncStatusDot = document.getElementById('syncStatusDot');
const syncStatusText = document.getElementById('syncStatusText');
const deleteAllBtn = document.getElementById('deleteAllSyncedBtn');

let apiKeyVisible = false;

function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
}

function updateApiKeyDisplay() {
  const value = apiKeyInput.value;
  if (!apiKeyVisible && value) {
    apiKeyInput.type = 'password';
    if (toggleVisibilityBtn) toggleVisibilityBtn.textContent = '👁️';
  } else {
    apiKeyInput.type = 'text';
    if (toggleVisibilityBtn) toggleVisibilityBtn.textContent = '🔒';
  }
}

if (toggleVisibilityBtn) {
  toggleVisibilityBtn.addEventListener('click', () => {
    apiKeyVisible = !apiKeyVisible;
    updateApiKeyDisplay();
  });
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 5000);
}

async function updateSyncStatus() {
  if (!syncStatusDot || !syncStatusText) return;
  const apiKey = await getApiKey();
  if (!apiKey) {
    syncStatusDot.className = 'sync-status-dot disconnected';
    syncStatusText.textContent = 'Not configured';
    return;
  }
  const healthy = await checkHealth();
  if (healthy) {
    syncStatusDot.className = 'sync-status-dot connected';
    syncStatusText.textContent = 'Connected';
  } else {
    syncStatusDot.className = 'sync-status-dot disconnected';
    syncStatusText.textContent = 'Not connected';
  }
}

async function loadApiKey() {
  try {
    const apiKey = await getApiKey();
    if (apiKey) {
      apiKeyInput.value = apiKey;
    }
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
  updateApiKeyDisplay();
  updateSyncStatus();
}

async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  try {
    if (apiKey) {
      if (apiKey.length < 16) {
        showStatus('API key must be at least 16 characters.', 'error');
        return;
      }
      await setApiKey(apiKey);

      try {
        await registerAccount(apiKey);
        showStatus('Settings saved and account registered successfully!', 'success');
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          showStatus('Settings saved successfully!', 'success');
        } else {
          showStatus('Settings saved, but registration failed: ' + regErr.message, 'error');
        }
      }
    } else {
      await setApiKey('');
      showStatus('Settings saved. Cloud sync is now disabled.', 'success');
    }
  } catch (error) {
    console.error('Failed to save API key:', error);
    showStatus('Failed to save settings. Please try again.', 'error');
  }
  updateApiKeyDisplay();
  updateSyncStatus();
}

function generateApiKey() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  const uuid = hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-4' + hex.substring(13, 16) + '-' +
    ((parseInt(hex.substring(16, 17), 16) & 0x3 | 0x8).toString(16)) + hex.substring(17, 20) + '-' + hex.substring(20, 32);

  apiKeyInput.value = uuid;
  apiKeyVisible = true;
  updateApiKeyDisplay();
  showStatus('New API key generated. Click "Save Settings" to register and apply.', 'success');
}

async function testConnection() {
  if (testConnectionBtn) {
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';
  }
  const healthy = await checkHealth();
  if (testConnectionBtn) {
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = 'Test Connection';
  }
  if (healthy) {
    showStatus('Connection successful! Backend is reachable.', 'success');
  } else {
    showStatus('Connection failed. Backend is not reachable.', 'error');
  }
  updateSyncStatus();
}

async function deleteAllSyncedData() {
  if (!confirm('Are you sure you want to delete ALL synced data? This cannot be undone.')) return;
  if (!confirm('This will permanently remove all notes from the cloud. Continue?')) return;

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      showStatus('No API key configured. Nothing to delete.', 'error');
      return;
    }

    const { listNotes, deleteNote } = await import('./modules/api.js');
    const notes = await listNotes({ limit: 10000 });
    if (notes && notes.length > 0) {
      for (const note of notes) {
        try {
          await deleteNote(note.id);
        } catch(e) {
          console.warn('Failed to delete note:', note.id, e);
        }
      }
      showStatus(`Deleted ${notes.length} synced notes.`, 'success');
    } else {
      showStatus('No synced notes found.', 'success');
    }
  } catch (err) {
    console.error('Failed to delete synced data:', err);
    showStatus('Failed to delete synced data: ' + err.message, 'error');
  }
}

saveBtn.addEventListener('click', saveApiKey);
generateBtn.addEventListener('click', generateApiKey);
if (testConnectionBtn) testConnectionBtn.addEventListener('click', testConnection);
if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllSyncedData);

loadApiKey();