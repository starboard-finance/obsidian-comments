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
import { extractAnchor, findAnchorPosition } from './anchor';

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

	/**
	 * Render highlights for the currently active file
	 */
	async renderHighlightsForActiveFile(): Promise<void> {
		const ctx = this.getActiveEditorContext();
		if (!ctx) return;

		this.clearDecorations();

		const data = await this.shadowManager.readShadowFile(ctx.file);
		const fullDoc = ctx.editorView.state.doc.toString();
		const contentOffset = this.getContentOffset(fullDoc);
		const doc = fullDoc.slice(contentOffset);

		const effects = [];
		let didMutate = false;

		for (const highlight of data.highlights) {
			const recovered = findAnchorPosition(doc, highlight.anchor, highlight.position);
			if (!recovered) {
				if (!highlight.orphaned) {
					highlight.orphaned = true;
					didMutate = true;
				}
				continue;
			}

			if (highlight.orphaned) {
				highlight.orphaned = false;
				didMutate = true;
			}
			if (
				highlight.position.start !== recovered.from ||
				highlight.position.end !== recovered.to
			) {
				highlight.position.start = recovered.from;
				highlight.position.end = recovered.to;
				didMutate = true;
			}

			effects.push(
				addHighlightEffect.of({
					from: contentOffset + recovered.from,
					to: contentOffset + recovered.to,
					id: highlight.id,
					color: highlight.color,
				})
			);
		}

		if (didMutate) {
			await this.shadowManager.writeShadowFile(ctx.file, data);
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
		const anchor = extractAnchor(contentBody, localStart, localEnd);

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
				anchorPrefix: anchor.prefix,
				anchorSuffix: anchor.suffix,
				documentText: contentBody,
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
