# Obsidian Comments Plugin - Specification

## Overview

A Google Docs-style comment system for Obsidian that allows users to highlight text and add threaded comments. Comments are stored in per-note shadow files (`.comments.json`) alongside the original markdown files.

## Architecture

### Shadow Files

Each markdown note can have a corresponding shadow file named `<note-name>.comments.json`.

**Location**: Same directory as the markdown file
**Naming**: `note-name.md` → `note-name.comments.json`
**Invisible**: Dot-prefixed in gitignore, hidden from Obsidian file explorer

**Example structure**:
```json
{
  "highlights": [
    {
      "id": "abc123",
      "line": 45,
      "startOffset": 120,
      "endOffset": 180,
      "text": "highlighted text content",
      "color": "yellow",
      "createdAt": 1743110400000,
      "resolved": false
    }
  ],
  "comments": [
    {
      "id": "comment-456",
      "highlightId": "abc123",
      "user": "Mattias",
      "content": "This needs more data",
      "createdAt": 1743110500000,
      "editedAt": null,
      "replies": [
        {
          "id": "reply-789",
          "user": "Mike",
          "content": "Agreed, I'll add sources",
          "createdAt": 1743110600000,
          "editedAt": null
        }
      ]
    }
  ]
}
```

## Features

### 1. Highlighting

- **Create highlight**: Select text → right-click → "Add highlight" or use command palette
- **Color options**: Yellow (default), Red, Teal, Blue, Green
- **Change color**: Hover over highlight border → color picker appears
- **Remove highlight**: Delete highlight from sidebar or via context menu
- **Highlights persist** even without comments

### 2. Commenting

- **Add comment**: Click highlight → sidebar opens → type comment
- **User attribution**: Comments tagged with username from settings
- **Edit comment**: Click edit icon on your own comments
- **Delete comment**: Click delete icon on your own comments (removes entire thread if root comment)
- **Reply**: Reply to any comment in a thread
- **Resolve**: Mark thread as resolved (hides by default, can toggle to show)

### 3. Sidebar

- **Shows**: All highlights/comments for currently open note
- **Grouping**: Unresolved first, then resolved (collapsed by default)
- **Click highlight**: Navigates to highlighted text in note
- **Click comment**: Opens thread, scrolls to highlighted text
- **Filter**: Toggle to show/hide resolved comments

### 4. Inline Display (Reading/Live Preview)

- **Highlighted text**: Colored background matching highlight color
- **Comment indicator**: Small colored dot/line on highlighted text
- **Hover**: Shows preview of comment count
- **Click**: Opens sidebar and focuses thread

### 5. Settings

- **Username**: Required field for comment attribution
- **Highlight color**: Default color for new highlights
- **Show resolved**: Toggle to show/hide resolved comments in sidebar

## UI Components

### Sidebar Panel

```
┌─────────────────────────────────┐
│ Comments                    [⚙] │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ ≡ Highlighted text...       │ │
│ │   👤 Mattias · 2h ago       │ │
│ │   "Comment text..."          │ │
│ │   └─ 👤 Mike · 1h ago       │ │
│ │       "Reply text..."       │ │
│ │   [Reply] [Resolve] [🗑]    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ≡ Another highlight...  ✓    │ │
│ │   (Resolved)                 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Settings Modal

```
┌─────────────────────────────────┐
│ Comments Settings               │
├─────────────────────────────────┤
│ Username: [Mattias          ]   │
│                                 │
│ Default highlight color:        │
│ [●] Yellow  ( ) Red            │
│ [ ] Teal   ( ) Blue            │
│ [ ] Green                       │
│                                 │
│ [✓] Show resolved comments     │
│                                 │
│         [Save] [Cancel]         │
└─────────────────────────────────┘
```

## File Structure

```
.obsidian/plugins/obsidian-comments/
├── manifest.json
├── main.js
├── styles.css
└── (compiled from src/)
    ├── main.ts
    ├── comments-plugin.ts
    ├── settings.ts
    ├── sidebar-view.ts
    ├── highlight-renderer.ts
    ├── shadow-file-manager.ts
    └── types.ts
```

## Data Flow

### Reading a Note
1. Note opens in editor
2. Plugin reads corresponding `.comments.json` file
3. Highlights are rendered inline
4. Sidebar populates with comments

### Creating a Highlight
1. User selects text → "Add highlight" command
2. Plugin calculates line number and character offsets
3. Shadow file is created/updated with new highlight
4. Inline highlight is rendered
5. Sidebar updates

### Adding a Comment
1. User clicks highlight in sidebar or inline
2. Comment input appears
3. User types comment → Enter to submit
4. Shadow file updated with new comment
5. Comment appears in sidebar thread

### Resolving
1. User clicks "Resolve" on thread
2. `resolved: true` flag added to highlight
3. Thread moves to "Resolved" section (collapsed)
4. Inline highlight gets resolved styling (muted)

## Technical Considerations

### Offset Management
- Store character offsets for precise highlighting
- Recalculate offsets when note is edited
- Handle text changes gracefully (may invalidate some offsets)

### Sync Strategy
- Shadow files can be committed to git alongside notes
- Multiple users can have conflicts (last-write-wins for now)
- Future: consider merge strategy for concurrent edits

### Performance
- Lazy load shadow files (only when note is opened)
- Cache in memory while note is active
- Debounce writes to shadow files

## Out of Scope (v1)
- Multi-user real-time collaboration
- Mentions (@user)
- Comment notifications
- Search across comments
- Vault-wide comments view
- Source mode support

## Implementation Priority

1. **Core data structures and shadow file management**
2. **Highlight creation and rendering**
3. **Basic sidebar view**
4. **Comment creation and display**
5. **Reply functionality**
6. **Resolve/unresolve**
7. **Edit/delete comments**
8. **Color picker**
9. **Settings page**
