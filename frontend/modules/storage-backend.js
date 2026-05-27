/**
 * Backend storage integration for Sticky Notes.
 * Replaces chrome.storage.local with backend API calls.
 */

import { encrypt, decrypt } from './crypto.js';
import { createNote, listNotes, deleteNote, getApiKey } from './api.js';

/**
 * Save all current page notes to the backend.
 * This deletes all existing notes for the current URL and creates new ones.
 * @param {string} currentUrl - The current page URL
 * @param {Array} currentPageNotes - Array of note objects from DOM
 */
export async function saveNotesToBackend(currentUrl, currentPageNotes) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('API key not set, skipping backend save');
    return;
  }

  try {
    // Get existing notes for this URL from backend
    const existingNotes = await listNotes();
    const urlNotes = existingNotes.filter(note => note.url === currentUrl);

    // Delete existing notes for this URL
    for (const note of urlNotes) {
      await deleteNote(note.id);
    }

    // Create new notes
    for (const noteData of currentPageNotes) {
      const encryptedContent = await encrypt(noteData.content, apiKey);

      await createNote({
        content: JSON.stringify(encryptedContent),
        position: noteData.position,
        size: noteData.size,
        color: noteData.color,
        minimized: noteData.minimized,
        url: noteData.url  // URL is stored plaintext for filtering
      });
    }

    console.log(`Saved ${currentPageNotes.length} notes to backend`);
  } catch (error) {
    console.error('Failed to save notes to backend:', error);
    throw error;
  }
}

/**
 * Load notes for the current URL from the backend.
 * @param {string} currentUrl - The current page URL
 * @returns {Promise<Array>} Array of decrypted note objects
 */
export async function loadNotesFromBackend(currentUrl) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('API key not set, skipping backend load');
    return [];
  }

  try {
    const allNotes = await listNotes();

    // Filter notes for this URL (URL is plaintext) and decrypt content
    const decryptedNotes = [];
    for (const note of allNotes) {
      if (note.url === currentUrl) {
        try {
          // Decrypt content
          const encryptedContent = JSON.parse(note.content);
          const decryptedContent = await decrypt(encryptedContent, apiKey);

          decryptedNotes.push({
            id: note.id,
            content: decryptedContent,
            position: note.position,
            size: note.size,
            color: note.color,
            minimized: note.minimized,
            url: note.url,
            timestamp: new Date(note.updated_at).getTime()
          });
        } catch (decryptError) {
          console.warn('Failed to decrypt note:', decryptError);
          // Skip notes that can't be decrypted
        }
      }
    }

    console.log(`Loaded ${decryptedNotes.length} notes from backend`);
    return decryptedNotes;
  } catch (error) {
    console.error('Failed to load notes from backend:', error);
    throw error;
  }
}
