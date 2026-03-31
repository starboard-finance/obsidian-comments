import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, HighlightColor } from './types';

export class CommentsSettingsTab extends PluginSettingTab {
	plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const settings = (this.plugin as any).settings as PluginSettings;

		// Username setting
		new Setting(containerEl)
			.setName('Username')
			.setDesc('Your name for comment attribution')
			.addText((text) =>
				text
					.setPlaceholder('Enter your name')
					.setValue(settings.username)
					.onChange(async (value) => {
						settings.username = value;
						await (this.plugin as any).saveSettings();
					})
			);

		// Default color setting
		new Setting(containerEl)
			.setName('Default highlight color')
			.setDesc('Color for new highlights')
			.addDropdown((dropdown) => {
				const colors: HighlightColor[] = ['yellow', 'red', 'teal', 'blue', 'green'];
				colors.forEach((color) => {
					dropdown.addOption(color, this.capitalizeFirst(color));
				});
				dropdown.setValue(settings.defaultColor);
				dropdown.onChange(async (value) => {
					settings.defaultColor = value as HighlightColor;
					await (this.plugin as any).saveSettings();
				});
			});

		// Show resolved toggle
		new Setting(containerEl)
			.setName('Show resolved comments')
			.setDesc('Display resolved comments in the sidebar')
			.addToggle((toggle) => {
				toggle.setValue(settings.showResolved);
				toggle.onChange(async (value) => {
					settings.showResolved = value;
					await (this.plugin as any).saveSettings();
				// Refresh sidebar if open
				(this.plugin as any).refreshView?.();
				});
			});
	}

	private capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}
