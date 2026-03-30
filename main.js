"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CommentsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var CommentsSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const settings = this.plugin.settings;
    new import_obsidian.Setting(containerEl).setName("Username").setDesc("Your name for comment attribution").addText(
      (text) => text.setPlaceholder("Enter your name").setValue(settings.username).onChange(async (value) => {
        settings.username = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Default highlight color").setDesc("Color for new highlights").addDropdown((dropdown) => {
      const colors = ["yellow", "red", "teal", "blue", "green"];
      colors.forEach((color) => {
        dropdown.addOption(color, this.capitalizeFirst(color));
      });
      dropdown.setValue(settings.defaultColor);
      dropdown.onChange(async (value) => {
        settings.defaultColor = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Show resolved comments").setDesc("Display resolved comments in the sidebar").addToggle((toggle) => {
      toggle.setValue(settings.showResolved);
      toggle.onChange(async (value) => {
        settings.showResolved = value;
        await this.plugin.saveSettings();
        this.plugin.refreshSidebar?.();
      });
    });
  }
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

// src/shadow-file-manager.ts
var import_obsidian2 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  username: "",
  defaultColor: "yellow",
  showResolved: false
};
var COLOR_HEX = {
  yellow: "#ffd700",
  red: "#ff6b6b",
  teal: "#4ecdc4",
  blue: "#45b7d1",
  green: "#96ceb4"
};
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// src/shadow-file-manager.ts
var ShadowFileManager = class {
  constructor(app) {
    this.cache = /* @__PURE__ */ new Map();
    this.app = app;
  }
  /**
   * Get the shadow file path for a given markdown file
   */
  getShadowPath(file) {
    const basePath = file.path;
    return basePath.replace(/\.md$/, ".comments.json");
  }
  /**
   * Read the shadow file for a given markdown file
   */
  async readShadowFile(file) {
    const shadowPath = this.getShadowPath(file);
    if (this.cache.has(shadowPath)) {
      return this.cache.get(shadowPath);
    }
    try {
      const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
      if (shadowFile instanceof import_obsidian2.TFile && shadowFile.extension === "json") {
        const content = await this.app.vault.read(shadowFile);
        const data = JSON.parse(content);
        this.cache.set(shadowPath, data);
        return data;
      }
    } catch (e) {
    }
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
      if (shadowFile instanceof import_obsidian2.TFile) {
        await this.app.vault.modify(shadowFile, content);
      } else {
        await this.app.vault.create(shadowPath, content);
      }
      this.cache.set(shadowPath, data);
    } catch (e) {
      console.error("Failed to write shadow file:", e);
    }
  }
  /**
   * Create a new highlight
   */
  async createHighlight(file, line, startOffset, endOffset, text, color) {
    const data = await this.readShadowFile(file);
    const highlight = {
      id: generateId(),
      line,
      startOffset,
      endOffset,
      text,
      color,
      createdAt: Date.now(),
      resolved: false
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
      id: generateId(),
      highlightId,
      user,
      content,
      createdAt: Date.now(),
      editedAt: null,
      replies: []
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
        id: generateId(),
        user,
        content,
        createdAt: Date.now(),
        editedAt: null
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
};

// src/highlight-renderer.ts
var import_obsidian3 = require("obsidian");
var HighlightRenderer = class {
  constructor(app, shadowManager) {
    this.activeHighlights = /* @__PURE__ */ new Map();
    this.app = app;
    this.shadowManager = shadowManager;
  }
  /**
   * Render highlights for the currently active file
   */
  async renderHighlightsForActiveFile() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view) return;
    const file = view.file;
    if (!file) return;
    this.clearDecorations();
    const data = await this.shadowManager.readShadowFile(file);
    for (const highlight of data.highlights) {
      this.addHighlightDecoration(view, highlight);
    }
  }
  /**
   * Add a highlight decoration to the editor
   */
  addHighlightDecoration(view, highlight) {
    const editor = view.editor;
    const line = highlight.line;
    const start = highlight.startOffset;
    const end = highlight.endOffset;
    const from = { ch: start, line };
    const to = { ch: end, line };
    this.activeHighlights.set(highlight.id, { from, to });
    editor.markText?.(from, to, {
      className: "obsidian-comments-highlight",
      attributes: {
        "data-highlight-id": highlight.id,
        "data-highlight-color": highlight.color,
        style: `background-color: ${COLOR_HEX[highlight.color]}40; border-bottom: 2px solid ${COLOR_HEX[highlight.color]};`
      }
    });
  }
  /**
   * Clear all active decorations
   */
  clearDecorations() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view) return;
    const editor = view.editor;
    const doc = editor.getDoc?.() || editor;
    const marks = doc.getAllMarks?.() || [];
    for (const mark of marks) {
      if (mark.className === "obsidian-comments-highlight") {
        mark.clear?.();
      }
    }
    this.activeHighlights.clear();
  }
  /**
   * Navigate to a highlight's position in the editor
   */
  navigateToHighlight(highlight) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view) return;
    const editor = view.editor;
    editor.scrollTo?.(highlight.line, 0);
    editor.setSelection?.(
      { ch: highlight.startOffset, line: highlight.line },
      { ch: highlight.endOffset, line: highlight.line }
    );
  }
  /**
   * Add a new highlight from selection
   */
  async addHighlightFromSelection(color) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view) return null;
    const file = view.file;
    if (!file) return null;
    const editor = view.editor;
    const selection = editor.getSelection?.();
    if (!selection) return null;
    const cursor = editor.getCursor?.("from");
    const line = cursor?.line;
    const lineText = editor.getLine?.(line);
    if (line === void 0 || !lineText) return null;
    const from = editor.posToOffset?.({ ch: 0, line }) || 0;
    const selFrom = editor.posToOffset?.(cursor) || 0;
    const selTo = editor.posToOffset?.(editor.getCursor?.("to")) || 0;
    const highlight = await this.shadowManager.createHighlight(
      file,
      line,
      selFrom - from,
      selTo - from,
      selection,
      color
    );
    await this.renderHighlightsForActiveFile();
    return highlight;
  }
};

