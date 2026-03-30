import { describe, expect, test } from 'vitest';
import { findAnchorPosition } from '../anchor';

describe('multi-line anchor', () => {
	test('multi-line anchor exact match', () => {
		const doc = 'First line\nSecond line\nThird line';
		const anchor = {
			exact: 'First line\nSecond line',
			prefix: '',
			suffix: '\nThird line',
		};
		const result = findAnchorPosition(doc, anchor);
		expect(result).not.toBeNull();
		expect(result!.from).toBe(0);
		expect(result!.to).toBe(22);
	});

	test('multi-line anchor with insert before', () => {
		const doc = 'Intro\nFirst line\nSecond line\nThird line';
		const anchor = {
			exact: 'First line\nSecond line',
			prefix: '\n',
			suffix: '\nThird',
		};
		const result = findAnchorPosition(doc, anchor);
		expect(result).not.toBeNull();
		expect(result!.from).toBe(6);
		expect(result!.to).toBe(28);
	});

	test('selection spanning three lines produces correct offsets', () => {
		const doc = 'Line one\nLine two\nLine three';
		const from = 0;
		const to = doc.indexOf('\nLine three');
		const anchor = {
			exact: doc.substring(from, to),
			prefix: '',
			suffix: doc.substring(to, Math.min(doc.length, to + 32)),
		};
		const result = findAnchorPosition(doc, anchor, { start: from, end: to });
		expect(result).not.toBeNull();
		expect(result!.from).toBe(from);
		expect(result!.to).toBe(to);
	});

	test('stored position fast-path works for multi-line exact', () => {
		const doc = 'Alpha\nBeta\nGamma\nDelta';
		const exact = 'Beta\nGamma';
		const start = doc.indexOf(exact);
		const end = start + exact.length;
		const anchor = { exact, prefix: '\n', suffix: '\n' };
		const result = findAnchorPosition(doc, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(result!.from).toBe(start);
		expect(result!.to).toBe(end);
		expect(doc.slice(result!.from, result!.to)).toBe(exact);
	});
});
