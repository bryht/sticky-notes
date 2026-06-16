import { encrypt, decrypt } from './crypto.js';
import { createNote, listNotes, deleteNote, updateNote, getApiKey } from './api.js';

const syncQueue = [];
let isProcessingQueue = false;

function enqueueSync(action) {
  syncQueue.push(action);
  if (!isProcessingQueue) {
    processSyncQueue();
  }
}

async function processSyncQueue() {
  isProcessingQueue = true;
  while (syncQueue.length > 0) {
    const action = syncQueue.shift();
    try {
      await action();
    } catch (err) {
      console.warn('Sync queue action failed:', err.message);
    }
  }
  isProcessingQueue = false;
}

export async function saveNotesToBackend(currentUrl, currentPageNotes) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('API key not set, skipping backend save');
    return;
  }

  const doSync = async () => {
    const existingNotes = await listNotes();
    const urlNotes = existingNotes.filter(note => note.url === currentUrl);
    const existingMap = new Map();
    urlNotes.forEach(n => existingMap.set(n.url + '|' + n.color + '|' + JSON.stringify(n.position), n));

    const newNoteKeys = new Set();
    const createdNotes = [];

    for (const noteData of currentPageNotes) {
      const encryptedContent = await encrypt(noteData.content, apiKey);
      const key = currentUrl + '|' + noteData.color + '|' + JSON.stringify(noteData.position);
      newNoteKeys.add(key);

      const payload = {
        content: JSON.stringify(encryptedContent),
        position: noteData.position,
        size: noteData.size,
        color: noteData.color,
        minimized: noteData.minimized,
        url: noteData.url
      };

      const existing = existingMap.get(key);
      if (existing) {
        try {
          await updateNote(existing.id, payload);
        } catch (err) {
          console.warn('Update failed for note, creating new:', err.message);
          await createNote(payload);
        }
      } else {
        createdNotes.push(createNote(payload));
      }
    }

    await Promise.all(createdNotes);

    const deletePromises = [];
    for (const note of urlNotes) {
      const key = note.url + '|' + note.color + '|' + JSON.stringify(note.position);
      if (!newNoteKeys.has(key)) {
        deletePromises.push(deleteNote(note.id).catch(err => {
          console.warn('Delete failed for note:', err.message);
        }));
      }
    }
    await Promise.all(deletePromises);

    console.log(`Saved ${currentPageNotes.length} notes to backend`);
  };

  try {
    await doSync();
  } catch (error) {
    console.error('Failed to save notes to backend, queuing retry:', error);
    enqueueSync(doSync);
  }
}

export async function loadNotesFromBackend(currentUrl) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('API key not set, skipping backend load');
    return [];
  }

  try {
    const allNotes = await listNotes();

    const decryptedNotes = [];
    for (const note of allNotes) {
      if (note.url === currentUrl) {
        try {
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
