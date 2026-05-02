/**
 * Comprehensive tests for the HTML sanitizer module
 * DOMParser and Node are set up in tests/setup.js
 */

const fs = require('fs');
const path = require('path');

const sanitizerSource = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'sanitizer.js'),
  'utf8'
);

const fnBody = sanitizerSource
  .replace('export function sanitizeHTML', 'function sanitizeHTML')
  .replace(/export\s+/g, '');

const sanitizeFn = new Function(fnBody + '\nreturn sanitizeHTML;')();

describe('sanitizeHTML', () => {
  test('returns empty string for falsy input', () => {
    expect(sanitizeFn('')).toBe('');
    expect(sanitizeFn(null)).toBe('');
    expect(sanitizeFn(undefined)).toBe('');
  });

  test('preserves plain text', () => {
    expect(sanitizeFn('Hello world')).toBe('Hello world');
  });

  test('preserves safe inline tags', () => {
    expect(sanitizeFn('<b>bold</b> and <i>italic</i>')).toContain('<b>bold</b>');
    expect(sanitizeFn('<b>bold</b> and <i>italic</i>')).toContain('<i>italic</i>');
  });

  test('preserves strong and em tags', () => {
    expect(sanitizeFn('<strong>strong</strong>')).toContain('<strong>strong</strong>');
    expect(sanitizeFn('<em>em</em>')).toContain('<em>em</em>');
  });

  test('preserves underline tag', () => {
    expect(sanitizeFn('<u>underlined</u>')).toContain('<u>underlined</u>');
  });

  test('preserves links with allowed attributes', () => {
    const result = sanitizeFn('<a href="https://example.com" target="_blank" rel="noopener">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
  });

  test('preserves list tags', () => {
    const result = sanitizeFn('<ul><li>item 1</li><li>item 2</li></ul>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  test('preserves heading tags', () => {
    expect(sanitizeFn('<h1>heading</h1>')).toContain('<h1>');
    expect(sanitizeFn('<h2>sub</h2>')).toContain('<h2>');
    expect(sanitizeFn('<h3>sub-sub</h3>')).toContain('<h3>');
  });

  // XSS prevention
  test('strips script tags', () => {
    const result = sanitizeFn('<script>alert("xss")</script><b>safe</b>');
    expect(result).not.toContain('<script');
    expect(result).toContain('<b>safe</b>');
  });

  test('strips onclick handlers', () => {
    expect(sanitizeFn('<div onclick="alert(1)">content</div>')).not.toContain('onclick');
  });

  test('strips javascript: URLs', () => {
    expect(sanitizeFn('<a href="javascript:alert(1)">click</a>')).not.toContain('javascript');
  });

  test('strips mixed-case javascript: URLs', () => {
    expect(sanitizeFn('<a href="JaVaScRiPt:alert(1)">click</a>')).not.toContain('ascript');
  });

  test('strips whitespace-padded javascript: URLs', () => {
    expect(sanitizeFn('<a href=" javascript:alert(1)">click</a>')).not.toContain('javascript');
  });

  test('strips vbscript: URLs', () => {
    expect(sanitizeFn('<a href="vbscript:msgbox">click</a>')).not.toContain('vbscript');
  });

  test('strips data:text/html URLs', () => {
    expect(sanitizeFn('<a href="data:text/html,<script>alert(1)</script>">click</a>')).not.toContain('data:text/html');
  });

  test('strips img tags', () => {
    const result = sanitizeFn('<img src="x" onerror="alert(1)"><b>text</b>');
    expect(result).not.toContain('<img');
    expect(result).toContain('<b>text</b>');
  });

  test('strips iframe tags', () => {
    expect(sanitizeFn('<iframe src="evil.com"></iframe>')).not.toContain('<iframe');
  });

  test('strips style tags', () => {
    const result = sanitizeFn('<style>body{display:none}</style><b>safe</b>');
    expect(result).not.toContain('<style');
    expect(result).toContain('<b>safe</b>');
  });

  test('strips style with expression()', () => {
    expect(sanitizeFn('<span style="width:expression(alert(1))">text</span>')).not.toContain('expression');
  });

  test('strips style with url()', () => {
    expect(sanitizeFn('<span style="background:url(javascript:alert(1))">text</span>')).not.toContain('url(');
  });

  test('allows safe style attributes', () => {
    expect(sanitizeFn('<span style="color: red; font-size: 14px;">text</span>')).toContain('color: red');
  });
});
