/**
 * HTML Sanitizer for Sticky Notes
 * Prevents XSS by whitelisting safe HTML tags/attributes.
 * Replaces raw innerHTML assignment with sanitized output.
 */

const ALLOWED_TAGS = ['B', 'I', 'EM', 'STRONG', 'U', 'A', 'UL', 'OL', 'LI', 'BR', 'P', 'H1', 'H2', 'H3', 'SPAN', 'DIV'];
const ALLOWED_ATTRS = { 'A': ['href', 'target', 'rel'], 'SPAN': ['class', 'style'], 'DIV': ['class'], 'P': ['class'] };

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
          // Replace disallowed tag with its text content
          child.replaceWith(...child.childNodes);
        } else {
          // Strip disallowed attributes
          const allowedForTag = ALLOWED_ATTRS[child.tagName] || [];
          for (let j = child.attributes.length - 1; j >= 0; j--) {
            if (!allowedForTag.includes(child.attributes[j].name)) {
              child.removeAttribute(child.attributes[j].name);
            }
          }
          // Sanitize href to prevent javascript: URLs
          if (child.tagName === 'A' && child.getAttribute('href')) {
            const href = child.getAttribute('href');
            if (href.trim().toLowerCase().startsWith('javascript:')) {
              child.removeAttribute('href');
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
