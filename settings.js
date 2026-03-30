"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentsSettingsTab = void 0;
const obsidian_1 = require("obsidian");
class CommentsSettingsTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        const settings = this.plugin.settings;
        // Username setting
        new obsidian_1.Setting(containerEl)
            .setName('Username')
            .setDesc('Your name for comment attribution')
            .addText((text) => text
            .setPlaceholder('Enter your name')
            .setValue(settings.username)
            .onChange(async (value) => {
            settings.username = value;
            await this.plugin.saveSettings();
        }));
        // Default color setting
        new obsidian_1.Setting(containerEl)
            .setName('Default highlight color')
            .setDesc('Color for new highlights')
            .addDropdown((dropdown) => {
            const colors = ['yellow', 'red', 'teal', 'blue', 'green'];
            colors.forEach((color) => {
                dropdown.addOption(color, this.capitalizeFirst(color));
            });
            dropdown.setValue(settings.defaultColor);
            dropdown.onChange(async (value) => {
                settings.defaultColor = value;
                await this.plugin.saveSettings();
            });
        });
        // Show resolved toggle
        new obsidian_1.Setting(containerEl)
            .setName('Show resolved comments')
            .setDesc('Display resolved comments in the sidebar')
            .addToggle((toggle) => {
            toggle.setValue(settings.showResolved);
            toggle.onChange(async (value) => {
                settings.showResolved = value;
                await this.plugin.saveSettings();
                // Refresh sidebar if open
                this.plugin.refreshSidebar?.();
            });
        });
    }
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
exports.CommentsSettingsTab = CommentsSettingsTab;
