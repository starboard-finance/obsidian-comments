import { App, Notice, TFile } from 'obsidian';
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

		const toggleBtn = header.createEl('button', {
			text: this.settings.showResolved ? 'Hide resolved' : 'Show resolved',
			cls: 'comments-toggle-resolved-btn',
		});
		toggleBtn.addEventListener('click', async () => {
			this.settings.showResolved = !this.settings.showResolved;
			await this.render();
			this.refreshCallback();
		});

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
		} else if (resolvedHighlights.length > 0 && !this.settings.showResolved) {
			this.containerEl.createEl('p', {
				text: `${resolvedHighlights.length} resolved highlight${resolvedHighlights.length !== 1 ? 's' : ''} hidden`,
				cls: 'comments-resolved-note',
			});
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
			cls: `highlight-item highlight-color-${highlight.color}${isResolved ? ' resolved' : ''}${(highlight as any).orphaned ? ' orphaned' : ''}`,
			attr: {
				'data-highlight-id': highlight.id,
				'data-position-start': String(highlight.position?.start ?? 0),
			},
		});

		// Orphaned indicator
		if ((highlight as any).orphaned) {
			item.createEl('div', {
				text: '⚠ Anchor text not found — highlight may have moved or been deleted',
				cls: 'orphaned-indicator',
			});
		}

		const headerRow = item.createEl('div', { cls: 'highlight-header-row' });

		// Highlight text (clickable)
		const highlightText = headerRow.createEl('div', { cls: 'highlight-text' });
		highlightText.createEl('span', {
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

		if (!isResolved) {
			const resolveBtn = headerRow.createEl('button', {
				text: '✓',
				cls: 'resolve-btn-inline',
				attr: { title: 'Resolve' },
			});
			resolveBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				try {
					await this.shadowManager.setHighlightResolved(
						this.currentFile!,
						highlight.id,
						true
					);
					await this.refresh();
					this.refreshCallback();
				} catch (err) {
					new Notice('[Comments] Failed to resolve highlight. Please try again.');
					console.error('[Comments] Error resolving highlight:', err);
				}
			});
		} else {
			const unresolveBtn = headerRow.createEl('button', {
				text: '↩',
				cls: 'resolve-btn-inline',
				attr: { title: 'Unresolve' },
			});
			unresolveBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				try {
					await this.shadowManager.setHighlightResolved(
						this.currentFile!,
						highlight.id,
						false
					);
					await this.refresh();
					this.refreshCallback();
				} catch (err) {
					new Notice('[Comments] Failed to unresolve highlight. Please try again.');
					console.error('[Comments] Error unresolving highlight:', err);
				}
			});
		}

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

		const actions = item.createEl('div', { cls: 'highlight-actions' });

		// Delete highlight button
		const deleteBtn = actions.createEl('button', {
			text: '🗑',
			cls: 'action-btn delete-btn',
			attr: { title: 'Delete highlight' },
		});
		deleteBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			try {
				await this.shadowManager.deleteHighlight(this.currentFile!, highlight.id);
				await this.refresh();
				this.refreshCallback();
			} catch (err) {
				new Notice('[Comments] Failed to delete highlight. Please try again.');
				console.error('[Comments] Error deleting highlight:', err);
			}
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
		const currentUser = this.settings.username?.trim() || ('User-' + Math.random().toString(36).substring(2, 6));
		if (comment.user === currentUser) {
			const btnGroup = header.createEl('div', { cls: 'comment-btn-group' });

			const editBtn = btnGroup.createEl('button', {
				text: '✏️',
				cls: 'comment-action-btn',
				attr: { title: 'Edit' },
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showEditCommentInput(commentEl, comment);
			});

			const deleteBtn = btnGroup.createEl('button', {
				text: '🗑',
				cls: 'comment-action-btn',
				attr: { title: 'Delete' },
			});
			deleteBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				try {
					await this.shadowManager.deleteComment(this.currentFile!, comment.id);
					await this.refresh();
					this.refreshCallback();
				} catch (err) {
					new Notice('[Comments] Failed to delete comment. Please try again.');
					console.error('[Comments] Error deleting comment:', err);
				}
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
		const currentReplyUser = this.settings.username?.trim() || ('User-' + Math.random().toString(36).substring(2, 6));
		if (reply.user === currentReplyUser) {
			const btnGroup = header.createEl('div', { cls: 'comment-btn-group' });

			const editBtn = btnGroup.createEl('button', {
				text: '✏️',
				cls: 'comment-action-btn',
				attr: { title: 'Edit' },
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showEditReplyInput(replyEl.parentElement!, comment.id, reply);
			});

			const deleteBtn = btnGroup.createEl('button', {
				text: '🗑',
				cls: 'comment-action-btn',
				attr: { title: 'Delete' },
			});
			deleteBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				try {
					await this.shadowManager.deleteReply(this.currentFile!, comment.id, reply.id);
					await this.refresh();
					this.refreshCallback();
				} catch (err) {
					new Notice('[Comments] Failed to delete reply. Please try again.');
					console.error('[Comments] Error deleting reply:', err);
				}
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
		const inputRow = inputContainer.createEl('div', { cls: 'comment-input-row' });

		const input = inputRow.createEl('input', {
			cls: 'comment-input',
			attr: { type: 'text', placeholder: 'Add a comment...' },
		});

		const submitBtn = inputRow.createEl('button', {
			text: '✓',
			cls: 'comment-submit-btn',
			attr: { title: 'Submit comment' },
		});

		const submit = async () => {
			if (!input.value.trim()) return;
			const user = this.settings.username?.trim() || ('User-' + Math.random().toString(36).substring(2, 6));
			try {
				await this.shadowManager.addComment(this.currentFile!, highlight.id, user, input.value.trim());
				await this.refresh();
				this.refreshCallback();
			} catch (err) {
				new Notice('[Comments] Failed to add comment. Please try again.');
				console.error('[Comments] Error adding comment:', err);
			}
		};

		input.addEventListener('keydown', async (e) => { if (e.key === 'Enter') await submit(); });
		submitBtn.addEventListener('click', async (e) => { e.stopPropagation(); await submit(); });
		input.addEventListener('click', (e) => e.stopPropagation());
	}

	private showReplyInput(container: HTMLElement, comment: Comment): void {
		const existingInput = container.querySelector('.reply-input-container');
		if (existingInput) existingInput.remove();

		const inputContainer = container.createEl('div', { cls: 'reply-input-container' });
		const inputRow = inputContainer.createEl('div', { cls: 'reply-input-row' });

		const input = inputRow.createEl('input', {
			cls: 'reply-input',
			attr: { type: 'text', placeholder: 'Write a reply...' },
		});
		input.focus();

		const submitBtn = inputRow.createEl('button', {
			text: '✓',
			cls: 'comment-submit-btn',
			attr: { title: 'Submit reply' },
		});

		const submit = async () => {
			if (!input.value.trim()) return;
			const user = this.settings.username?.trim() || ('User-' + Math.random().toString(36).substring(2, 6));
			try {
				await this.shadowManager.addReply(
					this.currentFile!,
					comment.id,
					user,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			} catch (err) {
				new Notice('[Comments] Failed to add reply. Please try again.');
				console.error('[Comments] Error adding reply:', err);
			}
		};

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') await submit();
			else if (e.key === 'Escape') inputContainer.remove();
		});
		submitBtn.addEventListener('click', async (e) => { e.stopPropagation(); await submit(); });
		input.addEventListener('click', (e) => e.stopPropagation());
	}

	private showEditCommentInput(
		container: HTMLElement,
		comment: { id: string; content: string }
	): void {
		const existingInput = container.querySelector('.edit-input-container');
		if (existingInput) existingInput.remove();

		const inputContainer = container.createEl('div', { cls: 'edit-input-container' });
		const inputRow = inputContainer.createEl('div', { cls: 'edit-input-row' });

		const input = inputRow.createEl('input', {
			cls: 'edit-input',
			attr: { type: 'text', value: comment.content },
		});
		input.focus();
		input.select();

		const submitBtn = inputRow.createEl('button', {
			text: '✓',
			cls: 'comment-submit-btn',
			attr: { title: 'Save edit' },
		});

		const submit = async () => {
			if (!input.value.trim()) return;
			try {
				await this.shadowManager.editComment(
					this.currentFile!,
					comment.id,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			} catch (err) {
				new Notice('[Comments] Failed to save edit. Please try again.');
				console.error('[Comments] Error editing comment:', err);
			}
		};

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') await submit();
			else if (e.key === 'Escape') inputContainer.remove();
		});
		submitBtn.addEventListener('click', async (e) => { e.stopPropagation(); await submit(); });
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
		const inputRow = inputContainer.createEl('div', { cls: 'edit-input-row' });

		const input = inputRow.createEl('input', {
			cls: 'edit-input',
			attr: { type: 'text', value: reply.content },
		});
		input.focus();
		input.select();

		const submitBtn = inputRow.createEl('button', {
			text: '✓',
			cls: 'comment-submit-btn',
			attr: { title: 'Save edit' },
		});

		const submit = async () => {
			if (!input.value.trim()) return;
			try {
				await this.shadowManager.editReply(
					this.currentFile!,
					commentId,
					reply.id,
					input.value.trim()
				);
				await this.refresh();
				this.refreshCallback();
			} catch (err) {
				new Notice('[Comments] Failed to save edit. Please try again.');
				console.error('[Comments] Error editing reply:', err);
			}
		};

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') await submit();
			else if (e.key === 'Escape') inputContainer.remove();
		});
		submitBtn.addEventListener('click', async (e) => { e.stopPropagation(); await submit(); });
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

	focusHighlightInput(highlightId: string): void {
		const item = this.containerEl.querySelector(`[data-highlight-id="${highlightId}"]`);
		if (item) {
			item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			const input = item.querySelector('.comment-input') as HTMLInputElement;
			if (input) setTimeout(() => input.focus(), 100);
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
