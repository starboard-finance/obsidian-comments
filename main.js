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
var import_obsidian6 = require("obsidian");
var import_view3 = require("@codemirror/view");

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
        this.plugin.refreshView?.();
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

// src/anchor.ts
function findAnchorPosition(doc, anchor, storedPosition) {
  const { exact, prefix, suffix } = anchor;
  if (!exact) return null;
  if (storedPosition) {
    const slice = doc.substring(storedPosition.start, storedPosition.end);
    if (slice === exact) {
      return { from: storedPosition.start, to: storedPosition.end };
    }
  }
  let searchStart = 0;
  while (true) {
    const idx = doc.indexOf(exact, searchStart);
    if (idx === -1) break;
    const suffixOk = suffix ? contextMatches(
      doc.substring(idx + exact.length, idx + exact.length + suffix.length),
      suffix,
      0.5
    ) : true;
    if (prefix) {
      const actualPrefix = doc.substring(Math.max(0, idx - prefix.length), idx);
      if (contextMatches(actualPrefix, prefix, 0.5) && suffixOk) {
        return { from: idx, to: idx + exact.length };
      }
    } else if (suffixOk) {
      return { from: idx, to: idx + exact.length };
    }
    searchStart = idx + 1;
  }
  return fuzzyFind(doc, exact);
}
function contextMatches(actual, expected, threshold) {
  if (!expected) return true;
  const shorter = Math.min(actual.length, expected.length);
  if (shorter === 0) return true;
  const compare = actual.slice(-shorter);
  let matches = 0;
  for (let i = 0; i < shorter; i++) {
    if (compare[i] === expected[expected.length - shorter + i]) matches++;
  }
  return matches / shorter >= threshold;
}
function fuzzyFind(doc, exact) {
  if (exact.length < 4) return null;
  const maxDist = Math.floor(exact.length * 0.2);
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= doc.length - exact.length; i++) {
    const slice = doc.substring(i, i + exact.length);
    const dist = levenshtein(slice, exact);
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      best = { from: i, to: i + exact.length };
      if (dist === 0) return best;
    }
  }
  return best;
}
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from(
    { length: m + 1 },
    (_, i) => Array.from({ length: n + 1 }, (_2, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function extractAnchor(doc, from, to) {
  return {
    exact: doc.substring(from, to),
    prefix: doc.substring(Math.max(0, from - 32), from),
    suffix: doc.substring(to, Math.min(doc.length, to + 32))
  };
}

// src/shadow-file-manager.ts
function migrateV1ToV2(data) {
  const highlights = (data.highlights || []).map((h) => ({
    id: h.id,
    startLine: h.line,
    endLine: h.line,
    startOffset: h.startOffset,
    endOffset: h.endOffset,
    anchor: {
      exact: h.text || "",
      prefix: "",
      suffix: ""
    },
    position: {
      start: 0,
      end: 0
    },
    text: h.text || "",
    color: h.color,
    createdAt: h.createdAt,
    resolved: h.resolved || false
  }));
  return {
    version: "2.0",
    highlights,
    comments: data.comments || []
  };
}
var ShadowFileManager = class {
  constructor(app) {
    this.cache = /* @__PURE__ */ new Map();
    this.app = app;
  }
  getShadowPath(file) {
    const basePath = file.path;
    return basePath.replace(/\.md$/, ".comments.json");
  }
  async readShadowFile(file) {
    const shadowPath = this.getShadowPath(file);
    if (this.cache.has(shadowPath)) {
      return this.cache.get(shadowPath);
    }
    try {
      const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
      if (shadowFile instanceof import_obsidian2.TFile && shadowFile.extension === "json") {
        const content = await this.app.vault.read(shadowFile);
        let rawData;
        try {
          rawData = JSON.parse(content);
        } catch (e) {
          new import_obsidian2.Notice(`[Comments] Failed to parse ${shadowPath}. File may be corrupted.`);
          console.error("[Comments] Failed to parse shadow file:", e);
          const empty2 = { version: "2.0", highlights: [], comments: [] };
          this.cache.set(shadowPath, empty2);
          return empty2;
        }
        let data;
        if (!rawData.version || rawData.version === "1.0") {
          data = migrateV1ToV2(rawData);
          await this.writeShadowFile(file, data);
        } else {
          data = rawData;
        }
        this.cache.set(shadowPath, data);
        return data;
      }
    } catch (e) {
    }
    const empty = { version: "2.0", highlights: [], comments: [] };
    this.cache.set(shadowPath, empty);
    return empty;
  }
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
  async createHighlight(file, highlightInput) {
    const data = await this.readShadowFile(file);
    const derivedAnchor = highlightInput.documentText && (!highlightInput.anchorPrefix || !highlightInput.anchorSuffix) ? extractAnchor(
      highlightInput.documentText,
      highlightInput.positionStart,
      highlightInput.positionEnd
    ) : null;
    const highlight = {
      id: generateId(),
      startLine: highlightInput.startLine,
      endLine: highlightInput.endLine,
      startOffset: highlightInput.startOffset,
      endOffset: highlightInput.endOffset,
      anchor: {
        exact: highlightInput.text,
        prefix: highlightInput.anchorPrefix ?? derivedAnchor?.prefix ?? "",
        suffix: highlightInput.anchorSuffix ?? derivedAnchor?.suffix ?? ""
      },
      position: {
        start: highlightInput.positionStart,
        end: highlightInput.positionEnd
      },
      text: highlightInput.text,
      color: highlightInput.color,
      createdAt: Date.now(),
      resolved: false
    };
    data.highlights.push(highlight);
    await this.writeShadowFile(file, data);
    return highlight;
  }
  async updateHighlightColor(file, highlightId, color) {
    const data = await this.readShadowFile(file);
    const highlight = data.highlights.find((h) => h.id === highlightId);
    if (highlight) {
      highlight.color = color;
      await this.writeShadowFile(file, data);
    }
  }
  async deleteHighlight(file, highlightId) {
    const data = await this.readShadowFile(file);
    data.highlights = data.highlights.filter((h) => h.id !== highlightId);
    data.comments = data.comments.filter((c) => c.highlightId !== highlightId);
    await this.writeShadowFile(file, data);
  }
  async setHighlightResolved(file, highlightId, resolved) {
    const data = await this.readShadowFile(file);
    const highlight = data.highlights.find((h) => h.id === highlightId);
    if (highlight) {
      highlight.resolved = resolved;
      await this.writeShadowFile(file, data);
    }
  }
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
  async editComment(file, commentId, content) {
    const data = await this.readShadowFile(file);
    const comment = data.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.content = content;
      comment.editedAt = Date.now();
      await this.writeShadowFile(file, data);
    }
  }
  async deleteComment(file, commentId) {
    const data = await this.readShadowFile(file);
    data.comments = data.comments.filter((c) => c.id !== commentId);
    await this.writeShadowFile(file, data);
  }
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
  async deleteReply(file, commentId, replyId) {
    const data = await this.readShadowFile(file);
    const comment = data.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.replies = comment.replies.filter((r) => r.id !== replyId);
      await this.writeShadowFile(file, data);
    }
  }
  async getCommentsForHighlight(file, highlightId) {
    const data = await this.readShadowFile(file);
    return data.comments.filter((c) => c.highlightId === highlightId);
  }
  invalidateCache(filePath) {
    this.cache.delete(filePath);
  }
  clearCache() {
    this.cache.clear();
  }
  async renameShadowFile(oldNotePath, newNotePath) {
    const oldShadowPath = oldNotePath.replace(/\.md$/, ".comments.json");
    const newShadowPath = newNotePath.replace(/\.md$/, ".comments.json");
    const oldFile = this.app.vault.getAbstractFileByPath(oldShadowPath);
    if (oldFile instanceof import_obsidian2.TFile) {
      await this.app.fileManager.renameFile(oldFile, newShadowPath);
      const cached = this.cache.get(oldShadowPath);
      if (cached) {
        this.cache.delete(oldShadowPath);
        this.cache.set(newShadowPath, cached);
      }
    }
  }
  async deleteShadowFile(notePath) {
    const shadowPath = notePath.replace(/\.md$/, ".comments.json");
    const shadowFile = this.app.vault.getAbstractFileByPath(shadowPath);
    if (shadowFile instanceof import_obsidian2.TFile) {
      await this.app.vault.delete(shadowFile);
      this.cache.delete(shadowPath);
    }
  }
};

// src/highlight-renderer.ts
var import_obsidian3 = require("obsidian");

// src/cm6-highlight-field.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var addHighlightEffect = import_state.StateEffect.define();
var removeHighlightEffect = import_state.StateEffect.define();
var clearHighlightsEffect = import_state.StateEffect.define();
var highlightField = import_state.StateField.define({
  create() {
    return import_view.Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    const collapsedHighlightIds = /* @__PURE__ */ new Set();
    decorations.between(0, tr.newDoc.length, (from, to, deco) => {
      if (from !== to) return;
      const id = deco.spec.attributes?.["data-highlight-id"];
      if (typeof id === "string" && id.length > 0) {
        collapsedHighlightIds.add(id);
      }
    });
    if (collapsedHighlightIds.size > 0) {
      decorations = decorations.update({
        filter: (_from, _to, deco) => {
          const id = deco.spec.attributes?.["data-highlight-id"];
          return typeof id !== "string" || !collapsedHighlightIds.has(id);
        }
      });
    }
    for (const effect of tr.effects) {
      if (effect.is(addHighlightEffect)) {
        const { from, to, id, color } = effect.value;
        const mark = import_view.Decoration.mark({
          class: `obsidian-comments-highlight obsidian-comments-highlight-${color}`,
          attributes: {
            "data-highlight-id": id,
            "data-highlight-color": color
          }
        });
        decorations = decorations.update({
          add: [mark.range(from, to)],
          sort: true
        });
      } else if (effect.is(removeHighlightEffect)) {
        decorations = decorations.update({
          filter: (_from, _to, deco) => deco.spec.attributes?.["data-highlight-id"] !== effect.value.id
        });
      } else if (effect.is(clearHighlightsEffect)) {
        decorations = import_view.Decoration.none;
      }
    }
    return decorations;
  },
  provide: (field) => import_view.EditorView.decorations.from(field)
});

// src/highlight-renderer.ts
var HighlightRenderer = class {
  constructor(app, shadowManager) {
    this.app = app;
    this.shadowManager = shadowManager;
  }
  getContentOffset(doc) {
    if (doc.startsWith("---\n")) {
      const end = doc.indexOf("\n---\n", 4);
      if (end !== -1) return end + 5;
    }
    return 0;
  }
  getActiveEditorContext() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view) return null;
    const file = view.file;
    if (!file) return null;
    const editor = view.editor;
    const editorView = editor?.cm;
    if (!editorView) return null;
    return { view, editor, editorView, file };
  }
  /**
   * Render highlights for the currently active file
   */
  async renderHighlightsForActiveFile() {
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
      if (highlight.position.start !== recovered.from || highlight.position.end !== recovered.to) {
        highlight.position.start = recovered.from;
        highlight.position.end = recovered.to;
        didMutate = true;
      }
      effects.push(
        addHighlightEffect.of({
          from: contentOffset + recovered.from,
          to: contentOffset + recovered.to,
          id: highlight.id,
          color: highlight.color
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
  clearDecorations() {
    const ctx = this.getActiveEditorContext();
    if (!ctx) return;
    ctx.editorView.dispatch({ effects: clearHighlightsEffect.of(null) });
  }
  removeHighlightById(id) {
    const ctx = this.getActiveEditorContext();
    if (!ctx) return;
    ctx.editorView.dispatch({ effects: removeHighlightEffect.of({ id }) });
  }
  /**
   * Navigate to a highlight's position in the editor
   */
  navigateToHighlight(highlight) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view) return;
    const editor = view.editor;
    const from = { line: highlight.startLine, ch: highlight.startOffset };
    const to = { line: highlight.endLine, ch: highlight.endOffset };
    editor.setSelection?.(from, to);
    editor.scrollIntoView?.({ from, to }, true);
  }
  /**
   * Add a new highlight from selection
   */
  async addHighlightFromSelection(color) {
    const ctx = this.getActiveEditorContext();
    if (!ctx) return null;
    const editor = ctx.editor;
    const selection = editor.getSelection?.();
    if (!selection) return null;
    const fromCursor = editor.getCursor?.("from");
    const toCursor = editor.getCursor?.("to");
    if (!fromCursor || !toCursor) return null;
    const { editorView } = ctx;
    const fromLine = editorView.state.doc.line(fromCursor.line + 1);
    const toLine = editorView.state.doc.line(toCursor.line + 1);
    const fromOffset = fromLine.from + fromCursor.ch;
    const toOffset = toLine.from + toCursor.ch;
    if (toOffset <= fromOffset) return null;
    const docText = editorView.state.doc.toString();
    const contentOffset = this.getContentOffset(docText);
    const contentBody = docText.slice(contentOffset);
    const localStart = Math.max(0, fromOffset - contentOffset);
    const localEnd = Math.max(localStart, toOffset - contentOffset);
    const anchor = extractAnchor(contentBody, localStart, localEnd);
    const highlight = await this.shadowManager.createHighlight(
      ctx.file,
      {
        startLine: fromCursor.line,
        endLine: toCursor.line,
        startOffset: fromCursor.ch,
        endOffset: toCursor.ch,
        text: selection,
        color,
        positionStart: localStart,
        positionEnd: localEnd,
        anchorPrefix: anchor.prefix,
        anchorSuffix: anchor.suffix,
        documentText: contentBody
      }
    );
    if (editorView.state.field(highlightField, false)) {
      editorView.dispatch({
        effects: addHighlightEffect.of({
          from: fromOffset,
          to: toOffset,
          id: highlight.id,
          color: highlight.color
        })
      });
    }
    return highlight;
  }
};

// src/comments-item-view.ts
var import_obsidian5 = require("obsidian");
var import_view2 = require("@codemirror/view");

// src/sidebar-view.ts
var import_obsidian4 = require("obsidian");
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
    const toggleBtn = header.createEl("button", {
      text: this.settings.showResolved ? "Hide resolved" : "Show resolved",
      cls: "comments-toggle-resolved-btn"
    });
    toggleBtn.addEventListener("click", async () => {
      this.settings.showResolved = !this.settings.showResolved;
      await this.render();
      this.refreshCallback();
    });
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
    } else if (resolvedHighlights.length > 0 && !this.settings.showResolved) {
      this.containerEl.createEl("p", {
        text: `${resolvedHighlights.length} resolved highlight${resolvedHighlights.length !== 1 ? "s" : ""} hidden`,
        cls: "comments-resolved-note"
      });
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
      cls: `highlight-item highlight-color-${highlight.color}${isResolved ? " resolved" : ""}${highlight.orphaned ? " orphaned" : ""}`,
      attr: {
        "data-highlight-id": highlight.id,
        "data-position-start": String(highlight.position?.start ?? 0)
      }
    });
    if (highlight.orphaned) {
      item.createEl("div", {
        text: "\u26A0 Anchor text not found \u2014 highlight may have moved or been deleted",
        cls: "orphaned-indicator"
      });
    }
    const highlightText = item.createEl("div", { cls: "highlight-text" });
    highlightText.createEl("span", {
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
        try {
          await this.shadowManager.setHighlightResolved(
            this.currentFile,
            highlight.id,
            true
          );
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to resolve highlight. Please try again.");
          console.error("[Comments] Error resolving highlight:", err);
        }
      });
    }
    const deleteBtn = actions.createEl("button", {
      text: "\u{1F5D1}",
      cls: "action-btn delete-btn",
      attr: { title: "Delete highlight" }
    });
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await this.shadowManager.deleteHighlight(this.currentFile, highlight.id);
        await this.refresh();
        this.refreshCallback();
      } catch (err) {
        new import_obsidian4.Notice("[Comments] Failed to delete highlight. Please try again.");
        console.error("[Comments] Error deleting highlight:", err);
      }
    });
  }
  renderComment(container, highlight, comment) {
    const commentEl = container.createEl("div", { cls: "comment-item" });
    const header = commentEl.createEl("div", { cls: "comment-header" });
    header.createEl("span", {
      text: `\u{1F464} ${comment.user} \xB7 ${this.formatTime(comment.createdAt)}`,
      cls: "comment-meta"
    });
    const currentUser = this.settings.username?.trim() || "User-" + Math.random().toString(36).substring(2, 6);
    if (comment.user === currentUser) {
      const btnGroup = header.createEl("div", { cls: "comment-btn-group" });
      const editBtn = btnGroup.createEl("button", {
        text: "\u270F\uFE0F",
        cls: "comment-action-btn",
        attr: { title: "Edit" }
      });
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showEditCommentInput(commentEl, comment);
      });
      const deleteBtn = btnGroup.createEl("button", {
        text: "\u{1F5D1}",
        cls: "comment-action-btn",
        attr: { title: "Delete" }
      });
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await this.shadowManager.deleteComment(this.currentFile, comment.id);
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to delete comment. Please try again.");
          console.error("[Comments] Error deleting comment:", err);
        }
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
    const currentReplyUser = this.settings.username?.trim() || "User-" + Math.random().toString(36).substring(2, 6);
    if (reply.user === currentReplyUser) {
      const btnGroup = header.createEl("div", { cls: "comment-btn-group" });
      const editBtn = btnGroup.createEl("button", {
        text: "\u270F\uFE0F",
        cls: "comment-action-btn",
        attr: { title: "Edit" }
      });
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showEditReplyInput(replyEl.parentElement, comment.id, reply);
      });
      const deleteBtn = btnGroup.createEl("button", {
        text: "\u{1F5D1}",
        cls: "comment-action-btn",
        attr: { title: "Delete" }
      });
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await this.shadowManager.deleteReply(this.currentFile, comment.id, reply.id);
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to delete reply. Please try again.");
          console.error("[Comments] Error deleting reply:", err);
        }
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
        const user = this.settings.username?.trim() || "User-" + Math.random().toString(36).substring(2, 6);
        try {
          await this.shadowManager.addComment(
            this.currentFile,
            highlight.id,
            user,
            input.value.trim()
          );
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to add comment. Please try again.");
          console.error("[Comments] Error adding comment:", err);
        }
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
        const user = this.settings.username?.trim() || "User-" + Math.random().toString(36).substring(2, 6);
        try {
          await this.shadowManager.addReply(
            this.currentFile,
            comment.id,
            user,
            input.value.trim()
          );
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to add reply. Please try again.");
          console.error("[Comments] Error adding reply:", err);
        }
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
        try {
          await this.shadowManager.editComment(
            this.currentFile,
            comment.id,
            input.value.trim()
          );
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to save edit. Please try again.");
          console.error("[Comments] Error editing comment:", err);
        }
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
        try {
          await this.shadowManager.editReply(
            this.currentFile,
            commentId,
            reply.id,
            input.value.trim()
          );
          await this.refresh();
          this.refreshCallback();
        } catch (err) {
          new import_obsidian4.Notice("[Comments] Failed to save edit. Please try again.");
          console.error("[Comments] Error editing reply:", err);
        }
      } else if (e.key === "Escape") {
        inputContainer.remove();
      }
    });
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  scrollToHighlightInRange(from, to) {
    const items = this.containerEl.querySelectorAll("[data-position-start]");
    for (const item of items) {
      const posStart = parseInt(item.dataset.positionStart || "0");
      if (posStart >= from && posStart <= to) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
    }
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
var CommentsItemView = class extends import_obsidian5.ItemView {
  constructor(leaf, shadowManager, settings, highlightRenderer, onRefresh) {
    super(leaf);
    this.sidebarView = null;
    this.currentFile = null;
    this.unresolvedCount = 0;
    this._refreshTimer = null;
    this.shadowManager = shadowManager;
    this.settings = settings;
    this.highlightRenderer = highlightRenderer;
    this.onRefresh = onRefresh;
  }
  getViewType() {
    return COMMENTS_VIEW_TYPE;
  }
  getDisplayText() {
    if (this.unresolvedCount > 0) {
      return `Comments (${this.unresolvedCount})`;
    }
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
      (highlight) => {
        const mdView = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
        if (mdView && highlight.position) {
          const editor = mdView.editor;
          const editorView = editor?.cm;
          if (editorView) {
            const docText = editorView.state.doc.toString();
            let contentOffset = 0;
            if (docText.startsWith("---\n")) {
              const end = docText.indexOf("\n---\n", 4);
              if (end !== -1) contentOffset = end + 5;
            }
            const absPos = contentOffset + highlight.position.start;
            editorView.dispatch({
              effects: import_view2.EditorView.scrollIntoView(absPos, { y: "center" })
            });
            setTimeout(() => {
              const marks = editorView.contentDOM.querySelectorAll(
                `[data-highlight-id="${highlight.id}"]`
              );
              marks.forEach((el) => {
                el.classList.add("obsidian-comments-highlight-pulse");
                setTimeout(() => el.classList.remove("obsidian-comments-highlight-pulse"), 1e3);
              });
            }, 100);
          }
        }
        this.highlightRenderer.navigateToHighlight(highlight);
      }
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
        this.currentFile = file;
        await this.updateUnresolvedCount();
        this.leaf.updateHeader?.();
      }
    }, 50);
  }
  async onClose() {
    this.sidebarView = null;
  }
  async loadForFile(file) {
    this.currentFile = file;
    if (this.sidebarView) {
      await this.sidebarView.loadForFile(file);
    }
    await this.updateUnresolvedCount();
    this.leaf.updateHeader?.();
  }
  async refresh() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    return new Promise((resolve) => {
      this._refreshTimer = setTimeout(async () => {
        if (this.sidebarView) {
          await this.sidebarView.refresh();
          await this.updateUnresolvedCount();
          this.leaf.updateHeader?.();
        }
        resolve();
      }, 300);
    });
  }
  async updateUnresolvedCount() {
    if (this.currentFile) {
      const data = await this.shadowManager.readShadowFile(this.currentFile);
      this.unresolvedCount = data.highlights.filter((h) => !h.resolved).length;
    } else {
      this.unresolvedCount = 0;
    }
  }
  scrollToHighlightInRange(from, to) {
    if (this.sidebarView) {
      this.sidebarView.scrollToHighlightInRange(from, to);
    }
  }
};

