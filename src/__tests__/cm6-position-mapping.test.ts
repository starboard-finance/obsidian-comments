import { EditorState } from '@codemirror/state';
import { describe, expect, it, vi } from 'vitest';
import 'obsidian';
import { addHighlightEffect, highlightField } from '../cm6-highlight-field';

vi.mock('obsidian', () => ({}));

function createStateWithHighlight(doc: string, from: number, to: number): EditorState {
	const base = EditorState.create({
		doc,
		extensions: [highlightField],
	});

	return base.update({
		effects: [
			addHighlightEffect.of({
				from,
				to,
				id: 'test-id',
				color: 'yellow',
			}),
		],
	}).state;
}

function getHighlightRanges(state: EditorState): Array<{ from: number; to: number; id?: string }> {
	const ranges: Array<{ from: number; to: number; id?: string }> = [];
	state.field(highlightField).between(0, state.doc.length, (from, to, deco) => {
		ranges.push({
			from,
			to,
			id: deco.spec.attributes?.['data-highlight-id'],
		});
	});
	return ranges;
}

describe('CM6 position mapping', () => {
	it('insert-before: highlight shifts right by inserted length', () => {
		let state = createStateWithHighlight('hello world', 6, 11);

		state = state.update({
			changes: { from: 6, insert: 'great ' },
		}).state;

		expect(getHighlightRanges(state)).toEqual([{ from: 12, to: 17, id: 'test-id' }]);
	});

	it('insert-inside: highlight expands to include inserted text', () => {
		let state = createStateWithHighlight('hello world', 6, 11);

		state = state.update({
			changes: { from: 8, insert: 'nder' },
		}).state;

		expect(getHighlightRanges(state)).toEqual([{ from: 6, to: 15, id: 'test-id' }]);
	});

	it('delete-before: highlight shifts left by deleted length', () => {
		let state = createStateWithHighlight('abc hello world', 10, 15);

		state = state.update({
			changes: { from: 0, to: 4, insert: '' },
		}).state;

		expect(getHighlightRanges(state)).toEqual([{ from: 6, to: 11, id: 'test-id' }]);
	});

	it('delete-spanning: deleting highlighted text removes zero-width decoration', () => {
		let state = createStateWithHighlight('hello world', 6, 11);

		state = state.update({
			changes: { from: 6, to: 11, insert: '' },
		}).state;

		expect(getHighlightRanges(state)).toEqual([]);
	});
});
