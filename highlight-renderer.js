"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightRenderer = void 0;
const obsidian_1 = require("obsidian");
const types_1 = require("./types");
class HighlightRenderer {
    constructor(app, shadowManager) {
        this.activeHighlights = new Map();
        this.app = app;
        this.shadowManager = shadowManager;
    }
    /**
     * Render highlights for the currently active file
     */
    async renderHighlightsForActiveFile() {
        const view = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (!view)
            return;
        const file = view.file;
        if (!file)
            return;
        // Clear existing decorations
        this.clearDecorations();
        const data = await this.shadowManager.readShadowFile(file);
        // Add decorations for each highlight
        for (const highlight of data.highlights) {
            this.addHighlightDecoration(view, highlight);
        }
    }
    /**
     * Add a highlight decoration to the editor
     */
    addHighlightDecoration(view, highlight) {
        const editor = view.editor;
        const line = highlight.line;
        const start = highlight.startOffset;
        const end = highlight.endOffset;
        const from = { ch: start, line: line };
        const to = { ch: end, line: line };
        // Store highlight position for clearing later
        this.activeHighlights.set(highlight.id, { from, to });
        // Apply the decoration using the editor's markText method
        // Using any to bypass strict TypeScript checking for Obsidian API
        editor.markText?.(from, to, {
            className: 'obsidian-comments-highlight',
            attributes: {
                'data-highlight-id': highlight.id,
                'data-highlight-color': highlight.color,
                style: `background-color: ${types_1.COLOR_HEX[highlight.color]}40; border-bottom: 2px solid ${types_1.COLOR_HEX[highlight.color]};`,
            },
        });
    }
    /**
     * Clear all active decorations
     */
    clearDecorations() {
        const view = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (!view)
            return;
        const editor = view.editor;
        const doc = editor.getDoc?.() || editor;
        // Clear all marks that have our highlight data
        const marks = doc.getAllMarks?.() || [];
        for (const mark of marks) {
            if (mark.className === 'obsidian-comments-highlight') {
                mark.clear?.();
            }
        }
        this.activeHighlights.clear();
    }
    /**
     * Navigate to a highlight's position in the editor
     */
    navigateToHighlight(highlight) {
        const view = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (!view)
            return;
        const editor = view.editor;
        // Scroll to the line
        editor.scrollTo?.(highlight.line, 0);
        // Select the highlighted text
        editor.setSelection?.({ ch: highlight.startOffset, line: highlight.line }, { ch: highlight.endOffset, line: highlight.line });
    }
    /**
     * Add a new highlight from selection
     */
    async addHighlightFromSelection(color) {
        const view = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (!view)
            return null;
        const file = view.file;
        if (!file)
            return null;
        const editor = view.editor;
        const selection = editor.getSelection?.();
        if (!selection)
            return null;
        const cursor = editor.getCursor?.('from');
        const line = cursor?.line;
        const lineText = editor.getLine?.(line);
        if (line === undefined || !lineText)
            return null;
        // Find the start and end offsets of the selection within the line
        const from = editor.posToOffset?.({ ch: 0, line }) || 0;
        const selFrom = editor.posToOffset?.(cursor) || 0;
        const selTo = editor.posToOffset?.(editor.getCursor?.('to')) || 0;
        // Create the highlight
        const highlight = await this.shadowManager.createHighlight(file, line, selFrom - from, selTo - from, selection, color);
        // Re-render highlights
        await this.renderHighlightsForActiveFile();
        return highlight;
    }
}
exports.HighlightRenderer = HighlightRenderer;
