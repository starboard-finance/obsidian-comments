import { App, MarkdownView } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { ShadowFileManager } from './shadow-file-manager';
import { Highlight, HighlightColor } from './types';
import {
	addHighlightEffect,
	clearHighlightsEffect,
	highlightField,
	removeHighlightEffect,
} from './cm6-highlight-field';

export class HighlightRenderer {
	app: App;
	shadowManager: ShadowFileManager;

	constructor(app: App, shadowManager: ShadowFileManager) {
		this.app = app;
		this.shadowManager = shadowManager;
	}

	private getContentOffset(doc: string): number {
		if (doc.startsWith('---\n')) {
			const end = doc.indexOf('\n---\n', 4);
			if (end !== -1) return end + 5;
		}
		return 0;
	}

	private getActiveEditorContext(): {
		view: MarkdownView;
		editor: any;
		editorView: EditorView;
		file: any;
	} | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return null;

		const file = (view as any).file;
		if (!file) return null;

		const editor = view.editor as any;
		const editorView = editor?.cm as EditorView | undefined;
		if (!editorView) return null;

		return { view, editor, editorView, file };
	}

	private getAbsoluteRange(editor: any, doc: string, highlight: Highlight): { from: number; to: number } | null {
		const contentOffset = this.getContentOffset(doc);
		const startLinePos = editor.posToOffset?.({ line: highlight.startLine, ch: 0 });
		const endLinePos = editor.posToOffset?.({ line: highlight.endLine, ch: 0 });

		if (typeof startLinePos !== 'number' || typeof endLinePos !== 'number') {
			if (
				typeof highlight.position?.start === 'number' &&
				typeof highlight.position?.end === 'number'
			) {
				return {
					from: contentOffset + highlight.position.start,
					to: contentOffset + highlight.position.end,
				};
			}
			return null;
		}

		const from = startLinePos + highlight.startOffset;
		const to = endLinePos + highlight.endOffset;

		if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
		return { from, to };
	}

	/**
	 * Render highlights for the currently active file
	 */
	async renderHighlightsForActiveFile(): Promise<void> {
		const ctx = this.getActiveEditorContext();
		if (!ctx) return;

		this.clearDecorations();

		const data = await this.shadowManager.readShadowFile(ctx.file);
		const doc = ctx.editor.getValue?.() ?? '';

		const effects = [];

		for (const highlight of data.highlights) {
			const range = this.getAbsoluteRange(ctx.editor, doc, highlight);
			if (!range) continue;
			effects.push(
				addHighlightEffect.of({
					from: range.from,
					to: range.to,
					id: highlight.id,
					color: highlight.color,
				})
			);
		}

		if (effects.length > 0) {
			ctx.editorView.dispatch({ effects });
		}
	}

	/**
	 * Clear all active decorations
	 */
	private clearDecorations(): void {
		const ctx = this.getActiveEditorContext();
		if (!ctx) return;
		ctx.editorView.dispatch({ effects: clearHighlightsEffect.of(null) });
	}

	removeHighlightById(id: string): void {
		const ctx = this.getActiveEditorContext();
		if (!ctx) return;
		ctx.editorView.dispatch({ effects: removeHighlightEffect.of({ id }) });
	}

	/**
	 * Navigate to a highlight's position in the editor
	 */
	navigateToHighlight(highlight: Highlight): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor as any;
		const from = { line: highlight.startLine, ch: highlight.startOffset };
		const to = { line: highlight.endLine, ch: highlight.endOffset };

		editor.setSelection?.(from, to);
		editor.scrollIntoView?.({ from, to }, true);
	}

	/**
	 * Add a new highlight from selection
	 */
	async addHighlightFromSelection(
		color: HighlightColor
	): Promise<Highlight | null> {
		const ctx = this.getActiveEditorContext();
		if (!ctx) return null;

		const editor = ctx.editor;
		const selection = editor.getSelection?.();

		if (!selection) return null;

		const fromCursor = editor.getCursor?.('from');
		const toCursor = editor.getCursor?.('to');
		if (!fromCursor || !toCursor) return null;

		const from = editor.posToOffset?.(fromCursor);
		const to = editor.posToOffset?.(toCursor);
		if (typeof from !== 'number' || typeof to !== 'number' || to <= from) return null;

		const startLineStart = editor.posToOffset?.({ line: fromCursor.line, ch: 0 });
		const endLineStart = editor.posToOffset?.({ line: toCursor.line, ch: 0 });
		if (typeof startLineStart !== 'number' || typeof endLineStart !== 'number') return null;

		const doc = editor.getValue?.() ?? '';
		const contentOffset = this.getContentOffset(doc);
		const contentBody = doc.slice(contentOffset);
		const localStart = Math.max(0, from - contentOffset);
		const localEnd = Math.max(localStart, to - contentOffset);
		const anchorPrefix = contentBody.slice(Math.max(0, localStart - 32), localStart);
		const anchorSuffix = contentBody.slice(localEnd, Math.min(contentBody.length, localEnd + 32));

		const highlight = await this.shadowManager.createHighlight(
			ctx.file,
			{
				startLine: fromCursor.line,
				endLine: toCursor.line,
				startOffset: from - startLineStart,
				endOffset: to - endLineStart,
				text: selection,
				color,
				positionStart: localStart,
				positionEnd: localEnd,
				anchorPrefix,
				anchorSuffix,
			}
		);

		if (ctx.editorView.state.field(highlightField, false)) {
			ctx.editorView.dispatch({
				effects: addHighlightEffect.of({
					from,
					to,
					id: highlight.id,
					color: highlight.color,
				}),
			});
		}

		return highlight;
	}
}