// src/comments-item-view.ts
var import_obsidian4 = require("obsidian");

// src/sidebar-view.ts
var CommentsSidebarView = class {
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
      this.containerEl.createEl("p", {
        text: "No note open",
        cls: "comments-empty-state"
      });
      return;
    }
    const data = await this.shadowManager.readShadowFile(this.currentFile);
    this.containerEl.empty();
    const header = this.containerEl.createEl("div", { cls: "comments-header" });
    header.createEl("h3", { text: "Comments" });
    const unresolvedHighlights = data.highlights.filter((h) => !h.resolved);
    const resolvedHighlights = data.highlights.filter((h) => h.resolved);
    if (data.highlights.length === 0) {
      this.containerEl.createEl("p", {
        text: 'No highlights yet. Select text and use "Add highlight" command.',
        cls: "comments-empty-state"
      });
      return;
    }
    if (unresolvedHighlights.length > 0) {
      this.renderHighlightsSection("Highlights", unresolvedHighlights, data, false);
    }
    if (resolvedHighlights.length > 0 && this.settings.showResolved) {
      this.renderHighlightsSection(
        `Resolved (${resolvedHighlights.length})`,
        resolvedHighlights,
        data,
        true
      );
    }
  }
  renderHighlightsSection(title, highlights, data, isResolved) {
    const section = this.containerEl.createEl("div", { cls: "comments-section" });
    const header = section.createEl("div", {
      cls: `comments-section-header${isResolved ? " resolved" : ""}`
    });
    header.createEl("span", { text: title });
    const list = section.createEl("div", { cls: "comments-list" });
    for (const highlight of highlights) {
      this.renderHighlightItem(list, highlight, data, isResolved);
    }
  }
  renderHighlightItem(container, highlight, data, isResolved) {
    const comments = data.comments.filter((c) => c.highlightId === highlight.id);
    const item = container.createEl("div", {
      cls: `highlight-item highlight-color-${highlight.color}${isResolved ? " resolved" : ""}`
    });
    const highlightText = item.createEl("div", { cls: "highlight-text" });
    const highlightLabel = highlightText.createEl("span", {
      text: "\u2261 ",
      cls: "highlight-indicator",
      attr: { style: `color: ${COLOR_HEX[highlight.color]}` }
    });
    highlightText.createEl("span", {
      text: this.truncateText(highlight.text, 80),
      cls: "highlight-quote"
    });
    highlightText.addEventListener("click", () => {
      this.onHighlightClick(highlight);
    });
    if (comments.length > 0 || !isResolved) {
      const commentsContainer = item.createEl("div", { cls: "highlight-comments" });
      for (const comment of comments) {
        this.renderComment(commentsContainer, highlight, comment);
      }
      if (!isResolved) {
        this.renderCommentInput(commentsContainer, highlight);
      }
    }
    const actions = item.createEl("div", { cls: "highlight-actions" });
    if (!isResolved) {
      const resolveBtn = actions.createEl("button", {
        text: "\u2713",
        cls: "action-btn resolve-btn",
        attr: { title: "Resolve" }
      });
      resolveBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.shadowManager.setHighlightResolved(
          this.currentFile,
          highlight.id,
          true
        );
        await this.refresh();
        this.refreshCallback();
      });
    }
    const deleteBtn = actions.createEl("button", {
      text: "\u{1F5D1}",
      cls: "action-btn delete-btn",
      attr: { title: "Delete highlight" }
    });
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.shadowManager.deleteHighlight(this.currentFile, highlight.id);
      await this.refresh();
      this.refreshCallback();
    });
  }
  renderComment(container, highlight, comment) {
    const commentEl = container.createEl("div", { cls: "comment-item" });
    const header = commentEl.createEl("div", { cls: "comment-header" });
    header.createEl("span", {
      text: `\u{1F464} ${comment.user} \xB7 ${this.formatTime(comment.createdAt)}`,
      cls: "comment-meta"
    });
    if (comment.user === this.settings.username) {
      const editBtn = header.createEl("button", {
        text: "\u270F\uFE0F",
        cls: "comment-action-btn",
        attr: { title: "Edit" }
      });
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showEditCommentInput(commentEl, comment);
      });
      const deleteBtn = header.createEl("button", {
        text: "\u{1F5D1}",
        cls: "comment-action-btn",
        attr: { title: "Delete" }
      });
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.shadowManager.deleteComment(this.currentFile, comment.id);
        await this.refresh();
        this.refreshCallback();
      });
    }
    const content = commentEl.createEl("div", { cls: "comment-content" });
    if (comment.editedAt) {
      content.createEl("p", {
        text: `${comment.content} (edited)`,
        cls: "comment-text"
      });
    } else {
      content.createEl("p", { text: comment.content, cls: "comment-text" });
    }
    for (const reply of comment.replies) {
      this.renderReply(commentEl, comment, reply);
    }
    const replyBtn = container.createEl("button", {
      text: "+ Reply",
      cls: "reply-btn"
    });
    replyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showReplyInput(commentEl, comment);
    });
  }
  renderReply(container, comment, reply) {
    const replyEl = container.createEl("div", { cls: "reply-item" });
    const header = replyEl.createEl("div", { cls: "reply-header" });
    header.createEl("span", {
      text: `  \u2514\u2500 \u{1F464} ${reply.user} \xB7 ${this.formatTime(reply.createdAt)}`,
      cls: "reply-meta"
    });
    if (reply.user === this.settings.username) {
      const editBtn = header.createEl("button", {
        text: "\u270F\uFE0F",
        cls: "comment-action-btn",
        attr: { title: "Edit" }
      });
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showEditReplyInput(replyEl.parentElement, comment.id, reply);
      });
      const deleteBtn = header.createEl("button", {
        text: "\u{1F5D1}",
        cls: "comment-action-btn",
        attr: { title: "Delete" }
      });
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.shadowManager.deleteReply(this.currentFile, comment.id, reply.id);
        await this.refresh();
        this.refreshCallback();
      });
    }
    const content = replyEl.createEl("div", { cls: "reply-content" });
    if (reply.editedAt) {
      content.createEl("p", {
        text: reply.content,
        cls: "reply-text edited"
      });
    } else {
      content.createEl("p", { text: reply.content, cls: "reply-text" });
    }
  }
  renderCommentInput(container, highlight) {
    const inputContainer = container.createEl("div", { cls: "comment-input-container" });
    const input = inputContainer.createEl("input", {
      cls: "comment-input",
      attr: { type: "text", placeholder: "Add a comment..." }
    });
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        await this.shadowManager.addComment(
          this.currentFile,
          highlight.id,
          this.settings.username,
          input.value.trim()
        );
        await this.refresh();
        this.refreshCallback();
      }
    });
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  showReplyInput(container, comment) {
    const existingInput = container.querySelector(".reply-input-container");
    if (existingInput) existingInput.remove();
    const inputContainer = container.createEl("div", { cls: "reply-input-container" });
    const input = inputContainer.createEl("input", {
      cls: "reply-input",
      attr: { type: "text", placeholder: "Write a reply..." }
    });
    input.focus();
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        await this.shadowManager.addReply(
          this.currentFile,
          comment.id,
          this.settings.username,
          input.value.trim()
        );
        await this.refresh();
        this.refreshCallback();
      } else if (e.key === "Escape") {
        inputContainer.remove();
      }
    });
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  showEditCommentInput(container, comment) {
    const existingInput = container.querySelector(".edit-input-container");
    if (existingInput) existingInput.remove();
    const inputContainer = container.createEl("div", { cls: "edit-input-container" });
    const input = inputContainer.createEl("input", {
      cls: "edit-input",
      attr: { type: "text", value: comment.content }
    });
    input.focus();
    input.select();
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        await this.shadowManager.editComment(
          this.currentFile,
          comment.id,
          input.value.trim()
        );
        await this.refresh();
        this.refreshCallback();
      } else if (e.key === "Escape") {
        inputContainer.remove();
      }
    });
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  showEditReplyInput(container, commentId, reply) {
    const existingInput = container.querySelector(".edit-input-container");
    if (existingInput) existingInput.remove();
    const inputContainer = container.createEl("div", { cls: "edit-input-container" });
    const input = inputContainer.createEl("input", {
      cls: "edit-input",
      attr: { type: "text", value: reply.content }
    });
    input.focus();
    input.select();
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        await this.shadowManager.editReply(
          this.currentFile,
          commentId,
          reply.id,
          input.value.trim()
        );
        await this.refresh();
        this.refreshCallback();
      } else if (e.key === "Escape") {
        inputContainer.remove();
      }
    });
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }
  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
};

