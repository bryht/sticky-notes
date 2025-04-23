# Sticky Notes

A browser extension that allows you to create, edit, and manage sticky notes on any webpage.

![Sticky Notes Extension](icons/icon128.png)

## Features

- Create sticky notes on any webpage
- Edit note content with rich text
- Drag and reposition notes anywhere on the page
- Notes persist when you return to the page
- View all your notes from different websites in one dashboard
- Delete unwanted notes
- Simple and intuitive interface

## Installation

### From Web Store

1. Visit the Chrome Web Store (coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Sticky Notes extension should now appear in your extensions list

## Usage

1. Click the Sticky Notes icon in your browser toolbar to create a new note
2. Type your content in the note
3. Drag the note by its header to reposition it
4. Notes are automatically saved
5. Click the "☰" button on any note to view all your notes from different websites
6. Click the "✕" button to delete a note

## How It Works

- Sticky Notes uses your browser's local storage to save notes
- Notes are associated with the URL of the page they were created on
- The extension uses content scripts to inject and manage notes on webpages
- A background script handles data storage and communication

## Publishing

This extension can be published to the Chrome Web Store. For detailed instructions, see [Publishing Guide](docs/PUBLISHING.md).

To package the extension for publishing:
1. On Windows: Run `tool/package-extension.ps1` in PowerShell
2. On macOS/Linux: Run `bash tool/package-extension.sh` in terminal

This will create a `build/sticky-notes.zip` file that you can upload to the Chrome Web Store Developer Dashboard.

## Privacy

- All your notes are stored locally on your device
- No data is sent to external servers
- Your notes are private to your browser profile

## Support Development

If you find this extension useful, please consider supporting its continued development.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.