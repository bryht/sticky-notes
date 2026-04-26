/**
 * Tests for the markdown parser module
 */

const fs = require('fs');
const path = require('path');

// Read markdown.js and convert ES exports for Node
const mdSource = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'markdown.js'),
  'utf8'
);

// Extract parseMarkdown by converting the module
let parseMarkdown;
const converted = mdSource
  .replace(/^import\s+.*?;\s*$/gm, '')        // remove imports
  .replace(/^export\s+function\s+/gm, 'function ')
  .replace(/^export\s+const\s+/gm, 'const ')
  .replace(/^export\s+let\s+/gm, 'let ');

// We need parseMarkdown - it's a private function, so we expose it via eval trick
// Add a test export at the end
const testableCode = converted + '\nreturn { parseMarkdown, escapeHtml: typeof escapeHtml !== "undefined" ? escapeHtml : null };';
const moduleExport = new Function(testableCode)();
parseMarkdown = moduleExport.parseMarkdown;

describe('parseMarkdown', () => {
  test('returns empty string for empty input', () => {
    expect(parseMarkdown('')).toBe('');
    expect(parseMarkdown(null)).toBe('');
  });

  test('converts bold **text**', () => {
    const result = parseMarkdown('hello **world** end');
    expect(result).toContain('<strong>world</strong>');
  });

  test('converts italic *text*', () => {
    const result = parseMarkdown('hello *world* end');
    expect(result).toContain('<em>world</em>');
  });

  test('converts headings', () => {
    expect(parseMarkdown('# Title')).toContain('<h1>Title</h1>');
    expect(parseMarkdown('## Subtitle')).toContain('<h2>Subtitle</h2>');
    expect(parseMarkdown('### Section')).toContain('<h3>Section</h3>');
  });

  test('converts links [text](url)', () => {
    const result = parseMarkdown('[click](https://example.com)');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('click');
  });

  test('converts bullet lists', () => {
    const result = parseMarkdown('- item one\n- item two');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('item one');
  });

  test('converts line breaks', () => {
    const result = parseMarkdown('line1\nline2');
    expect(result).toContain('<br>');
  });

  test('escapes HTML in raw text', () => {
    const result = parseMarkdown('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
  });

  test('handles mixed formatting', () => {
    const result = parseMarkdown('# Header\n**bold** and *italic*');
    expect(result).toContain('<h1>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });
});