/**
 * Settings page logic for Sticky Notes extension.
 */

import { getApiKey, setApiKey } from './modules/api.js';

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');

/**
 * Show a status message.
 * @param {string} message - The message to display
 * @param {'success'|'error'} type - The message type
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

/**
 * Load the current API key from storage.
 */
async function loadApiKey() {
  try {
    const apiKey = await getApiKey();
    if (apiKey) {
      apiKeyInput.value = apiKey;
    }
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}

/**
 * Save the API key to storage.
 */
async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  try {
    if (apiKey) {
      await setApiKey(apiKey);
      showStatus('Settings saved successfully!', 'success');
    } else {
      await setApiKey('');
      showStatus('Settings saved. Cloud sync is now disabled.', 'success');
    }
  } catch (error) {
    console.error('Failed to save API key:', error);
    showStatus('Failed to save settings. Please try again.', 'error');
  }
}

/**
 * Generate a new API key (UUID v4 format).
 */
function generateApiKey() {
  // Generate a UUID v4
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  apiKeyInput.value = uuid;
  showStatus('New API key generated. Click "Save Settings" to apply.', 'success');
}

// Event listeners
saveBtn.addEventListener('click', saveApiKey);
generateBtn.addEventListener('click', generateApiKey);

// Load API key on page load
loadApiKey();
