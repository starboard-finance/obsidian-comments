// Highlight colors
export type HighlightColor = 'yellow' | 'red' | 'teal' | 'blue' | 'green';

// A single highlight in the document
export interface Highlight {
	id: string;
	line: number;
	startOffset: number;
	endOffset: number;
	text: string;
	color: HighlightColor;
	createdAt: number;
	resolved: boolean;
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
