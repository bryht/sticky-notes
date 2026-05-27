/**
 * Jest global setup: provide DOMParser and Node for Node.js environment.
 * Uses linkedom's parseHTML with a DOMParser wrapper that wraps fragments
 * in a full HTML document so linkedom parses them correctly.
 */
const { parseHTML } = require('linkedom');

class LinkedomDOMParser {
  parseFromString(html, type) {
    if (!html) {
      // Return a minimal document for empty input
      const emptyDoc = {
        body: { innerHTML: '', childNodes: [] },
        childNodes: [],
        querySelectorAll: () => [],
      };
      return emptyDoc;
    }
    // Wrap in full HTML document so linkedom parses fragments properly
    const wrapped = '<!DOCTYPE html><html><body>' + html + '</body></html>';
    const { document } = parseHTML(wrapped);
    return document;
  }
}

global.DOMParser = LinkedomDOMParser;

// Provide Node constants
const { document: _doc } = parseHTML('<!DOCTYPE html><html><body></body></html>');
global.Node = _doc.defaultView ? _doc.defaultView.Node : { ELEMENT_NODE: 1, TEXT_NODE: 3 };

// Provide document.createElement for escapeHtml functions
global.document = _doc;
