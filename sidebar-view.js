"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentsSidebarView = void 0;
const types_1 = require("./types");
class CommentsSidebarView {
    constructor(app, shadowManager, settings, containerEl, refreshCallback, onHighlightClick) {
        this.currentFile = null;
        this.app = app;
        this.shadowManager = shadowManager;
        this.settings = settings;
        this.containerEl = containerEl;
        this.refreshCallback = refreshCallback;
        this.onHighlightClick = onHighlightClick;
    }
    async loadForFile(file) {
        this.currentFile = file;
        await this.render();
    }
    async refresh() {
        if (this.currentFile) {
            await this.render();
        }
    }
    async render() {
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
            this.renderHighlightsSection(`Resolved (${resolvedHighlights.length})`, resolvedHighlights, data, true);
        }
    }
    renderHighlightsSection(title, highlights, data, isResolved) {
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
    renderHighlightItem(container, highlight, data, isResolved) {
        const comments = data.comments.filter((c) => c.highlightId === highlight.id);
        const item = container.createEl('div', {
            cls: `highlight-item highlight-color-${highlight.color}${isResolved ? ' resolved' : ''}`,
        });
        // Highlight text (clickable)
        const highlightText = item.createEl('div', { cls: 'highlight-text' });
        const highlightLabel = highlightText.createEl('span', {
            text: '≡ ',
            cls: 'highlight-indicator',
            attr: { style: `color: ${types_1.COLOR_HEX[highlight.color]}` },
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
                await this.shadowManager.setHighlightResolved(this.currentFile, highlight.id, true);
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
            await this.shadowManager.deleteHighlight(this.currentFile, highlight.id);
            await this.refresh();
            this.refreshCallback();
        });
    }
    renderComment(container, highlight, comment) {
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
                await this.shadowManager.deleteComment(this.currentFile, comment.id);
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
        }
        else {
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
    renderReply(container, comment, reply) {
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
                this.showEditReplyInput(replyEl.parentElement, comment.id, reply);
            });
            const deleteBtn = header.createEl('button', {
                text: '🗑',
                cls: 'comment-action-btn',
                attr: { title: 'Delete' },
            });
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.shadowManager.deleteReply(this.currentFile, comment.id, reply.id);
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
        }
        else {
            content.createEl('p', { text: reply.content, cls: 'reply-text' });
        }
    }
    renderCommentInput(container, highlight) {
        const inputContainer = container.createEl('div', { cls: 'comment-input-container' });
        const input = inputContainer.createEl('input', {
            cls: 'comment-input',
            attr: { type: 'text', placeholder: 'Add a comment...' },
        });
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                await this.shadowManager.addComment(this.currentFile, highlight.id, this.settings.username, input.value.trim());
                await this.refresh();
                this.refreshCallback();
            }
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    }
    showReplyInput(container, comment) {
        // Remove existing input if any
        const existingInput = container.querySelector('.reply-input-container');
        if (existingInput)
            existingInput.remove();
        const inputContainer = container.createEl('div', { cls: 'reply-input-container' });
        const input = inputContainer.createEl('input', {
            cls: 'reply-input',
            attr: { type: 'text', placeholder: 'Write a reply...' },
        });
        input.focus();
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                await this.shadowManager.addReply(this.currentFile, comment.id, this.settings.username, input.value.trim());
                await this.refresh();
                this.refreshCallback();
            }
            else if (e.key === 'Escape') {
                inputContainer.remove();
            }
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    }
    showEditCommentInput(container, comment) {
        const existingInput = container.querySelector('.edit-input-container');
        if (existingInput)
            existingInput.remove();
        const inputContainer = container.createEl('div', { cls: 'edit-input-container' });
        const input = inputContainer.createEl('input', {
            cls: 'edit-input',
            attr: { type: 'text', value: comment.content },
        });
        input.focus();
        input.select();
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                await this.shadowManager.editComment(this.currentFile, comment.id, input.value.trim());
                await this.refresh();
                this.refreshCallback();
            }
            else if (e.key === 'Escape') {
                inputContainer.remove();
            }
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    }
    showEditReplyInput(container, commentId, reply) {
        const existingInput = container.querySelector('.edit-input-container');
        if (existingInput)
            existingInput.remove();
        const inputContainer = container.createEl('div', { cls: 'edit-input-container' });
        const input = inputContainer.createEl('input', {
            cls: 'edit-input',
            attr: { type: 'text', value: reply.content },
        });
        input.focus();
        input.select();
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                await this.shadowManager.editReply(this.currentFile, commentId, reply.id, input.value.trim());
                await this.refresh();
                this.refreshCallback();
            }
            else if (e.key === 'Escape') {
                inputContainer.remove();
            }
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + '...';
    }
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1)
            return 'Just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        if (hours < 24)
            return `${hours}h ago`;
        if (days < 7)
            return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }
}
exports.CommentsSidebarView = CommentsSidebarView;