// src/main.ts
var CommentsPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this._cacheRefreshTimer = null;
    this._scrollSyncTimer = null;
  }
  async onload() {
    await this.loadSettings();
    this.shadowManager = new ShadowFileManager(this.app);
    this.highlightRenderer = new HighlightRenderer(this.app, this.shadowManager);
    const plugin = this;
    const scrollListener = import_view3.EditorView.updateListener.of((update) => {
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
      (leaf) => new CommentsItemView(leaf, this.shadowManager, this.settings, this.highlightRenderer, () => {
        this.refreshView();
        this.saveSettings();
      })
    );
    this.addRibbonIcon("message-square", "Comments", () => this.activateView());
    this.addSettingTab(new CommentsSettingsTab(this.app, this));
    this.addCommand({
      id: "toggle-comments-sidebar",
      name: "Toggle comments sidebar",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "C" }],
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "add-highlight",
      name: "Add highlight",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "H" }],
      editorCallback: async (editor) => {
        if (!editor.getSelection()) {
          new import_obsidian6.Notice("Select text first");
          return;
        }
        await this.addHighlight(editor);
      }
    });
    this.addCommand({
      id: "navigate-next-comment",
      name: "Navigate to next comment",
      hotkeys: [{ modifiers: ["Mod"], key: "]" }],
      editorCallback: (editor) => {
        this.navigateToNextComment(editor);
      }
    });
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path.endsWith(".comments.json")) {
          this.shadowManager.invalidateCache(file.path);
          if (this._cacheRefreshTimer) clearTimeout(this._cacheRefreshTimer);
          this._cacheRefreshTimer = setTimeout(() => this.refreshView(), 500);
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (file.path.endsWith(".md")) {
          await this.shadowManager.renameShadowFile(oldPath, file.path);
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async (file) => {
        if (file.path.endsWith(".md")) {
          await this.shadowManager.deleteShadowFile(file.path);
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        const activeView = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
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
  syncSidebarToViewport(editorView) {
    const { from, to } = editorView.viewport;
    const docText = editorView.state.doc.toString();
    let contentOffset = 0;
    if (docText.startsWith("---\n")) {
      const end = docText.indexOf("\n---\n", 4);
      if (end !== -1) contentOffset = end + 5;
    }
    const contentFrom = Math.max(0, from - contentOffset);
    const contentTo = Math.max(0, to - contentOffset);
    const leaves = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE);
    for (const leaf of leaves) {
      const commentsView = leaf.view;
      commentsView.scrollToHighlightInRange?.(contentFrom, contentTo);
    }
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(COMMENTS_VIEW_TYPE);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.username?.trim()) {
      this.settings.username = "User-" + Math.random().toString(36).substring(2, 6);
      await this.saveSettings();
    }
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
    const view = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    if (!view || !view.file) return;
    await this.highlightRenderer.addHighlightFromSelection(color || this.settings.defaultColor);
    await this.refreshView();
  }
  async navigateToNextComment(editor) {
    const mdView = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    if (!mdView?.file) return;
    const data = await this.shadowManager.readShadowFile(mdView.file);
    const unresolved = data.highlights.filter((h) => !h.resolved);
    if (unresolved.length === 0) return;
    const cursor = editor.getCursor();
    const currentLine = cursor.line;
    const next = unresolved.find((h) => h.startLine > currentLine) || unresolved[0];
    if (next) {
      editor.setCursor({ line: next.startLine, ch: next.startOffset });
      editor.scrollIntoView({
        from: { line: next.startLine, ch: next.startOffset },
        to: { line: next.endLine, ch: next.endOffset }
      });
    }
  }
};
//# sourceMappingURL=main.js.map
