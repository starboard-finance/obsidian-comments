import { describe, expect, it } from 'vitest';
import { extractAnchor, findAnchorPosition } from '../anchor';

function buildFixture() {
	const target = 'target phrase';
	const doc = `AAA ${target} BBB`;
	const start = doc.indexOf(target);
	const end = start + target.length;
	const anchor = extractAnchor(doc, start, end);
	return { target, doc, start, end, anchor };
}

describe('findAnchorPosition', () => {
	it('exact-match', () => {
		const { target, doc, start, end, anchor } = buildFixture();
		const result = findAnchorPosition(doc, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(result).toEqual({ from: start, to: end });
		expect(doc.slice(result!.from, result!.to)).toBe(target);
	});

	it('insert-before', () => {
		const { target, doc, start, end, anchor } = buildFixture();
		const mutated = `XXX ${doc}`;
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe(target);
	});

	it('insert-after', () => {
		const { target, doc, start, end, anchor } = buildFixture();
		const mutated = doc.replace(' BBB', ' BBB YYY');
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe(target);
	});

	it('insert-inside', () => {
		const { doc, start, end, anchor } = buildFixture();
		const mutated = doc.replace('target phrase', 'targetX phrase');
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe('targetX phras');
	});

	it('delete-before', () => {
		const { target, doc, start, end, anchor } = buildFixture();
		const mutated = doc.replace('AAA ', '');
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe(target);
	});

	it('delete-after', () => {
		const { target, doc, start, end, anchor } = buildFixture();
		const mutated = doc.replace(' BBB', '');
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe(target);
	});

	it('replace-partial', () => {
		const { doc, start, end, anchor } = buildFixture();
		const mutated = doc.replace('target phrase', 'target phrasf');
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe('target phrasf');
	});

	it('move-text', () => {
		const { target, doc, start, end, anchor } = buildFixture();
		const removed = doc.replace(target, '').replace('  ', ' ').trim();
		const mutated = `${removed} ${target}`;
		const result = findAnchorPosition(mutated, anchor, { start, end });
		expect(result).not.toBeNull();
		expect(mutated.slice(result!.from, result!.to)).toBe(target);
	});
});
