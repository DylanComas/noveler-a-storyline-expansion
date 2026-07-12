const Module = require("module");

class MockElement {
  addClass() {}
  removeClass() {}
  createSpan(options, callback) {
    const span = new MockElement();
    if (callback) callback(span);
    return span;
  }
  onClickEvent() {}
}

class MockPlugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this.cleanups = [];
  }
  async loadData() { return null; }
  async saveData() {}
  registerView() {}
  addRibbonIcon() {}
  addCommand() {}
  addSettingTab() {}
  addStatusBarItem() { return new MockElement(); }
  registerEvent(eventRef) { return eventRef; }
  registerDomEvent() {}
  register(callback) { this.cleanups.push(callback); }
}

class MockPluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
  }
}

global.window = global;
global.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options && options.detail;
  }
};
global.dispatchEvent = () => {};
global.document = {
  body: {},
  querySelectorAll: () => []
};
global.MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
};

const obsidian = {
  Plugin: MockPlugin,
  ItemView: class ItemView {},
  Menu: class Menu {},
  Notice: class Notice {},
  PluginSettingTab: MockPluginSettingTab,
  Setting: class Setting {},
  TFile: class TFile {},
  parseYaml: () => ({}),
  stringifyYaml: () => "",
  setIcon: () => {},
  normalizePath: (value) => String(value || "").replace(/\\/g, "/")
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return obsidian;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const leaf = {
  openFile: async () => {},
  view: { getViewType: () => "empty" }
};
const workspace = {
  activeLeaf: leaf,
  getLeaf: () => leaf,
  openLinkText: async () => {},
  getLeavesOfType: () => [],
  iterateAllLeaves: (callback) => callback(leaf),
  on: () => ({}),
  onLayoutReady: (callback) => callback(),
  revealLeaf: async () => {}
};
const adapter = {
  exists: async () => false,
  read: async () => "",
  write: async () => {},
  mkdir: async () => {}
};
const app = {
  workspace,
  vault: {
    configDir: ".obsidian",
    adapter,
    on: () => ({}),
    getAbstractFileByPath: () => null
  },
  metadataCache: {},
  plugins: { plugins: {} }
};

(async () => {
  const PluginClass = require("./main.js");
  const plugin = new PluginClass(app, {
    id: "noveler-a-storyline-expansion",
    dir: ".obsidian/plugins/noveler-a-storyline-expansion"
  });
  await plugin.onload();
  plugin.onunload();
  process.stdout.write("Lifecycle smoke test passed.\n");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
