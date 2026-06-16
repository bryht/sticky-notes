import { getApiKey, setApiKey, registerAccount } from './modules/api.js';

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 5000);
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
}

function generateApiKey() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  const uuid = hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-4' + hex.substring(13, 16) + '-' +
    ((parseInt(hex.substring(16, 17), 16) & 0x3 | 0x8).toString(16)) + hex.substring(17, 20) + '-' + hex.substring(20, 32);

  apiKeyInput.value = uuid;
  showStatus('New API key generated. Click "Save Settings" to register and apply.', 'success');
}

saveBtn.addEventListener('click', saveApiKey);
generateBtn.addEventListener('click', generateApiKey);

loadApiKey();
