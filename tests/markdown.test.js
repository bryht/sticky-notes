/**
 * Tests for the markdown parser module
 * DOMParser, Node, and document are set up in tests/setup.js via linkedom
 */

const fs = require('fs');
const path = require('path');

const mdSource = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'markdown.js'),
  'utf8'
);

const converted = mdSource
  .replace(/^import\s+.*?;\s*$/gm, '')
  .replace(/^export\s+function\s+/gm, 'function ')
  .replace(/^export\s+const\s+/gm, 'const ')
  .replace(/^export\s+let\s+/gm, 'let ');

const testableCode = converted + '\nreturn { parseMarkdown };';
const moduleExport = new Function(testableCode)();
const parseMarkdown = moduleExport.parseMarkdown;

describe('parseMarkdown', () => {
  test('returns empty string for empty input', () => {
    expect(parseMarkdown('')).toBe('');
    expect(parseMarkdown(null)).toBe('');
  });

  test('passes through plain text', () => {
    expect(parseMarkdown('Hello world')).toContain('Hello world');
  });

  // ── Headings ──
  test('converts # H1', () => {
    expect(parseMarkdown('# Title')).toContain('<h1>Title</h1>');
  });

  test('converts ## H2', () => {
    expect(parseMarkdown('## Subtitle')).toContain('<h2>Subtitle</h2>');
  });

  test('converts ### H3', () => {
    expect(parseMarkdown('### Section')).toContain('<h3>Section</h3>');
  });

  test('### takes precedence over ## and #', () => {
    const result = parseMarkdown('### h3');
    expect(result).toContain('<h3>h3</h3>');
    expect(result).not.toContain('<h1>');
    expect(result).not.toContain('<h2>');
  });

  // ── Bold and Italic ──
  test('converts bold **text**', () => {
    expect(parseMarkdown('hello **world** end')).toContain('<strong>world</strong>');
  });

  test('converts italic *text*', () => {
    expect(parseMarkdown('hello *world* end')).toContain('<em>world</em>');
  });

  test('handles bold and italic in same line', () => {
    const result = parseMarkdown('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  // ── Links ──
  test('converts [text](url)', () => {
    const result = parseMarkdown('[click](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('click');
  });

  // ── Lists ──
  test('converts bullet lists', () => {
    const result = parseMarkdown('- item one\n- item two');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('item one');
  });

  test('single bullet list item creates list', () => {
    const result = parseMarkdown('- solo item');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  // ── Line breaks ──
  test('converts line breaks', () => {
    const result = parseMarkdown('line1\nline2');
    expect(result).toContain('<br>');
  });

  // ── XSS protection ──
  test('escapes HTML in raw text', () => {
    const result = parseMarkdown('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
  });

  test('escapes img tags', () => {
    const result = parseMarkdown('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('<img');
  });

  // ── Mixed formatting ──
  test('handles mixed formatting', () => {
    const result = parseMarkdown('# Header\n**bold** and *italic*');
    expect(result).toContain('<h1>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  test('heading with bold text', () => {
    const result = parseMarkdown('# **Important** Title');
    expect(result).toContain('<h1>');
    expect(result).toContain('<strong>');
  });

  // ── Edge cases ──
  test('handles very long text', () => {
    const longText = 'a'.repeat(10000);
    const result = parseMarkdown(longText);
    expect(result).toContain('a');
  });

  test('handles special characters', () => {
    const result = parseMarkdown('price: $10 & $20');
    expect(result).toBeDefined();
  });
});