// src/comments-item-view.ts
var COMMENTS_VIEW_TYPE = "obsidian-comments-view";
var CommentsItemView = class extends import_obsidian4.ItemView {
  constructor(leaf, shadowManager, settings, highlightRenderer, onRefresh) {
    super(leaf);
    this.sidebarView = null;
    this.shadowManager = shadowManager;
    this.settings = settings;
    this.highlightRenderer = highlightRenderer;
    this.onRefresh = onRefresh;
  }
  getViewType() {
    return COMMENTS_VIEW_TYPE;
  }
  getDisplayText() {
    return "Comments";
  }
  getIcon() {
    return "message-square";
  }
  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("comments-sidebar-container");
    this.sidebarView = new CommentsSidebarView(
      this.app,
      this.shadowManager,
      this.settings,
      this.contentEl,
      () => this.onRefresh(),
      (highlight) => this.highlightRenderer.navigateToHighlight(highlight)
    );
    this.contentEl.createEl("p", {
      text: "Open a note to see comments.",
      cls: "comments-empty-state"
    });
    setTimeout(async () => {
      const leaves = this.app.workspace.getLeavesOfType("markdown");
      const mdLeaf = leaves.find((l) => l.view.file);
      const file = mdLeaf ? mdLeaf.view.file : null;
      if (file && this.sidebarView) {
        await this.sidebarView.loadForFile(file);
      }
    }, 50);
  }
  async onClose() {
    this.sidebarView = null;
  }
  async loadForFile(file) {
    if (this.sidebarView) {
      await this.sidebarView.loadForFile(file);
    }
  }
  async refresh() {
    if (this.sidebarView) {
      await this.sidebarView.refresh();
    }
  }
};

