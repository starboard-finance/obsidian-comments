"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowFileManager = void 0;
const obsidian_1 = require("obsidian");
const types_1 = require("./types");
class ShadowFileManager {
    constructor(app) {
        this.cache = new Map();
        this.app = app;
    }
    /**
     * Get the shadow file path for a given markdown file
     */
    getShadowPath(file) {
        const basePath = file.path;
        // Convert note.md to note.comments.json
        return basePath.replace(/\.md$/, '.comments.json');
    }
    /**
     * Read the shadow file for a given markdown file
     */
    async readShadowFile(file) {
        const shadowPath = this.getShadowPath(file);
        // Check cache first
        if (this.cache.has(shadowPath)) {
            return this.cache.get(shadowPath);
        }
        try {
            const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
            if (shadowFile instanceof obsidian_1.TFile && shadowFile.extension === 'json') {
                const content = await this.app.vault.read(shadowFile);
                const data = JSON.parse(content);
                this.cache.set(shadowPath, data);
                return data;
            }
        }
        catch (e) {
            // File doesn't exist or is invalid, return empty
        }
        // Return empty structure
        const empty = { highlights: [], comments: [] };
        this.cache.set(shadowPath, empty);
        return empty;
    }
    /**
     * Write the shadow file for a given markdown file
     */
    async writeShadowFile(file, data) {
        const shadowPath = this.getShadowPath(file);
        const content = JSON.stringify(data, null, 2);
        try {
            const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
            if (shadowFile instanceof obsidian_1.TFile) {
                await this.app.vault.modify(shadowFile, content);
            }
            else {
                // Create new file
                await this.app.vault.create(shadowPath, content);
            }
            this.cache.set(shadowPath, data);
        }
        catch (e) {
            console.error('Failed to write shadow file:', e);
        }
    }
    /**
     * Create a new highlight
     */
    async createHighlight(file, line, startOffset, endOffset, text, color) {
        const data = await this.readShadowFile(file);
        const highlight = {
            id: (0, types_1.generateId)(),
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
    async updateHighlightColor(file, highlightId, color) {
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
    async deleteHighlight(file, highlightId) {
        const data = await this.readShadowFile(file);
        data.highlights = data.highlights.filter((h) => h.id !== highlightId);
        data.comments = data.comments.filter((c) => c.highlightId !== highlightId);
        await this.writeShadowFile(file, data);
    }
    /**
     * Resolve or unresolve a highlight
     */
    async setHighlightResolved(file, highlightId, resolved) {
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
    async addComment(file, highlightId, user, content) {
        const data = await this.readShadowFile(file);
        const comment = {
            id: (0, types_1.generateId)(),
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
    async editComment(file, commentId, content) {
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
    async deleteComment(file, commentId) {
        const data = await this.readShadowFile(file);
        data.comments = data.comments.filter((c) => c.id !== commentId);
        await this.writeShadowFile(file, data);
    }
    /**
     * Add a reply to a comment
     */
    async addReply(file, commentId, user, content) {
        const data = await this.readShadowFile(file);
        const comment = data.comments.find((c) => c.id === commentId);
        if (comment) {
            const reply = {
                id: (0, types_1.generateId)(),
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
    async editReply(file, commentId, replyId, content) {
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
    async deleteReply(file, commentId, replyId) {
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
    async getCommentsForHighlight(file, highlightId) {
        const data = await this.readShadowFile(file);
        return data.comments.filter((c) => c.highlightId === highlightId);
    }
    /**
     * Invalidate cache for a file
     */
    invalidateCache(filePath) {
        this.cache.delete(filePath);
    }
    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
    }
}
exports.ShadowFileManager = ShadowFileManager;
