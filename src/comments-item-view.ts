import { ItemView, WorkspaceLeaf, TFile, MarkdownView } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { ShadowFileManager } from './shadow-file-manager';
import { CommentsSidebarView } from './sidebar-view';
import { PluginSettings, Highlight } from './types';
import { HighlightRenderer } from './highlight-renderer';

export const COMMENTS_VIEW_TYPE = 'obsidian-comments-view';

export class CommentsItemView extends ItemView {
	private shadowManager: ShadowFileManager;
	private settings: PluginSettings;
	private highlightRenderer: HighlightRenderer;
	private sidebarView: CommentsSidebarView | null = null;
	private onRefresh: () => void;

	constructor(
		leaf: WorkspaceLeaf,
		shadowManager: ShadowFileManager,
		settings: PluginSettings,
		highlightRenderer: HighlightRenderer,
		onRefresh: () => void
	) {
		super(leaf);
		this.shadowManager = shadowManager;
		this.settings = settings;
		this.highlightRenderer = highlightRenderer;
		this.onRefresh = onRefresh;
	}

	getViewType(): string {
		return COMMENTS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Comments';
	}

	getIcon(): string {
		return 'message-square';
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('comments-sidebar-container');

		this.sidebarView = new CommentsSidebarView(
			this.app,
			this.shadowManager,
			this.settings,
			this.contentEl,
			() => this.onRefresh(),
			(highlight: Highlight) => {
				const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (mdView && highlight.position) {
					const editor = mdView.editor as any;
					const editorView = editor?.cm as EditorView | undefined;
					if (editorView) {
						const docText = editorView.state.doc.toString();
						let contentOffset = 0;
						if (docText.startsWith('---\n')) {
							const end = docText.indexOf('\n---\n', 4);
							if (end !== -1) contentOffset = end + 5;
						}
						const absPos = contentOffset + highlight.position.start;

						editorView.dispatch({
							effects: EditorView.scrollIntoView(absPos, { y: 'center' }),
						});

						setTimeout(() => {
							const marks = editorView.contentDOM.querySelectorAll(
								`[data-highlight-id="${highlight.id}"]`
							);
							marks.forEach(el => {
								el.classList.add('obsidian-comments-highlight-pulse');
								setTimeout(() => el.classList.remove('obsidian-comments-highlight-pulse'), 1000);
							});
						}, 100);
					}
				}
				this.highlightRenderer.navigateToHighlight(highlight);
			}
		);

		this.contentEl.createEl('p', {
			text: 'Open a note to see comments.',
			cls: 'comments-empty-state',
		});

		setTimeout(async () => {
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			const mdLeaf = leaves.find(l => (l.view as any).file);
			const file = mdLeaf ? (mdLeaf.view as any).file : null;
			if (file && this.sidebarView) {
				await this.sidebarView.loadForFile(file);
			}
		}, 50);
	}

	async onClose(): Promise<void> {
		this.sidebarView = null;
	}

	async loadForFile(file: TFile): Promise<void> {
		if (this.sidebarView) {
			await this.sidebarView.loadForFile(file);
		}
	}

	async refresh(): Promise<void> {
		if (this.sidebarView) {
			await this.sidebarView.refresh();
		}
	}

	scrollToHighlightInRange(from: number, to: number): void {
		if (this.sidebarView) {
			this.sidebarView.scrollToHighlightInRange(from, to);
		}
	}
}
