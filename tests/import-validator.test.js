/**
 * Tests for the JSON import validator
 * Uses dynamic import to load the shared validation module
 */

let validateImportData;

beforeAll(async () => {
  const mod = await import('./../modules/validation.js');
  validateImportData = mod.validateImportData;
});

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
