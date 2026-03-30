import { App, TFile } from 'obsidian';
import {
	CommentsFile,
	Highlight,
	Comment,
	Reply,
	generateId,
	HighlightColor,
} from './types';

export class ShadowFileManager {
	private app: App;
	private cache: Map<string, CommentsFile> = new Map();

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get the shadow file path for a given markdown file
	 */
	private getShadowPath(file: TFile): string {
		const basePath = file.path;
		// Convert note.md to note.comments.json
		return basePath.replace(/\.md$/, '.comments.json');
	}

	/**
	 * Read the shadow file for a given markdown file
	 */
	async readShadowFile(file: TFile): Promise<CommentsFile> {
		const shadowPath = this.getShadowPath(file);

		// Check cache first
		if (this.cache.has(shadowPath)) {
			return this.cache.get(shadowPath)!;
		}

		try {
			const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
			if (shadowFile instanceof TFile && shadowFile.extension === 'json') {
				const content = await this.app.vault.read(shadowFile);
				const data = JSON.parse(content) as CommentsFile;
				this.cache.set(shadowPath, data);
				return data;
			}
		} catch (e) {
			// File doesn't exist or is invalid, return empty
		}

		// Return empty structure
		const empty: CommentsFile = { highlights: [], comments: [] };
		this.cache.set(shadowPath, empty);
		return empty;
	}

	/**
	 * Write the shadow file for a given markdown file
	 */
	async writeShadowFile(file: TFile, data: CommentsFile): Promise<void> {
		const shadowPath = this.getShadowPath(file);
		const content = JSON.stringify(data, null, 2);

		try {
			const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
			if (shadowFile instanceof TFile) {
				await this.app.vault.modify(shadowFile, content);
			} else {
				// Create new file
				await this.app.vault.create(shadowPath, content);
			}
			this.cache.set(shadowPath, data);
		} catch (e) {
			console.error('Failed to write shadow file:', e);
		}
	}

	/**
	 * Create a new highlight
	 */
	async createHighlight(
		file: TFile,
		line: number,
		startOffset: number,
		endOffset: number,
		text: string,
		color: HighlightColor
	): Promise<Highlight> {
		const data = await this.readShadowFile(file);
		const highlight: Highlight = {
			id: generateId(),
			line,
			startOffset,
			endOffset,
			text,
			color,
			createdAt: Date.now(),
			resolved: false,
		};
		data.highlights.push(highlight);
		await this.writeShadowFile(file, data);
		return highlight;
	}

	/**
	 * Update a highlight's color
	 */
	async updateHighlightColor(
		file: TFile,
		highlightId: string,
		color: HighlightColor
	): Promise<void> {
		const data = await this.readShadowFile(file);
		const highlight = data.highlights.find((h) => h.id === highlightId);
		if (highlight) {
			highlight.color = color;
			await this.writeShadowFile(file, data);
		}
	}

	/**
	 * Delete a highlight and its comments
	 */
	async deleteHighlight(file: TFile, highlightId: string): Promise<void> {
		const data = await this.readShadowFile(file);
		data.highlights = data.highlights.filter((h) => h.id !== highlightId);
		data.comments = data.comments.filter((c) => c.highlightId !== highlightId);
		await this.writeShadowFile(file, data);
	}

	/**
	 * Resolve or unresolve a highlight
	 */
	async setHighlightResolved(
		file: TFile,
		highlightId: string,
		resolved: boolean
	): Promise<void> {
		const data = await this.readShadowFile(file);
		const highlight = data.highlights.find((h) => h.id === highlightId);
		if (highlight) {
			highlight.resolved = resolved;
			await this.writeShadowFile(file, data);
		}
	}

	/**
	 * Add a comment to a highlight
	 */
	async addComment(
		file: TFile,
		highlightId: string,
		user: string,
		content: string
	): Promise<Comment> {
		const data = await this.readShadowFile(file);
		const comment: Comment = {
			id: generateId(),
			highlightId,
			user,
			content,
			createdAt: Date.now(),
			editedAt: null,
			replies: [],
		};
		data.comments.push(comment);
		await this.writeShadowFile(file, data);
		return comment;
	}

	/**
	 * Edit a comment
	 */
	async editComment(
		file: TFile,
		commentId: string,
		content: string
	): Promise<void> {
		const data = await this.readShadowFile(file);
		const comment = data.comments.find((c) => c.id === commentId);
		if (comment) {
			comment.content = content;
			comment.editedAt = Date.now();
			await this.writeShadowFile(file, data);
		}
	}

	/**
	 * Delete a comment (and all its replies)
	 */
	async deleteComment(file: TFile, commentId: string): Promise<void> {
		const data = await this.readShadowFile(file);
		data.comments = data.comments.filter((c) => c.id !== commentId);
		await this.writeShadowFile(file, data);
	}

	/**
	 * Add a reply to a comment
	 */
	async addReply(
		file: TFile,
		commentId: string,
		user: string,
		content: string
	): Promise<Reply | null> {
		const data = await this.readShadowFile(file);
		const comment = data.comments.find((c) => c.id === commentId);
		if (comment) {
			const reply: Reply = {
				id: generateId(),
				user,
				content,
				createdAt: Date.now(),
				editedAt: null,
			};
			comment.replies.push(reply);
			await this.writeShadowFile(file, data);
			return reply;
		}
		return null;
	}

	/**
	 * Edit a reply
	 */
	async editReply(
		file: TFile,
		commentId: string,
		replyId: string,
		content: string
	): Promise<void> {
		const data = await this.readShadowFile(file);
		const comment = data.comments.find((c) => c.id === commentId);
		if (comment) {
			const reply = comment.replies.find((r) => r.id === replyId);
			if (reply) {
				reply.content = content;
				reply.editedAt = Date.now();
				await this.writeShadowFile(file, data);
			}
		}
	}

	/**
	 * Delete a reply
	 */
	async deleteReply(
		file: TFile,
		commentId: string,
		replyId: string
	): Promise<void> {
		const data = await this.readShadowFile(file);
		const comment = data.comments.find((c) => c.id === commentId);
		if (comment) {
			comment.replies = comment.replies.filter((r) => r.id !== replyId);
			await this.writeShadowFile(file, data);
		}
	}

	/**
	 * Get comments for a specific highlight
	 */
	async getCommentsForHighlight(
		file: TFile,
		highlightId: string
	): Promise<Comment[]> {
		const data = await this.readShadowFile(file);
		return data.comments.filter((c) => c.highlightId === highlightId);
	}

	/**
	 * Invalidate cache for a file
	 */
	invalidateCache(filePath: string): void {
		this.cache.delete(filePath);
	}

	/**
	 * Clear all cache
	 */
	clearCache(): void {
		this.cache.clear();
	}
}
