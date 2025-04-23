# Publishing to the Chrome Web Store

This guide walks through the process of publishing the Sticky Notes extension to the Google Chrome Web Store.

## Prerequisites

1. **Google Developer Account**: You need a Google Developer account to publish to the Chrome Web Store. Registration requires a one-time fee of $5.
2. **Zip file of your extension**: A packaged version of your extension code.
3. **Screenshots and promotional images**: Visual assets required for your store listing.

## Step 1: Prepare Your Extension

### 1.1 Verify your manifest.json

Ensure your manifest.json file contains all required fields:
- `name`: The name of your extension
- `version`: The version number (update this when publishing updates)
- `description`: A brief description
- `icons`: Various icon sizes (at least 128px required)

### 1.2 Create a ZIP package

1. Make sure your code is finalized and tested
2. Remove any unnecessary files (like .git folder, development notes, etc.)
3. Zip all your extension files (manifest.json, background.js, contentScript.js, icons folder, etc.)

```bash
# Example command to create a ZIP file (run in terminal)
cd path/to/sticky-notes
zip -r sticky-notes.zip * -x "*.git*" -x "docs/*" -x "tool/*"
```

On Windows, you can right-click the files/folders, select "Send to" > "Compressed (zipped) folder", or use a tool like 7-Zip.

## Step 2: Create Visual Assets

The Chrome Web Store requires several images for your listing:

### 2.1 Required assets:

- **Icon (128x128)**: Already available in your icons folder
- **Screenshots (1280x800 or 640x400)**: At least one screenshot showing your extension in action
- **Small promotional tile (440x280)**: Showcases your extension in the Chrome Web Store

### 2.2 Optional assets:

- **Large promotional tile (920x680)**: For featured extensions
- **Marquee promotional tile (1400x560)**: For featured extensions

You can use the tool/generate-icons.html file to help generate some of these assets if needed.

## Step 3: Publish to the Chrome Web Store

### 3.1 Create a Developer Account

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay the one-time registration fee ($5) if you haven't already

### 3.2 Create a new item

1. Click "New Item" in the dashboard
2. Upload your ZIP file
3. Fill out the store listing information:
   - Description (detailed explanation of your extension)
   - Category (Productivity recommended for Sticky Notes)
   - Language
   - Website (optional)
   - Upload all required images

### 3.3 Privacy practices

1. Complete the privacy practices questionnaire
   - Since your extension stores data locally, indicate this
   - Specify what data your extension collects (if any)
   - Describe how the data is used
2. Provide a link to your privacy policy (if applicable)

### 3.4 Set pricing and distribution

1. Choose between Free or Paid (Free recommended for initial launch)
2. Select which countries to publish in (usually "All countries")

### 3.5 Submit for review

1. Preview your store listing
2. Accept the developer agreement
3. Click "Submit for review"

## Step 4: Wait for Review

- The review process typically takes 2-3 business days
- You'll receive an email when your extension is approved or if there are issues to address

## Step 5: Updates and Maintenance

When releasing updates:

1. Increment the version number in manifest.json
2. Create a new ZIP file
3. Go to your item in the Developer Dashboard
4. Click "Package" > "Upload new package"
5. Submit for review again (updates typically review faster)

## Troubleshooting

If your extension is rejected:
1. Read the feedback carefully
2. Make the necessary changes
3. Resubmit with a note explaining the changes

## Best Practices

- Respond quickly to user feedback
- Provide clear instructions in your description
- Keep your extension updated
- Add release notes when updating
- Monitor your extension's performance metrics in the dashboard

## Additional Resources

- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Policy](https://developer.chrome.com/docs/webstore/program-policies/)
- [Developer Dashboard](https://chrome.google.com/webstore/devconsole)