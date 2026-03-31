import { App, TFile } from 'obsidian';
import { ShadowFileManager } from './shadow-file-manager';
import { CommentsFile, Highlight, Comment, PluginSettings, COLOR_HEX } from './types';

export class CommentsSidebarView {
	app: App;
	shadowManager: ShadowFileManager;
	settings: PluginSettings;
	private containerEl: HTMLElement;
	private currentFile: TFile | null = null;
	private refreshCallback: () => void;
	private onHighlightClick: (highlight: Highlight) => void;

	constructor(
		app: App,
		shadowManager: ShadowFileManager,
		settings: PluginSettings,
		containerEl: HTMLElement,
		refreshCallback: () => void,
		onHighlightClick: (highlight: Highlight) => void
	) {
		this.app = app;
		this.shadowManager = shadowManager;
		this.settings = settings;
		this.containerEl = containerEl;
		this.refreshCallback = refreshCallback;
		this.onHighlightClick = onHighlightClick;
	}

	async loadForFile(file: TFile): Promise<void> {
		this.currentFile = file;
		await this.render();
	}

	async refresh(): Promise<void> {
		if (this.currentFile) {
			await this.render();
		}
	}

	private async render(): Promise<void> {
		if (!this.currentFile) {
			this.containerEl.empty();
			this.containerEl.createEl('p', {
				text: 'No note open',
				cls: 'comments-empty-state',
			});
			return;
		}

		const data = await this.shadowManager.readShadowFile(this.currentFile);

		this.containerEl.empty();

		// Header
		const header = this.containerEl.createEl('div', { cls: 'comments-header' });
		header.createEl('h3', { text: 'Comments' });

		// Filter resolved
		const unresolvedHighlights = data.highlights.filter((h) => !h.resolved);
		const resolvedHighlights = data.highlights.filter((h) => h.resolved);

		if (data.highlights.length === 0) {
			this.containerEl.createEl('p', {
				text: 'No highlights yet. Select text and use "Add highlight" command.',
				cls: 'comments-empty-state',
			});
			return;
		}

		// Unresolved section
		if (unresolvedHighlights.length > 0) {
			this.renderHighlightsSection('Highlights', unresolvedHighlights, data, false);
		}

		// Resolved section
		if (resolvedHighlights.length > 0 && this.settings.showResolved) {
			this.renderHighlightsSection(
				`Resolved (${resolvedHighlights.length})`,
				resolvedHighlights,
				data,
				true
			);
		}
	}

	private renderHighlightsSection(
		title: string,
		highlights: Highlight[],
		data: CommentsFile,
		isResolved: boolean
	): void {
		const section = this.containerEl.createEl('div', { cls: 'comments-section' });

		const header = section.createEl('div', {
			cls: `comments-section-header${isResolved ? ' resolved' : ''}`,
		});
		header.createEl('span', { text: title });

		const list = section.createEl('div', { cls: 'comments-list' });

		for (const highlight of highlights) {
			this.renderHighlightItem(list, highlight, data, isResolved);
		}
	}

