import { App, MarkdownView } from 'obsidian';
import { ShadowFileManager } from './shadow-file-manager';
import { Highlight, COLOR_HEX } from './types';

export class HighlightRenderer {
	app: App;
	shadowManager: ShadowFileManager;
	private activeHighlights: Map<string, { from: any; to: any }> = new Map();

	constructor(app: App, shadowManager: ShadowFileManager) {
		this.app = app;
		this.shadowManager = shadowManager;
	}

	/**
	 * Render highlights for the currently active file
	 */
	async renderHighlightsForActiveFile(): Promise<void> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const file = (view as any).file;
		if (!file) return;

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
	private addHighlightDecoration(view: MarkdownView, highlight: Highlight): void {
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
		(editor as any).markText?.(from, to, {
			className: 'obsidian-comments-highlight',
			attributes: {
				'data-highlight-id': highlight.id,
				'data-highlight-color': highlight.color,
				style: `background-color: ${COLOR_HEX[highlight.color]}40; border-bottom: 2px solid ${COLOR_HEX[highlight.color]};`,
			},
		});
	}

	/**
	 * Clear all active decorations
	 */
	private clearDecorations(): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const doc = editor.getDoc?.() || editor;

		// Clear all marks that have our highlight data
		const marks = (doc as any).getAllMarks?.() || [];
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
	navigateToHighlight(highlight: Highlight): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;

		// Scroll to the line
		editor.scrollTo?.(highlight.line, 0);

		// Select the highlighted text
		editor.setSelection?.(
			{ ch: highlight.startOffset, line: highlight.line },
			{ ch: highlight.endOffset, line: highlight.line }
		);
	}

	/**
	 * Add a new highlight from selection
	 */
	async addHighlightFromSelection(
		color: string
	): Promise<Highlight | null> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return null;

		const file = (view as any).file;
		if (!file) return null;

		const editor = view.editor;
		const selection = editor.getSelection?.();

		if (!selection) return null;

		const cursor = editor.getCursor?.('from');
		const line = cursor?.line;
		const lineText = editor.getLine?.(line);

		if (line === undefined || !lineText) return null;

		// Find the start and end offsets of the selection within the line
		const from = editor.posToOffset?.({ ch: 0, line }) || 0;
		const selFrom = editor.posToOffset?.(cursor) || 0;
		const selTo = editor.posToOffset?.(editor.getCursor?.('to')) || 0;

		// Create the highlight
		const highlight = await this.shadowManager.createHighlight(
			file,
			line,
			selFrom - from,
			selTo - from,
			selection,
			color as any
		);

		// Re-render highlights
		await this.renderHighlightsForActiveFile();

		return highlight;
	}
}
