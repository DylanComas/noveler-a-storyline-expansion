const NovelerPlugin = require("./noveler");
const StoryLineBridgePlugin = require("./storyline-bridge");
const AntidoteBridgePlugin = require("./antidote-bridge");

const STORYLINE_DEFAULTS = {
  enabled: false,
  storyLineRoot: "StoryLine",
  replaceStoryLineSceneOpens: true,
  replaceManuscriptView: true,
  enableEpubExport: true
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class NovelerStoryLineExpansionPlugin extends NovelerPlugin {
  async onload() {
    await super.onload();
    this.ensureStoryLineSettings();
    await this.migrateLegacyStoryLineSettings();

    this.storyLineBridgeModule = this.createInternalModule(StoryLineBridgePlugin);
    this.storyLineBridgeModule.loadData = async () => clone(this.settings.storyLineBridge);
    this.storyLineBridgeModule.saveData = async (settings) => {
      this.settings.storyLineBridge = Object.assign(clone(STORYLINE_DEFAULTS), settings || {});
      await this.saveSettings();
    };
    await this.storyLineBridgeModule.onload();

    this.antidoteBridgeModule = this.createInternalModule(AntidoteBridgePlugin);
    await this.antidoteBridgeModule.onload();
  }

  createInternalModule(ModuleClass) {
    return new ModuleClass(this);
  }

  ensureStoryLineSettings() {
    this.settings.storyLineBridge = Object.assign(
      clone(STORYLINE_DEFAULTS),
      this.settings.storyLineBridge || {}
    );
  }

  async migrateLegacyStoryLineSettings() {
    if (this.settings.bundleMigrations && this.settings.bundleMigrations.storyLineBridge) {
      return;
    }
    const adapter = this.app.vault.adapter;
    if (!adapter || typeof adapter.exists !== "function" || typeof adapter.read !== "function") {
      return;
    }
    const configDir = String(this.app.vault.configDir || ".obsidian").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const legacyPath = `${configDir}/plugins/noveler-storyline-bridge/data.json`;
    try {
      if (!await adapter.exists(legacyPath)) {
        return;
      }
      const legacySettings = JSON.parse(await adapter.read(legacyPath));
      this.settings.storyLineBridge = Object.assign(
        clone(STORYLINE_DEFAULTS),
        legacySettings && typeof legacySettings === "object" ? legacySettings : {}
      );
      this.settings.bundleMigrations = Object.assign({}, this.settings.bundleMigrations, {
        storyLineBridge: true
      });
      await super.saveSettings();
    } catch (error) {
      console.warn("Noveler could not migrate the former StoryLine bridge settings.", error);
    }
  }

  syncStoryLineModuleSettings() {
    this.ensureStoryLineSettings();
    if (!this.storyLineBridgeModule) {
      return;
    }
    this.storyLineBridgeModule.settings = clone(this.settings.storyLineBridge);
    this.storyLineBridgeModule.registerApi();
    this.storyLineBridgeModule.enhanceStoryLineExportModals();
  }

  async saveSettings() {
    this.ensureStoryLineSettings();
    await super.saveSettings();
    this.syncStoryLineModuleSettings();
  }

  onunload() {
    this.unloadInternalModule(this.antidoteBridgeModule);
    this.antidoteBridgeModule = null;
    this.unloadInternalModule(this.storyLineBridgeModule);
    this.storyLineBridgeModule = null;
    super.onunload();
  }

  unloadInternalModule(module) {
    if (!module) {
      return;
    }
    if (typeof module.onunload === "function") {
      module.onunload();
    }
  }
}

module.exports = NovelerStoryLineExpansionPlugin;