// src/main.ts
var CommentsPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    await this.loadSettings();
    this.shadowManager = new ShadowFileManager(this.app);
    this.highlightRenderer = new HighlightRenderer(this.app, this.shadowManager);
    this.registerView(
      COMMENTS_VIEW_TYPE,
      (leaf) => new CommentsItemView(leaf, this.shadowManager, this.settings, this.highlightRenderer, () => this.refreshView())
    );
    this.addRibbonIcon("message-square", "Comments", () => this.activateView());
    this.addSettingTab(new CommentsSettingsTab(this.app, this));
    this.addCommand({ id: "toggle-comments-sidebar", name: "Toggle comments sidebar", callback: () => this.activateView() });
    this.addCommand({
      id: "add-highlight",
      name: "Add highlight",
      editorCallback: async (editor) => {
        if (!editor.getSelection()) {
          new import_obsidian5.Notice("Select text first");
          return;
        }
        await this.addHighlight(editor);
      }
    });
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        const activeView = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
        if (activeView?.file) {
          await this.updateViewForFile(activeView.file);
          this.highlightRenderer.renderHighlightsForActiveFile();
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        if (editor.getSelection?.()) {
          menu.addItem((item) => item.setTitle("Add highlight").setIcon("highlighter").onClick(() => this.addHighlight(editor)));
        }
      })
    );
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
    let leaf = null;
    const leaves = workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: COMMENTS_VIEW_TYPE, active: true });
    }
    if (leaf) workspace.revealLeaf(leaf);
  }
  async updateViewForFile(file) {
    const leaves = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      await view.loadForFile(file);
    }
  }
  async refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      await view.refresh();
    }
  }
  async addHighlight(editor, color) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
    if (!view || !view.file) return;
    await this.highlightRenderer.addHighlightFromSelection(color || this.settings.defaultColor);
    await this.refreshView();
  }
};
//# sourceMappingURL=main.js.map
