import { App, TFile } from 'obsidian';
import {
	CommentsFile,
	Highlight,
	HighlightV1,
	Comment,
	Reply,
	generateId,
	HighlightColor,
} from './types';

export function migrateV1ToV2(data: any): CommentsFile {
	const highlights = (data.highlights || []).map((h: HighlightV1) => ({
		id: h.id,
		startLine: h.line,
		endLine: h.line,
		startOffset: h.startOffset,
		endOffset: h.endOffset,
		anchor: {
			exact: h.text || '',
			prefix: '',
			suffix: '',
		},
		position: {
			start: 0,
			end: 0,
		},
		text: h.text || '',
		color: h.color,
		createdAt: h.createdAt,
		resolved: h.resolved || false,
	}));
	return {
		version: '2.0',
		highlights,
		comments: data.comments || [],
	};
}

export class ShadowFileManager {
	private app: App;
	private cache: Map<string, CommentsFile> = new Map();

	constructor(app: App) {
		this.app = app;
	}

	private getShadowPath(file: TFile): string {
		const basePath = file.path;
		return basePath.replace(/\.md$/, '.comments.json');
	}

	async readShadowFile(file: TFile): Promise<CommentsFile> {
		const shadowPath = this.getShadowPath(file);

		if (this.cache.has(shadowPath)) {
			return this.cache.get(shadowPath)!;
		}

		try {
			const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
			if (shadowFile instanceof TFile && shadowFile.extension === 'json') {
				const content = await this.app.vault.read(shadowFile);
				const rawData = JSON.parse(content);

				let data: CommentsFile;
				if (!rawData.version || rawData.version === '1.0') {
					data = migrateV1ToV2(rawData);
					await this.writeShadowFile(file, data);
				} else {
					data = rawData as CommentsFile;
				}

				this.cache.set(shadowPath, data);
				return data;
			}
		} catch (e) {
			// File doesn't exist or is invalid, return empty
		}

		const empty: CommentsFile = { version: '2.0', highlights: [], comments: [] };
		this.cache.set(shadowPath, empty);
		return empty;
	}

	async writeShadowFile(file: TFile, data: CommentsFile): Promise<void> {
		const shadowPath = this.getShadowPath(file);
		const content = JSON.stringify(data, null, 2);

		try {
			const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
			if (shadowFile instanceof TFile) {
				await this.app.vault.modify(shadowFile, content);
			} else {
				await this.app.vault.create(shadowPath, content);
			}
			this.cache.set(shadowPath, data);
		} catch (e) {
			console.error('Failed to write shadow file:', e);
		}
	}

	async createHighlight(
		file: TFile,
		highlightInput: {
			startLine: number;
			endLine: number;
			startOffset: number;
			endOffset: number;
			text: string;
			color: HighlightColor;
			positionStart: number;
			positionEnd: number;
			anchorPrefix: string;
			anchorSuffix: string;
		}
	): Promise<Highlight> {
		const data = await this.readShadowFile(file);
		const highlight: Highlight = {
			id: generateId(),
			startLine: highlightInput.startLine,
			endLine: highlightInput.endLine,
			startOffset: highlightInput.startOffset,
			endOffset: highlightInput.endOffset,
			anchor: {
				exact: highlightInput.text,
				prefix: highlightInput.anchorPrefix,
				suffix: highlightInput.anchorSuffix,
			},
			position: {
				start: highlightInput.positionStart,
				end: highlightInput.positionEnd,
			},
			text: highlightInput.text,
			color: highlightInput.color,
			createdAt: Date.now(),
			resolved: false,
		};
		data.highlights.push(highlight);
		await this.writeShadowFile(file, data);
		return highlight;
	}

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

	async deleteHighlight(file: TFile, highlightId: string): Promise<void> {
		const data = await this.readShadowFile(file);
		data.highlights = data.highlights.filter((h) => h.id !== highlightId);
		data.comments = data.comments.filter((c) => c.highlightId !== highlightId);
		await this.writeShadowFile(file, data);
	}

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

	async deleteComment(file: TFile, commentId: string): Promise<void> {
		const data = await this.readShadowFile(file);
		data.comments = data.comments.filter((c) => c.id !== commentId);
		await this.writeShadowFile(file, data);
	}

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

	async getCommentsForHighlight(
		file: TFile,
		highlightId: string
	): Promise<Comment[]> {
		const data = await this.readShadowFile(file);
		return data.comments.filter((c) => c.highlightId === highlightId);
	}

	invalidateCache(filePath: string): void {
		this.cache.delete(filePath);
	}

	clearCache(): void {
		this.cache.clear();
	}
}
