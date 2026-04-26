/**
 * Tests for the JSON import validator
 */

// Inline the validateImportData logic (same as in features.js)
function validateImportData(data) {
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
      try { new URL(note.url); } catch(e) {
        return { valid: false, error: `Note ${i}: invalid URL` };
      }
    }
  }
  return { valid: true };
}

describe('validateImportData', () => {
  test('rejects non-object input', () => {
    expect(validateImportData(null).valid).toBe(false);
    expect(validateImportData('string').valid).toBe(false);
    expect(validateImportData(123).valid).toBe(false);
  });

  test('rejects missing notes array', () => {
    expect(validateImportData({}).valid).toBe(false);
    expect(validateImportData({ notes: 'not array' }).valid).toBe(false);
  });

  test('accepts valid import data', () => {
    const data = {
      notes: [
        { id: 'note-1', content: 'Hello', url: 'https://example.com' },
        { id: 'note-2', content: 'World', url: 'https://example.com' }
      ]
    };
    expect(validateImportData(data).valid).toBe(true);
  });

  test('rejects too many notes', () => {
    const notes = Array(10001).fill({ id: 'x', content: 'y' });
    expect(validateImportData({ notes }).valid).toBe(false);
  });

  test('rejects note without id', () => {
    const data = { notes: [{ content: 'no id' }] };
    expect(validateImportData(data).valid).toBe(false);
  });

  test('rejects oversized content', () => {
    const data = { notes: [{ id: 'x', content: 'a'.repeat(50001) }] };
    expect(validateImportData(data).valid).toBe(false);
  });

  test('rejects invalid URL', () => {
    const data = { notes: [{ id: 'x', url: 'not-a-valid-url' }] };
    expect(validateImportData(data).valid).toBe(false);
  });

  test('allows notes without URL', () => {
    const data = { notes: [{ id: 'x', content: 'text' }] };
    expect(validateImportData(data).valid).toBe(true);
  });
});