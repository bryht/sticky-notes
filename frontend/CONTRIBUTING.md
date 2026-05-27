# Contributing to Sticky Notes

Thanks for your interest in contributing! 🎉

## Quick Start

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Submit a Pull Request

## Development Setup

1. Clone your fork
2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the repo root
3. Make changes and reload the extension to test

## Build

```bash
node build.js
```

Output goes to `build/sticky-notes-vX.Y.Z.zip`.

## PR Checklist

Before submitting a PR, please ensure:

- [ ] Code follows existing style (2-space indentation, semicolons)
- [ ] No `alert()` calls — use the `showToast()` utility from `modules/error.js`
- [ ] Content from storage is sanitized before innerHTML assignment — use `sanitizeHTML()` from `modules/sanitizer.js`
- [ ] New features work in both light and dark mode
- [ ] Build succeeds: `node build.js`
- [ ] Extension loads and basic note creation works

## Code Style

- JavaScript: 2-space indent, single quotes, semicolons
- CSS: 2-space indent, kebab-case class names
- No external dependencies — the extension stays lightweight

## Reporting Bugs

Please open an issue with:

1. Chrome version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)

## Feature Requests

Open an issue with the label `enhancement` and describe:

1. The problem you're trying to solve
2. Your proposed solution
3. Any alternatives you've considered