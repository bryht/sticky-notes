/**
 * Tests for the HTML sanitizer module
 */

// Mock DOMParser for Node environment
const { DOMParser } = require('linkedom');
global.DOMParser = DOMParser;

// We need to read the sanitizer source and eval it since it uses ES module export
const fs = require('fs');
const path = require('path');

// Read and adapt sanitizer.js for Node test environment
const sanitizerSource = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'sanitizer.js'),
  'utf8'
);

// Convert ES export to function for testing
const fnBody = sanitizerSource
  .replace('export function sanitizeHTML', 'function sanitizeHTML')
  .replace(/export\s+/g, '');

// Extract just the sanitizeHTML function using eval
const sanitizeFn = new Function(fnBody + '\nreturn sanitizeHTML;')();

describe('sanitizeHTML', () => {
  test('returns empty string for empty input', () => {
    expect(sanitizeFn('')).toBe('');
    expect(sanitizeFn(null)).toBe('');
    expect(sanitizeFn(undefined)).toBe('');
  });

  test('preserves safe tags', () => {
    const html = '<b>bold</b> and <i>italic</i>';
    const result = sanitizeFn(html);
    expect(result).toContain('<b>bold</b>');
    expect(result).toContain('<i>italic</i>');
  });

  test('preserves links with href', () => {
    const html = '<a href="https://example.com" target="_blank">link</a>';
    const result = sanitizeFn(html);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
  });

  test('strips javascript: URLs', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeFn(html);
    expect(result).not.toContain('javascript:');
  });

  test('strips script tags', () => {
    const html = '<script>alert("xss")</script><b>safe</b>';
    const result = sanitizeFn(html);
    expect(result).not.toContain('<script');
    expect(result).toContain('<b>safe</b>');
  });

  test('strips on* event handlers', () => {
    const html = '<div onclick="alert(1)">content</div>';
    const result = sanitizeFn(html);
    expect(result).not.toContain('onclick');
  });

  test('preserves list tags', () => {
    const html = '<ul><li>item 1</li><li>item 2</li></ul>';
    const result = sanitizeFn(html);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  test('preserves heading tags', () => {
    const html = '<h1>heading</h1><h2>sub</h2><h3>sub-sub</h3>';
    const result = sanitizeFn(html);
    expect(result).toContain('<h1>heading</h1>');
    expect(result).toContain('<h2>sub</h2>');
  });

  test('strips img tags', () => {
    const html = '<img src="x" onerror="alert(1)"><b>text</b>';
    const result = sanitizeFn(html);
    expect(result).not.toContain('<img');
    expect(result).toContain('<b>text</b>');
  });
});