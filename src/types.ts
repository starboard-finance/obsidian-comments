// Highlight colors
export type HighlightColor = 'yellow' | 'red' | 'teal' | 'blue' | 'green';

// V1 (keep for migration compatibility)
export interface HighlightV1 {
	id: string;
	line: number;
	startOffset: number;
	endOffset: number;
	text: string;
	color: HighlightColor;
	createdAt: number;
	resolved: boolean;
}

// V2 (new schema)
export interface Highlight {
	id: string;
	// Position (multi-line ready)
	startLine: number;
	endLine: number;
	startOffset: number;
	endOffset: number;
	// Anchor for recovery
	anchor: {
		exact: string;       // highlighted text
		prefix: string;      // 32 chars before
		suffix: string;      // 32 chars after
	};
	position: {
		start: number;       // char offset from content body start (after frontmatter)
		end: number;
	};
	// Meta (keep from V1)
	text: string;          // keep for display compatibility
	color: HighlightColor;
	createdAt: number;
	resolved: boolean;
	orphaned?: boolean;    // true if anchor text no longer found
}

// A reply to a comment
export interface Reply {
	id: string;
	user: string;
	content: string;
	createdAt: number;
	editedAt: number | null;
}

// A comment thread attached to a highlight
export interface Comment {
	id: string;
	highlightId: string;
	user: string;
	content: string;
	createdAt: number;
	editedAt: number | null;
	replies: Reply[];
}

// The complete shadow file structure
export interface CommentsFile {
	version: string;       // "2.0" for V2, missing or "1.0" for V1
	highlights: Highlight[];
	comments: Comment[];
}

// Plugin settings
export interface PluginSettings {
	username: string;
	defaultColor: HighlightColor;
	showResolved: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: PluginSettings = {
	username: '',
	defaultColor: 'yellow',
	showResolved: false,
};

// Color hex values for rendering
export const COLOR_HEX: Record<HighlightColor, string> = {
	yellow: '#ffd700',
	red: '#ff6b6b',
	teal: '#4ecdc4',
	blue: '#45b7d1',
	green: '#96ceb4',
};

// Generate a unique ID
export function generateId(): string {
	return Math.random().toString(36).substring(2, 10);
}
