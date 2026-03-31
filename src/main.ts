import { App, Plugin, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { CommentsSettingsTab } from './settings';
import { ShadowFileManager } from './shadow-file-manager';
import { HighlightRenderer } from './highlight-renderer';
import { CommentsItemView, COMMENTS_VIEW_TYPE } from './comments-item-view';
import { PluginSettings, DEFAULT_SETTINGS, HighlightColor } from './types';
import { highlightField } from './cm6-highlight-field';

export default class CommentsPlugin extends Plugin {
	settings: PluginSettings;
	shadowManager: ShadowFileManager;
	highlightRenderer: HighlightRenderer;
	private _cacheRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	private _scrollSyncTimer: ReturnType<typeof setTimeout> | null = null;

	async onload() {
		await this.loadSettings();
		this.shadowManager = new ShadowFileManager(this.app);
		this.highlightRenderer = new HighlightRenderer(this.app, this.shadowManager);
		const plugin = this;
		const scrollListener = EditorView.updateListener.of((update: ViewUpdate) => {
			if (update.viewportChanged) {
				if (plugin._scrollSyncTimer) clearTimeout(plugin._scrollSyncTimer);
				plugin._scrollSyncTimer = setTimeout(() => {
					plugin.syncSidebarToViewport(update.view);
				}, 200);
			}
		});
		this.registerEditorExtension([highlightField, scrollListener]);

		this.registerView(
			COMMENTS_VIEW_TYPE,
			(leaf) => new CommentsItemView(leaf, this.shadowManager, this.settings, this.highlightRenderer, () => this.refreshView())
		);

		this.addRibbonIcon('message-square', 'Comments', () => this.activateView());

		this.addSettingTab(new CommentsSettingsTab(this.app, this));

		this.addCommand({ id: 'toggle-comments-sidebar', name: 'Toggle comments sidebar', callback: () => this.activateView() });
		this.addCommand({
			id: 'add-highlight',
			name: 'Add highlight',
			editorCallback: async (editor: any) => {
				if (!editor.getSelection()) { new Notice('Select text first'); return; }
				await this.addHighlight(editor);
			}
		});

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file.path.endsWith('.comments.json')) {
					this.shadowManager.invalidateCache(file.path);
					if (this._cacheRefreshTimer) clearTimeout(this._cacheRefreshTimer);
					this._cacheRefreshTimer = setTimeout(() => this.refreshView(), 500);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				if (file.path.endsWith('.md')) {
					await this.shadowManager.renameShadowFile(oldPath, file.path);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file) => {
				if (file.path.endsWith('.md')) {
					await this.shadowManager.deleteShadowFile(file.path);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView?.file) {
					await this.updateViewForFile(activeView.file);
					this.highlightRenderer.renderHighlightsForActiveFile();
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: any, editor: any) => {
				if (editor.getSelection?.()) {
					menu.addItem((item: any) => item.setTitle('Add highlight').setIcon('highlighter').onClick(() => this.addHighlight(editor)));
				}
			})
		);
	}

	private syncSidebarToViewport(editorView: EditorView): void {
		const { from, to } = editorView.viewport;
		const docText = editorView.state.doc.toString();
		let contentOffset = 0;
		if (docText.startsWith('---\n')) {
			const end = docText.indexOf('\n---\n', 4);
			if (end !== -1) contentOffset = end + 5;
		}
		const contentFrom = Math.max(0, from - contentOffset);
		const contentTo = Math.max(0, to - contentOffset);
		const leaves = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
		for (const leaf of leaves) {
			const commentsView = leaf.view as CommentsItemView;
			commentsView.scrollToHighlightInRange?.(contentFrom, contentTo);
		}
	}

	async onunload() {
		this.app.workspace.detachLeavesOfType(COMMENTS_VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: COMMENTS_VIEW_TYPE, active: true });
		}

		if (leaf) workspace.revealLeaf(leaf);
	}

	async updateViewForFile(file: any) {
		const leaves = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
		for (const leaf of leaves) {
			const view = leaf.view as CommentsItemView;
			await view.loadForFile(file);
		}
	}

	async refreshView() {
		const leaves = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
		for (const leaf of leaves) {
			const view = leaf.view as CommentsItemView;
			await view.refresh();
		}
	}

	async addHighlight(editor: any, color?: HighlightColor) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !(view as any).file) return;
		await this.highlightRenderer.addHighlightFromSelection(color || this.settings.defaultColor);
		await this.refreshView();
	}
}
