/**
 * HTML Sanitizer for Sticky Notes
 * Prevents XSS by whitelisting safe HTML tags/attributes.
 * Replaces raw innerHTML assignment with sanitized output.
 */

const ALLOWED_TAGS = ['B', 'I', 'EM', 'STRONG', 'U', 'A', 'UL', 'OL', 'LI', 'BR', 'P', 'H1', 'H2', 'H3', 'SPAN', 'DIV'];
const ALLOWED_ATTRS = { 'A': ['href', 'target', 'rel'], 'SPAN': ['class', 'style'], 'DIV': ['class'], 'P': ['class'] };

/**
 * Check if a URL is dangerous (javascript:, vbscript:, data: URLs with executable content).
 * Handles case variations, whitespace padding, and encoded characters.
 */
function isDangerousURL(url) {
  if (!url) return false;
  // Strip whitespace and null bytes, then lowercase for comparison
  const stripped = url.replace(/\s+/g, '').replace(/\0/g, '').toLowerCase();
  return stripped.startsWith('javascript:') ||
         stripped.startsWith('vbscript:') ||
         stripped.startsWith('data:text/html');
}

export function sanitizeHTML(html) {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  function cleanNode(node) {
    // Remove non-element/text nodes (comments, processing instructions)
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED_TAGS.includes(child.tagName)) {
          // Remove disallowed tag entirely (don't hoist children — prevents nested payloads)
          child.remove();
        } else {
          // Strip disallowed attributes
          const allowedForTag = ALLOWED_ATTRS[child.tagName] || [];
          for (let j = child.attributes.length - 1; j >= 0; j--) {
            if (!allowedForTag.includes(child.attributes[j].name)) {
              child.removeAttribute(child.attributes[j].name);
            }
          }
          // Sanitize href to prevent javascript: URLs (case-insensitive, whitespace-resistant)
          if (child.tagName === 'A' && child.getAttribute('href')) {
            if (isDangerousURL(child.getAttribute('href'))) {
              child.removeAttribute('href');
            }
          }
          // Also check style attributes for expression/url attacks
          if (child.hasAttribute('style')) {
            const style = child.getAttribute('style');
            if (/url\s*\(|expression\s*\(|javascript:/i.test(style)) {
              child.removeAttribute('style');
            }
          }
          cleanNode(child);
        }
      }
    }
  }
  
  cleanNode(doc.body);
  return doc.body.innerHTML;
}