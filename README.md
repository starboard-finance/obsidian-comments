# obsidian-comments

A Google Docs-style comment system for Obsidian. Highlight text, add threaded comments, reply, and resolve — all from a sidebar panel.

## Features

- **Inline highlights** — Select text and add a colored highlight (yellow, red, teal, blue, green)
- **Threaded comments** — Add comments to highlights, reply to threads
- **User attribution** — Comments are tagged with your username
- **Resolve** — Mark threads as resolved (hidden by default, toggleable)
- **Edit/delete** — Edit or delete your own comments and replies
- **Per-note shadow files** — Comments stored in `note.comments.json` alongside your notes
- **Sidebar panel** — View all highlights and comments for the current note

## Installation via BRAT

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Open BRAT settings → "Add Beta plugin"
3. Enter: `starboard-finance/obsidian-comments`
4. Enable the plugin in Settings → Community Plugins

## Setup

After enabling, go to **Settings → Comments** and set your username.

## Usage

- **Add highlight**: Select text → right-click → "Add highlight"
- **Open sidebar**: Click the message icon in the ribbon, or use command palette → "Toggle comments sidebar"
- **Add comment**: Type in the input field under a highlight in the sidebar
- **Reply**: Click "↩ Reply" on any comment
- **Resolve**: Click "✓ Resolve" on a highlight card
- **Navigate to highlight**: Click the highlighted text snippet in the sidebar

## Development

```bash
git clone https://github.com/starboard-finance/obsidian-comments
cd obsidian-comments
npm install
npm run build
```

Copy the folder into your vault's `.obsidian/plugins/` directory.
