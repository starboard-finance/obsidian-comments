"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLOR_HEX = exports.DEFAULT_SETTINGS = void 0;
exports.generateId = generateId;
// Default settings
exports.DEFAULT_SETTINGS = {
    username: '',
    defaultColor: 'yellow',
    showResolved: false,
};
// Color hex values for rendering
exports.COLOR_HEX = {
    yellow: '#ffd700',
    red: '#ff6b6b',
    teal: '#4ecdc4',
    blue: '#45b7d1',
    green: '#96ceb4',
};
// Generate a unique ID
function generateId() {
    return Math.random().toString(36).substring(2, 10);
}
