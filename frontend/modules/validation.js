/**
 * Validation utilities for Sticky Notes
 * Shared between features.js and tests
 */

/**
 * Validate imported data schema: check structure, note count, field sizes.
 * Returns { valid: boolean, error?: string }
 */
export function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data is not an object' };
  }
  if (!Array.isArray(data.notes)) {
    return { valid: false, error: 'notes field is missing or not an array' };
  }
  if (data.notes.length > 10000) {
    return { valid: false, error: 'Too many notes (max 10,000)' };
  }
  for (let i = 0; i < data.notes.length; i++) {
    const note = data.notes[i];
    if (!note.id || typeof note.id !== 'string') {
      return { valid: false, error: `Note ${i}: missing or invalid id` };
    }
    if (note.content && typeof note.content === 'string' && note.content.length > 50000) {
      return { valid: false, error: `Note ${i}: content exceeds 50KB limit` };
    }
    if (note.url && typeof note.url === 'string') {
      try {
        const parsed = new URL(note.url);
        if (!parsed.hostname) {
          return { valid: false, error: `Note ${i}: invalid URL` };
        }
      } catch(e) {
        return { valid: false, error: `Note ${i}: invalid URL` };
      }
    }
  }
  return { valid: true };
}