	private renderHighlightItem(
		container: HTMLElement,
		highlight: Highlight,
		data: CommentsFile,
		isResolved: boolean
	): void {
		const comments = data.comments.filter((c) => c.highlightId === highlight.id);

		const item = container.createEl('div', {
			cls: `highlight-item highlight-color-${highlight.color}${isResolved ? ' resolved' : ''}`,
			attr: {
				'data-highlight-id': highlight.id,
				'data-position-start': String(highlight.position?.start ?? 0),
			},
		});

		// Highlight text (clickable)
		const highlightText = item.createEl('div', { cls: 'highlight-text' });
		const highlightLabel = highlightText.createEl('span', {
			text: '≡ ',
			cls: 'highlight-indicator',
			attr: { style: `color: ${COLOR_HEX[highlight.color]}` },
		});
		highlightText.createEl('span', {
			text: this.truncateText(highlight.text, 80),
			cls: 'highlight-quote',
		});

		highlightText.addEventListener('click', () => {
			this.onHighlightClick(highlight);
		});

		// Comments
		if (comments.length > 0 || !isResolved) {
			const commentsContainer = item.createEl('div', { cls: 'highlight-comments' });

			for (const comment of comments) {
				this.renderComment(commentsContainer, highlight, comment);
			}

			// Add comment input (only if not resolved)
			if (!isResolved) {
				this.renderCommentInput(commentsContainer, highlight);
			}
		}

		// Actions
		const actions = item.createEl('div', { cls: 'highlight-actions' });

		// Resolve button
		if (!isResolved) {
			const resolveBtn = actions.createEl('button', {
				text: '✓',
				cls: 'action-btn resolve-btn',
				attr: { title: 'Resolve' },
			});
			resolveBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				await this.shadowManager.setHighlightResolved(
					this.currentFile!,
					highlight.id,
					true
				);
				await this.refresh();
				this.refreshCallback();
			});
		}

		// Delete highlight button
		const deleteBtn = actions.createEl('button', {
			text: '🗑',
			cls: 'action-btn delete-btn',
			attr: { title: 'Delete highlight' },
		});
		deleteBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			await this.shadowManager.deleteHighlight(this.currentFile!, highlight.id);
			await this.refresh();
			this.refreshCallback();
		});
	}

	private renderComment(
		container: HTMLElement,
		highlight: Highlight,
		comment: Comment
	): void {
		const commentEl = container.createEl('div', { cls: 'comment-item' });

		// Comment header
		const header = commentEl.createEl('div', { cls: 'comment-header' });
		header.createEl('span', {
			text: `👤 ${comment.user} · ${this.formatTime(comment.createdAt)}`,
			cls: 'comment-meta',
		});

		// Edit/Delete buttons (only for own comments)
		if (comment.user === this.settings.username) {
			const editBtn = header.createEl('button', {
				text: '✏️',
				cls: 'comment-action-btn',
				attr: { title: 'Edit' },
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showEditCommentInput(commentEl, comment);
			});

			const deleteBtn = header.createEl('button', {
				text: '🗑',
				cls: 'comment-action-btn',
				attr: { title: 'Delete' },
			});
			deleteBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				await this.shadowManager.deleteComment(this.currentFile!, comment.id);
				await this.refresh();
				this.refreshCallback();
			});
		}

		// Comment content
		const content = commentEl.createEl('div', { cls: 'comment-content' });
		if (comment.editedAt) {
			content.createEl('p', {
				text: `${comment.content} (edited)`,
				cls: 'comment-text',
			});
		} else {
			content.createEl('p', { text: comment.content, cls: 'comment-text' });
		}

		// Replies
		for (const reply of comment.replies) {
			this.renderReply(commentEl, comment, reply);
		}

		// Reply button
		const replyBtn = container.createEl('button', {
			text: '+ Reply',
			cls: 'reply-btn',
		});
		replyBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showReplyInput(commentEl, comment);
		});
	}

	private renderReply(
		container: HTMLElement,
		comment: Comment,
		reply: { id: string; user: string; content: string; createdAt: number; editedAt: number | null }
	): void {
		const replyEl = container.createEl('div', { cls: 'reply-item' });

		const header = replyEl.createEl('div', { cls: 'reply-header' });
		header.createEl('span', {
			text: `  └─ 👤 ${reply.user} · ${this.formatTime(reply.createdAt)}`,
			cls: 'reply-meta',
		});

		// Edit/Delete buttons
		if (reply.user === this.settings.username) {
			const editBtn = header.createEl('button', {
				text: '✏️',
				cls: 'comment-action-btn',
				attr: { title: 'Edit' },
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showEditReplyInput(replyEl.parentElement!, comment.id, reply);
			});

			const deleteBtn = header.createEl('button', {
				text: '🗑',
				cls: 'comment-action-btn',
				attr: { title: 'Delete' },
			});
			deleteBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				await this.shadowManager.deleteReply(this.currentFile!, comment.id, reply.id);
				await this.refresh();
				this.refreshCallback();
			});
		}

		const content = replyEl.createEl('div', { cls: 'reply-content' });
		if (reply.editedAt) {
			content.createEl('p', {
				text: reply.content,
				cls: 'reply-text edited',
			});
		} else {
			content.createEl('p', { text: reply.content, cls: 'reply-text' });
		}
	}

	private renderCommentInput(container: HTMLElement, highlight: Highlight): void {
		const inputContainer = container.createEl('div', { cls: 'comment-input-container' });

		const input = inputContainer.createEl('input', {
			cls: 'comment-input',
			attr: { type: 'text', placeholder: 'Add a comment...' },
		});

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter' && input.value.trim()) {
				await this.shadowManager.addComment(
					this.currentFile!,
					highlight.id,
					this.settings.username,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			}
		});

		input.addEventListener('click', (e) => e.stopPropagation());
	}

	private showReplyInput(container: HTMLElement, comment: Comment): void {
		// Remove existing input if any
		const existingInput = container.querySelector('.reply-input-container');
		if (existingInput) existingInput.remove();

		const inputContainer = container.createEl('div', { cls: 'reply-input-container' });

		const input = inputContainer.createEl('input', {
			cls: 'reply-input',
			attr: { type: 'text', placeholder: 'Write a reply...' },
		});
		input.focus();

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter' && input.value.trim()) {
				await this.shadowManager.addReply(
					this.currentFile!,
					comment.id,
					this.settings.username,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			} else if (e.key === 'Escape') {
				inputContainer.remove();
			}
		});

		input.addEventListener('click', (e) => e.stopPropagation());
	}

	private showEditCommentInput(
		container: HTMLElement,
		comment: { id: string; content: string }
	): void {
		const existingInput = container.querySelector('.edit-input-container');
		if (existingInput) existingInput.remove();

		const inputContainer = container.createEl('div', { cls: 'edit-input-container' });

		const input = inputContainer.createEl('input', {
			cls: 'edit-input',
			attr: { type: 'text', value: comment.content },
		});
		input.focus();
		input.select();

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter' && input.value.trim()) {
				await this.shadowManager.editComment(
					this.currentFile!,
					comment.id,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			} else if (e.key === 'Escape') {
				inputContainer.remove();
			}
		});

		input.addEventListener('click', (e) => e.stopPropagation());
	}

	private showEditReplyInput(
		container: HTMLElement,
		commentId: string,
		reply: { id: string; content: string }
	): void {
		const existingInput = container.querySelector('.edit-input-container');
		if (existingInput) existingInput.remove();

		const inputContainer = container.createEl('div', { cls: 'edit-input-container' });

		const input = inputContainer.createEl('input', {
			cls: 'edit-input',
			attr: { type: 'text', value: reply.content },
		});
		input.focus();
		input.select();

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter' && input.value.trim()) {
				await this.shadowManager.editReply(
					this.currentFile!,
					commentId,
					reply.id,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			} else if (e.key === 'Escape') {
				inputContainer.remove();
			}
		});

		input.addEventListener('click', (e) => e.stopPropagation());
	}

	scrollToHighlightInRange(from: number, to: number): void {
		const items = this.containerEl.querySelectorAll('[data-position-start]');
		for (const item of items) {
			const posStart = parseInt((item as HTMLElement).dataset.positionStart || '0');
			if (posStart >= from && posStart <= to) {
				item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				break;
			}
		}
	}

	private truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	private formatTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return new Date(timestamp).toLocaleDateString();
	}
}
