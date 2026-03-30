import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('obsidian', () => {
	class TFile {
		path: string = '';
		extension: string = '';
	}
	class Notice {
		constructor(_msg?: string) {}
	}
	class App {}
	return { TFile, Notice, App };
});

import { TFile } from 'obsidian';
import { ShadowFileManager } from '../shadow-file-manager';

let mockApp: any;
let manager: ShadowFileManager;

beforeEach(() => {
	mockApp = {
		vault: {
			getAbstractFileByPath: vi.fn().mockReturnValue(null),
			read: vi.fn().mockResolvedValue('{"version":"2.0","highlights":[],"comments":[]}'),
			create: vi.fn().mockResolvedValue(undefined),
			modify: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		fileManager: {
			renameFile: vi.fn().mockResolvedValue(undefined),
		},
	};
	manager = new ShadowFileManager(mockApp);
});

describe('ShadowFileManager lifecycle', () => {
	it('getShadowPath converts .md to .comments.json', () => {
		const mockFile = Object.assign(new TFile(), { path: 'notes/test.md', extension: 'md' });
		const shadowPath = (manager as any).getShadowPath(mockFile);
		expect(shadowPath).toBe('notes/test.comments.json');
	});

	it('invalidateCache removes the entry from cache', () => {
		(manager as any).cache.set('notes/test.comments.json', {
			version: '2.0',
			highlights: [],
			comments: [],
		});
		expect((manager as any).cache.has('notes/test.comments.json')).toBe(true);

		manager.invalidateCache('notes/test.comments.json');

		expect((manager as any).cache.has('notes/test.comments.json')).toBe(false);
	});

	it('after invalidation, next read fetches from vault not cache', async () => {
		const mockFile = Object.assign(new TFile(), { path: 'notes/test.md', extension: 'md' });
		const shadowFile = Object.assign(new TFile(), {
			path: 'notes/test.comments.json',
			extension: 'json',
		});

		mockApp.vault.getAbstractFileByPath.mockReturnValue(shadowFile);
		await manager.readShadowFile(mockFile as any);
		expect(mockApp.vault.read).toHaveBeenCalledTimes(1);

		manager.invalidateCache('notes/test.comments.json');

		mockApp.vault.read.mockClear();
		await manager.readShadowFile(mockFile as any);
		expect(mockApp.vault.read).toHaveBeenCalledWith(shadowFile);
	});
});
