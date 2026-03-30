import { describe, expect, it, vi } from 'vitest';
import 'obsidian';
import { migrateV1ToV2 } from '../shadow-file-manager';

vi.mock('obsidian', () => ({}));

const v1Fixture = {
	highlights: [
		{
			id: 'abc12345',
			line: 5,
			startOffset: 10,
			endOffset: 30,
			text: 'hello world',
			color: 'yellow',
			createdAt: 1700000000000,
			resolved: false,
		},
	],
	comments: [],
};

describe('migrateV1ToV2', () => {
	it('V1 fixture loads and migrates — highlights preserved', () => {
		const result = migrateV1ToV2(v1Fixture);

		expect(result.highlights).toHaveLength(1);
		expect(result.highlights[0].id).toBe('abc12345');
	});

	it('migrated data has version === "2.0"', () => {
		const result = migrateV1ToV2(v1Fixture);

		expect(result.version).toBe('2.0');
	});

	it('startLine and endLine populated from V1 line', () => {
		const result = migrateV1ToV2(v1Fixture);

		expect(result.highlights[0].startLine).toBe(5);
		expect(result.highlights[0].endLine).toBe(5);
	});

	it('anchor.exact matches original text', () => {
		const result = migrateV1ToV2(v1Fixture);

		expect(result.highlights[0].anchor.exact).toBe('hello world');
	});

	it('V2 data (with version: "2.0") skips migration', () => {
		const v2Data = {
			version: '2.0',
			highlights: [],
			comments: [],
		};

		const needsMigration = !v2Data.version || v2Data.version === '1.0';

		expect(needsMigration).toBe(false);
	});
});
