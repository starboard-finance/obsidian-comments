import { afterEach, describe, expect, it, vi } from 'vitest';
import 'obsidian';
import { generateId } from '../types';

vi.mock('obsidian', () => ({}));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('generateId', () => {
	it('returns an 8-character alphanumeric string', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

		const id = generateId();

		expect(id).toBeTypeOf('string');
		expect(id).toHaveLength(8);
		expect(id).toMatch(/^[a-z0-9]{8}$/);
	});
});
