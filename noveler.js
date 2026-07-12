const { ItemView, Menu, Notice, Plugin, PluginSettingTab, Setting, TFile, parseYaml, stringifyYaml, setIcon } = require("obsidian");

const VIEW_TYPE = "noveler-manuscript-writer";
const DEFAULT_MANUSCRIPT = "<p><br></p>";
const SETTINGS_FILE_NAME = "Noveler Settings.json";
const LEGACY_SETTINGS_FILE_PATH = SETTINGS_FILE_NAME;
const SETTINGS_FILE_VERSION = 1;

const DEFAULT_SETTINGS = {
  manuscriptPath: "Noveler Manuscript.md",
  exportPath: "Noveler Export.md",
  sceneBreakGlyph: "***",
  layout: {
    mode: "page",
    pageSize: "us-letter",
    pageZoom: 125,
    pageWidth: 760,
    pageHeight: 986,
    marginTop: 96,
    marginRight: 96,
    marginBottom: 96,
    marginLeft: 96,
    headerFooterFontSize: 9,
    rulerUnits: "imperial"
  },
  focus: {
    defaultZoom: 150,
    typewriter: true,
    dimUnfocusedLines: true,
    highlightScope: "line"
  },
  typography: {
    fontPreset: "serif",
    customFontFamily: "",
    fontSize: 18,
    textColor: "#000000",
    fontScale: 100,
    fontWeight: "400",
    italic: false,
    smallCaps: false,
    stylisticSet: "",
    kerning: true,
    letterSpacing: 0,
    lineHeight: 1.5,
    alignment: "left",
    lineSpacingPreset: "1.5",
    paragraphBefore: 0,
    paragraphAfter: 12,
    firstLineIndent: 1.5,
    hangingIndent: 0
  },
  headingStyles: {
    h1: { fontFamily: "body", fontSize: 28, fontWeight: "700", italic: false, alignment: "left" },
    h2: { fontFamily: "body", fontSize: 24, fontWeight: "700", italic: false, alignment: "left" },
    h3: { fontFamily: "body", fontSize: 21, fontWeight: "600", italic: false, alignment: "left" },
    h4: { fontFamily: "body", fontSize: 18, fontWeight: "600", italic: false, alignment: "left" },
    h5: { fontFamily: "body", fontSize: 16, fontWeight: "600", italic: false, alignment: "left" },
    h6: { fontFamily: "body", fontSize: 14, fontWeight: "600", italic: false, alignment: "left" }
  },
  toolbar: {
    textColorSwatches: ["", "", "", "", ""]
  },
  automation: {
    smartQuotes: true,
    smartDashes: true,
    autoCapitalize: true,
    smartIndent: true,
    removeDoubleSpacesOnSave: true,
    normalizeLineBreaksOnSave: true
  },
  fileOpen: {
    allowDropOpen: true,
    importFolder: "Noveler Imports"
  },
  integrations: {
    antidoteConnect: false,
    antidoteKeepFocus: true
  },
  storyLineBridge: {
    enabled: false,
    storyLineRoot: "StoryLine",
    replaceStoryLineSceneOpens: true,
    replaceManuscriptView: true,
    enableEpubExport: true
  },
  sceneSettings: {}
};

const STYLE_CLASSES = [
  "noveler-style-normal",
  "noveler-style-dialogue",
  "noveler-style-blockquote",
  "noveler-style-scene-break",
  "noveler-style-centered-ornament"
];

const SCENE_TYPOGRAPHY_KEYS = [
  "fontPreset",
  "customFontFamily",
  "fontSize",
  "textColor",
  "fontScale",
  "fontWeight",
  "italic",
  "smallCaps",
  "stylisticSet",
  "kerning",
  "letterSpacing",
  "lineHeight",
  "alignment",
  "lineSpacingPreset",
  "paragraphBefore",
  "paragraphAfter",
  "firstLineIndent",
  "hangingIndent"
];

const BRIDGE_EMPTY_HTML = [
  "<p><strong>Select a StoryLine scene to edit.</strong></p>",
  "<p>Bridge mode only opens Markdown scene files under the configured StoryLine root with a Scenes/Act folder path.</p>"
].join("");

const CM_TO_PX = 96 / 2.54;
const PAGE_SIZE_PRESETS = {
  "us-letter": {
    label: "US Letter",
    widthCm: 21.59,
    heightCm: 27.94
  },
  a4: {
    label: "A4",
    widthCm: 21,
    heightCm: 29.7
  },
  softcover: {
    label: "Softcover Book",
    widthCm: 14,
    heightCm: 21
  },
  pocket: {
    label: "Pocket Book",
    widthCm: 11,
    heightCm: 17.8
  }
};

const FALLBACK_FONT_FAMILIES = [
  "Arial",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Courier New",
  "Georgia",
  "Garamond",
  "Segoe UI",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana"
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeSettings(stored) {
  const result = clone(DEFAULT_SETTINGS);
  mergeInto(result, stored || {});
  if (result.layout.mode === "draft") {
    result.layout.mode = "focus";
  }
  return result;
}

function mergeInto(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      mergeInto(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

function normalizeVaultPath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function cmToPx(cm) {
  return Math.round(cm * CM_TO_PX);
}

function pxToUnitValue(px, units) {
  const divisor = units === "metric" ? CM_TO_PX : 96;
  return Math.round((Number(px) || 0) / divisor * 100) / 100;
}

function unitValueToPx(value, units) {
  const multiplier = units === "metric" ? CM_TO_PX : 96;
  return Math.round((Number(value) || 0) * multiplier);
}

function getPagePresetOptions() {
  const options = Object.entries(PAGE_SIZE_PRESETS).map(([value, preset]) => {
    const width = String(preset.widthCm).replace(".", ",");
    const height = String(preset.heightCm).replace(".", ",");
    return [value, `${preset.label} (${width} x ${height} cm)`];
  });
  options.push(["custom", "Custom"]);
  return options;
}

function getZoomOptions(currentZoom) {
  const options = [
    ["75", "75%"],
    ["90", "90%"],
    ["100", "100%"],
    ["110", "110%"],
    ["125", "125%"],
    ["150", "150%"],
    ["175", "175%"],
    ["200", "200%"]
  ];
  const zoom = String(currentZoom || "");
  if (zoom && !options.some(([value]) => value === zoom)) {
    options.push([zoom, `${zoom}%`]);
    options.sort((a, b) => Number(a[0]) - Number(b[0]));
  }
  return options;
}

function getFallbackFontOptions(currentFont) {
  const fonts = [...FALLBACK_FONT_FAMILIES];
  if (currentFont && !fonts.includes(currentFont)) {
    fonts.unshift(currentFont);
  }
  return fonts.map((font) => [font, font]);
}

function getSelectedFontFamily(typography) {
  if (typography.customFontFamily) {
    return typography.customFontFamily;
  }
  if (typography.fontPreset === "sans") {
    return "Segoe UI";
  }
  if (typography.fontPreset === "mono") {
    return "Consolas";
  }
  return "Georgia";
}

function getHeadingStyle(settings, level) {
  const key = `h${level}`;
  const defaults = DEFAULT_SETTINGS.headingStyles[key] || DEFAULT_SETTINGS.headingStyles.h1;
  const stored = settings.headingStyles && settings.headingStyles[key] && typeof settings.headingStyles[key] === "object"
    ? settings.headingStyles[key]
    : {};
  return Object.assign({}, defaults, stored);
}

function quoteFontFamily(fontFamily) {
  const family = String(fontFamily || "").trim();
  if (!family || family === "body") {
    return "inherit";
  }
  if (/^(serif|sans-serif|monospace|inherit)$/i.test(family)) {
    return family;
  }
  return `"${family.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}", serif`;
}

function normalizeHexColor(value) {
  const color = String(value || "").trim();
  const short = color.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    return `#${short[1].split("").map((char) => `${char}${char}`).join("")}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : "#000000";
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "").trim());
}

function hexToRgb(value) {
  const hex = normalizeHexColor(value).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max
  };
}

function hsvToHex(h, s, v) {
  const hue = (((Number(h) || 0) % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(1, Number(s) || 0));
  const value = Math.max(0, Math.min(1, Number(v) || 0));
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = value - chroma;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = chroma; g = x;
  } else if (hue < 120) {
    r = x; g = chroma;
  } else if (hue < 180) {
    g = chroma; b = x;
  } else if (hue < 240) {
    g = x; b = chroma;
  } else if (hue < 300) {
    r = x; b = chroma;
  } else {
    r = chroma; b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function hexToHsv(value) {
  const rgb = hexToRgb(value);
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function safeDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function getStoryLineBridgeApi() {
  if (typeof window === "undefined") {
    return null;
  }
  const bridge = window.NovelerStoryLineBridge;
  return bridge && typeof bridge.isEnabled === "function" ? bridge : null;
}

function splitMarkdownFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: "", body: text };
  }
  return {
    frontmatter: match[0].trimEnd(),
    body: text.slice(match[0].length).replace(/^\r?\n/, "")
  };
}

function getFrontmatterBody(frontmatter) {
  return String(frontmatter || "")
    .replace(/^---\r?\n?/, "")
    .replace(/\r?\n?---\s*$/, "")
    .trim();
}

function parseFrontmatterData(frontmatter) {
  const body = getFrontmatterBody(frontmatter);
  if (!body) {
    return {};
  }
  if (typeof parseYaml === "function") {
    try {
      const parsed = parseYaml(body);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.warn("Noveler could not parse scene frontmatter.", error);
      return {};
    }
  }
  return {};
}

function stringifyFrontmatterData(data) {
  if (typeof stringifyYaml === "function") {
    try {
      return stringifyYaml(data).trimEnd();
    } catch (error) {
      console.warn("Noveler could not stringify scene frontmatter.", error);
    }
  }
  return Object.entries(data || {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (value && typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join("\n");
}

function pickSettingsKeys(source, keys) {
  const picked = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) {
      picked[key] = source[key];
    }
  }
  return picked;
}

function getNovelerSceneSettings(settings) {
  return {
    typography: pickSettingsKeys(settings.typography, SCENE_TYPOGRAPHY_KEYS)
  };
}

function getNovelerFrontmatterSettings(frontmatter) {
  const parsed = parseFrontmatterData(frontmatter);
  const noveler = parsed.noveler && typeof parsed.noveler === "object" ? parsed.noveler : {};
  return {
    typography: pickSettingsKeys(noveler.typography || {}, SCENE_TYPOGRAPHY_KEYS)
  };
}

function mergeNovelerSettingsIntoFrontmatter(frontmatter, sceneSettings) {
  const novelerBlock = stringifyFrontmatterData({
    noveler: {
      typography: pickSettingsKeys(sceneSettings && sceneSettings.typography, SCENE_TYPOGRAPHY_KEYS)
    }
  }).trim();
  if (!novelerBlock) {
    return String(frontmatter || "").trimEnd();
  }

  const body = getFrontmatterBody(frontmatter);
  if (!body) {
    return `---\n${novelerBlock}\n---`;
  }

  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => /^noveler\s*:/i.test(line));
  if (start >= 0) {
    let end = start + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (/^[^\s#][^:]*:/.test(line) || /^\s*#/.test(line)) {
        break;
      }
      end += 1;
    }
    lines.splice(start, end - start, ...novelerBlock.split("\n"));
  } else {
    if (lines.length && lines[lines.length - 1].trim()) {
      lines.push("");
    }
    lines.push(...novelerBlock.split("\n"));
  }
  return `---\n${lines.join("\n").trimEnd()}\n---`;
}

function hasSceneSettings(sceneSettings) {
  return Boolean(
    sceneSettings
    && (sceneSettings.typography && Object.keys(sceneSettings.typography).length)
  );
}

function getStoredSceneSettings(settings, path) {
  const sceneSettings = settings.sceneSettings && settings.sceneSettings[normalizeVaultPath(path)];
  if (!sceneSettings || typeof sceneSettings !== "object") {
    return null;
  }
  return {
    typography: pickSettingsKeys(sceneSettings.typography || {}, SCENE_TYPOGRAPHY_KEYS)
  };
}

function mergeSceneSettingsIntoPluginSettings(pluginSettings, sceneSettings, defaults) {
  const defaultTypography = clone((defaults && defaults.typography) || DEFAULT_SETTINGS.typography);
  pluginSettings.typography = Object.assign(defaultTypography, sceneSettings && sceneSettings.typography ? sceneSettings.typography : {});
}

function parseSimpleFrontmatterValue(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "im");
  const match = String(frontmatter || "").match(pattern);
  if (!match) {
    return "";
  }
  return match[1].replace(/^["']|["']$/g, "").trim();
}

function titleFromFileName(fileName) {
  return String(fileName || "Untitled Manuscript").replace(/\.m(?:d|arkdown)$/i, "").replace(/\.html?$/i, "").trim() || "Untitled Manuscript";
}

function defaultManuscriptForTitle(title) {
  return "<p><br></p>";
}

function isUntitledManuscriptPlaceholder(content) {
  const text = String(content || "").trim();
  if (!text) {
    return false;
  }
  const withoutEmptyParagraphs = text
    .replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, "")
    .replace(/^#{1,6}\s+/, "")
    .trim();
  const plainText = withoutEmptyParagraphs
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return plainText === "untitled manuscript";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EDITOR_ALLOWED_TAGS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "div", "blockquote",
  "ul", "ol", "li", "hr", "br", "strong", "b", "em", "i", "s",
  "strike", "u", "sup", "sub", "span", "font", "a", "img", "code", "pre"
]);

const EDITOR_ALLOWED_STYLE_PROPERTIES = new Set([
  "color", "background-color", "text-align", "font-family", "font-size",
  "font-weight", "font-style", "font-variant", "font-variant-caps",
  "font-kerning", "font-feature-settings", "letter-spacing", "line-height",
  "text-decoration", "vertical-align", "text-indent", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left"
]);

function isSafeEditorUrl(value, allowImageData = false) {
  const url = String(value || "").trim();
  if (!url) {
    return false;
  }
  if (/^(?:javascript|vbscript|file):/i.test(url)) {
    return false;
  }
  if (/^data:/i.test(url)) {
    return allowImageData && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(url);
  }
  return /^(?:https?:|mailto:|obsidian:|app:|#|\/|\.\.?\/)/i.test(url) || !/^[a-z][a-z0-9+.-]*:/i.test(url);
}

function sanitizeEditorStyle(element, rawStyle) {
  const source = String(rawStyle || "");
  if (!source || /(?:url\s*\(|expression\s*\(|javascript:|@import)/i.test(source)) {
    return "";
  }
  const probe = document.createElement("span");
  probe.setAttribute("style", source);
  const declarations = [];
  for (const property of EDITOR_ALLOWED_STYLE_PROPERTIES) {
    const value = probe.style.getPropertyValue(property).trim();
    if (value) {
      declarations.push(`${property}: ${value}`);
    }
  }
  return declarations.join("; ");
}

function sanitizeEditorHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  const elements = Array.from(doc.body.querySelectorAll("*")).reverse();
  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (["script", "style", "iframe", "object", "embed", "svg", "math", "form"].includes(tag)) {
      element.remove();
      continue;
    }
    if (!EDITOR_ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const originalAttributes = Array.from(element.attributes);
    for (const attribute of originalAttributes) {
      element.removeAttribute(attribute.name);
    }

    const classValue = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "class");
    if (classValue) {
      const classes = classValue.value.split(/\s+/).filter((name) => /^(?:noveler|language)-[a-z0-9_-]+$/i.test(name) || name === "is-centered");
      if (classes.length) {
        element.setAttribute("class", classes.join(" "));
      }
    }

    const styleValue = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "style");
    const safeStyle = sanitizeEditorStyle(element, styleValue && styleValue.value);
    if (safeStyle) {
      element.setAttribute("style", safeStyle);
    }

    const colorValue = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "color");
    if (tag === "font" && colorValue && /^(?:#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)$/i.test(colorValue.value.trim())) {
      element.setAttribute("color", colorValue.value.trim());
    }

    if (tag === "a") {
      const href = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "href");
      if (href && isSafeEditorUrl(href.value)) {
        element.setAttribute("href", href.value);
      }
      const title = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "title");
      if (title) {
        element.setAttribute("title", title.value);
      }
    }

    if (tag === "img") {
      const src = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "src");
      if (!src || !isSafeEditorUrl(src.value, true)) {
        element.remove();
        continue;
      }
      element.setAttribute("src", src.value);
      for (const name of ["alt", "title"]) {
        const attribute = originalAttributes.find((item) => item.name.toLowerCase() === name);
        if (attribute) {
          element.setAttribute(name, attribute.value);
        }
      }
    }

    if (tag === "li") {
      const checked = originalAttributes.find((attribute) => attribute.name.toLowerCase() === "data-checked");
      if (checked && /^(?:true|false)$/.test(checked.value)) {
        element.setAttribute("data-checked", checked.value);
      }
    }
    if (tag === "span" && element.classList.contains("noveler-checkbox")) {
      element.setAttribute("contenteditable", "false");
    }
  }
  return doc.body.innerHTML.trim();
}

function sanitizeInlineEditorTag(tag) {
  const match = String(tag || "").match(/^<\s*(\/?)\s*([a-z0-9]+)\b[^>]*>$/i);
  if (!match || !EDITOR_ALLOWED_TAGS.has(match[2].toLowerCase())) {
    return "";
  }
  const name = match[2].toLowerCase();
  if (match[1]) {
    return `</${name}>`;
  }
  const safe = sanitizeEditorHtml(`${tag}</${name}>`);
  const doc = new DOMParser().parseFromString(safe, "text/html");
  const element = doc.body.firstElementChild;
  if (!element || element.tagName.toLowerCase() !== name) {
    return "";
  }
  const attributes = Array.from(element.attributes).map((attribute) => ` ${attribute.name}="${escapeHtml(attribute.value)}"`).join("");
  return `<${name}${attributes}>`;
}

function resolveFontFamily(settings) {
  const typography = settings.typography;
  if (typography.fontPreset === "sans") {
    return "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif";
  }
  if (typography.fontPreset === "mono") {
    return "JetBrains Mono, Consolas, SFMono-Regular, monospace";
  }
  if (typography.fontPreset === "custom" && typography.customFontFamily.trim()) {
    return `${typography.customFontFamily.trim()}, serif`;
  }
  return "Georgia, Times New Roman, serif";
}

function isElementNode(node) {
  return node && node.nodeType === Node.ELEMENT_NODE;
}

function getElementForNode(node) {
  if (!node) {
    return null;
  }
  return isElementNode(node) ? node : node.parentElement;
}

class NovelerPlugin extends Plugin {
  async onload() {
    this.settingsWritePromise = Promise.resolve();
    this.focusModeViews = new Set();
    this.focusSidebarState = null;
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => new NovelerView(leaf, this));
    this.registerNovelerApi();

    this.addRibbonIcon("book-open-text", "Open Noveler", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-noveler",
      name: "Open Noveler manuscript writer",
      callback: () => this.activateView()
    });

    this.addCommand({
      id: "noveler-save",
      name: "Noveler: Save manuscript",
      hotkeys: [{ modifiers: ["Mod"], key: "s" }],
      checkCallback: (checking) => this.withView(checking, (view) => view.saveDocument())
    });

    this.addCommand({
      id: "noveler-export-markdown",
      name: "Noveler: Export manuscript to Markdown",
      checkCallback: (checking) => this.withView(checking, (view) => view.exportMarkdown())
    });

    this.addFormatCommand("noveler-bold", "Noveler: Toggle bold", "bold", [{ modifiers: ["Mod"], key: "b" }]);
    this.addFormatCommand("noveler-italic", "Noveler: Toggle italic", "italic", [{ modifiers: ["Mod"], key: "i" }]);
    this.addFormatCommand("noveler-underline", "Noveler: Toggle underline", "underline", [{ modifiers: ["Mod"], key: "u" }]);
    this.addFormatCommand("noveler-strikethrough", "Noveler: Toggle strikethrough", "strikethrough", [{ modifiers: ["Mod", "Shift"], key: "x" }]);
    this.addFormatCommand("noveler-superscript", "Noveler: Toggle superscript", "superscript");
    this.addFormatCommand("noveler-subscript", "Noveler: Toggle subscript");

    for (let level = 1; level <= 6; level += 1) {
      this.addCommand({
        id: `noveler-heading-${level}`,
        name: `Noveler: Apply heading ${level}`,
        checkCallback: (checking) => this.withView(checking, (view) => view.applyHeading(level))
      });
    }

    this.addCommand({
      id: "noveler-normal-paragraph",
      name: "Noveler: Apply normal paragraph",
      checkCallback: (checking) => this.withView(checking, (view) => view.applyParagraphStyle("normal"))
    });
    this.addCommand({
      id: "noveler-dialogue-paragraph",
      name: "Noveler: Apply dialogue paragraph",
      checkCallback: (checking) => this.withView(checking, (view) => view.applyParagraphStyle("dialogue"))
    });
    this.addCommand({
      id: "noveler-block-quote",
      name: "Noveler: Apply block quote",
      checkCallback: (checking) => this.withView(checking, (view) => view.applyParagraphStyle("blockquote"))
    });
    this.addCommand({
      id: "noveler-scene-break",
      name: "Noveler: Insert scene break",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "8" }],
      checkCallback: (checking) => this.withView(checking, (view) => view.insertSceneBreak(this.settings.sceneBreakGlyph))
    });
    this.addCommand({
      id: "noveler-centered-ornament",
      name: "Noveler: Insert centered ornament",
      checkCallback: (checking) => this.withView(checking, (view) => view.insertSceneBreak(this.settings.sceneBreakGlyph, true))
    });
    this.addFormatCommand("noveler-bulleted-list", "Noveler: Toggle bulleted list", "insertUnorderedList");
    this.addFormatCommand("noveler-numbered-list", "Noveler: Toggle numbered list", "insertOrderedList");
    this.addCommand({
      id: "noveler-checklist",
      name: "Noveler: Insert checklist",
      checkCallback: (checking) => this.withView(checking, (view) => view.insertChecklist())
    });
    this.addCommand({
      id: "noveler-horizontal-rule",
      name: "Noveler: Insert horizontal rule",
      checkCallback: (checking) => this.withView(checking, (view) => view.insertHorizontalRule())
    });

    for (const alignment of ["left", "center", "right", "justify"]) {
      this.addCommand({
        id: `noveler-align-${alignment}`,
        name: `Noveler: Align ${alignment}`,
        checkCallback: (checking) => this.withView(checking, (view) => view.applyAlignment(alignment))
      });
    }

    this.addCommand({
      id: "noveler-toggle-page-mode",
      name: "Noveler: Toggle page/focus mode",
      checkCallback: (checking) => this.withView(checking, (view) => view.toggleLayoutMode())
    });
    this.addViewCommand("noveler-page-mode", "Noveler: Page mode", (view) => view.setLayoutMode("page"));
    this.addViewCommand("noveler-draft-mode", "Noveler: Focus mode", (view) => view.setLayoutMode("focus"));
    this.addViewCommand("noveler-font-serif", "Noveler: Use serif font", (view) => view.setFontPreset("serif"));
    this.addViewCommand("noveler-font-sans", "Noveler: Use sans-serif font", (view) => view.setFontPreset("sans"));
    this.addViewCommand("noveler-font-mono", "Noveler: Use monospace font", (view) => view.setFontPreset("mono"));
    this.addViewCommand("noveler-font-size-up", "Noveler: Increase font size", (view) => view.adjustTypographyNumber("fontSize", 0.5, 6, 96));
    this.addViewCommand("noveler-font-size-down", "Noveler: Decrease font size", (view) => view.adjustTypographyNumber("fontSize", -0.5, 6, 96));
    this.addViewCommand("noveler-font-scale-up", "Noveler: Increase font scale", (view) => view.adjustTypographyNumber("fontScale", 5, 50, 200));
    this.addViewCommand("noveler-font-scale-down", "Noveler: Decrease font scale", (view) => view.adjustTypographyNumber("fontScale", -5, 50, 200));
    this.addViewCommand("noveler-font-weight-light", "Noveler: Font weight light", (view) => view.setFontWeight("300"));
    this.addViewCommand("noveler-font-weight-regular", "Noveler: Font weight regular", (view) => view.setFontWeight("400"));
    this.addViewCommand("noveler-font-weight-medium", "Noveler: Font weight medium", (view) => view.setFontWeight("500"));
    this.addViewCommand("noveler-font-weight-bold", "Noveler: Font weight bold", (view) => view.setFontWeight("700"));
    this.addViewCommand("noveler-toggle-small-caps", "Noveler: Toggle small caps", (view) => view.toggleTypographyFlag("smallCaps"));
    this.addViewCommand("noveler-toggle-global-italic", "Noveler: Toggle global italic style", (view) => view.toggleTypographyFlag("italic"));
    this.addViewCommand("noveler-toggle-kerning", "Noveler: Toggle kerning", (view) => view.toggleTypographyFlag("kerning"));
    this.addViewCommand("noveler-line-spacing-single", "Noveler: Line spacing single", (view) => view.setLineSpacing("1", 1));
    this.addViewCommand("noveler-line-spacing-115", "Noveler: Line spacing 1.15", (view) => view.setLineSpacing("1.15", 1.15));
    this.addViewCommand("noveler-line-spacing-150", "Noveler: Line spacing 1.5", (view) => view.setLineSpacing("1.5", 1.5));
    this.addViewCommand("noveler-line-spacing-double", "Noveler: Line spacing double", (view) => view.setLineSpacing("2", 2));
    this.addViewCommand("noveler-line-height-up", "Noveler: Increase custom line height", (view) => view.adjustLineHeight(0.05));
    this.addViewCommand("noveler-line-height-down", "Noveler: Decrease custom line height", (view) => view.adjustLineHeight(-0.05));
    this.addViewCommand("noveler-paragraph-before-up", "Noveler: Increase paragraph spacing before", (view) => view.adjustTypographyNumber("paragraphBefore", 1, 0, 80));
    this.addViewCommand("noveler-paragraph-before-down", "Noveler: Decrease paragraph spacing before", (view) => view.adjustTypographyNumber("paragraphBefore", -1, 0, 80));
    this.addViewCommand("noveler-paragraph-after-up", "Noveler: Increase paragraph spacing after", (view) => view.adjustTypographyNumber("paragraphAfter", 1, 0, 80));
    this.addViewCommand("noveler-paragraph-after-down", "Noveler: Decrease paragraph spacing after", (view) => view.adjustTypographyNumber("paragraphAfter", -1, 0, 80));
    this.addViewCommand("noveler-first-indent-up", "Noveler: Increase first-line indent", (view) => view.adjustTypographyNumber("firstLineIndent", 0.1, 0, 6));
    this.addViewCommand("noveler-first-indent-down", "Noveler: Decrease first-line indent", (view) => view.adjustTypographyNumber("firstLineIndent", -0.1, 0, 6));
    this.addViewCommand("noveler-hanging-indent-up", "Noveler: Increase hanging indent", (view) => view.adjustTypographyNumber("hangingIndent", 0.1, 0, 6));
    this.addViewCommand("noveler-hanging-indent-down", "Noveler: Decrease hanging indent", (view) => view.adjustTypographyNumber("hangingIndent", -0.1, 0, 6));
    this.addViewCommand("noveler-page-wider", "Noveler: Widen page", (view) => view.adjustLayoutNumber("pageWidth", 10, 320, 1200));
    this.addViewCommand("noveler-page-narrower", "Noveler: Narrow page", (view) => view.adjustLayoutNumber("pageWidth", -10, 320, 1200));
    this.addViewCommand("noveler-zoom-in", "Noveler: Zoom in", (view) => view.adjustLayoutNumber("pageZoom", 10, 50, 250));
    this.addViewCommand("noveler-zoom-out", "Noveler: Zoom out", (view) => view.adjustLayoutNumber("pageZoom", -10, 50, 250));
    this.addViewCommand("noveler-top-margin-up", "Noveler: Increase top margin", (view) => view.adjustLayoutNumber("marginTop", 2, 16, 240));
    this.addViewCommand("noveler-top-margin-down", "Noveler: Decrease top margin", (view) => view.adjustLayoutNumber("marginTop", -2, 16, 240));
    this.addViewCommand("noveler-bottom-margin-up", "Noveler: Increase bottom margin", (view) => view.adjustLayoutNumber("marginBottom", 2, 16, 240));
    this.addViewCommand("noveler-bottom-margin-down", "Noveler: Decrease bottom margin", (view) => view.adjustLayoutNumber("marginBottom", -2, 16, 240));
    this.addViewCommand("noveler-left-margin-up", "Noveler: Increase left margin", (view) => view.adjustLayoutNumber("marginLeft", 2, 16, 180));
    this.addViewCommand("noveler-left-margin-down", "Noveler: Decrease left margin", (view) => view.adjustLayoutNumber("marginLeft", -2, 16, 180));
    this.addViewCommand("noveler-right-margin-up", "Noveler: Increase right margin", (view) => view.adjustLayoutNumber("marginRight", 2, 16, 180));
    this.addViewCommand("noveler-right-margin-down", "Noveler: Decrease right margin", (view) => view.adjustLayoutNumber("marginRight", -2, 16, 180));
    this.addViewCommand("noveler-toggle-smart-quotes", "Noveler: Toggle smart quotes", (view) => view.toggleAutomationFlag("smartQuotes"));
    this.addViewCommand("noveler-toggle-smart-dashes", "Noveler: Toggle smart dashes", (view) => view.toggleAutomationFlag("smartDashes"));
    this.addViewCommand("noveler-toggle-auto-capitalization", "Noveler: Toggle auto-capitalization", (view) => view.toggleAutomationFlag("autoCapitalize"));
    this.addViewCommand("noveler-toggle-smart-indent", "Noveler: Toggle smart indenting", (view) => view.toggleAutomationFlag("smartIndent"));
    this.addCommand({
      id: "noveler-remove-double-spaces",
      name: "Noveler: Remove double spaces",
      checkCallback: (checking) => this.withView(checking, (view) => view.cleanupDocument({ doubleSpaces: true }))
    });
    this.addCommand({
      id: "noveler-normalize-line-breaks",
      name: "Noveler: Normalize line breaks",
      checkCallback: (checking) => this.withView(checking, (view) => view.cleanupDocument({ lineBreaks: true }))
    });
    this.addCommand({
      id: "noveler-smarten-punctuation",
      name: "Noveler: Smarten punctuation",
      checkCallback: (checking) => this.withView(checking, (view) => view.cleanupDocument({ punctuation: true }))
    });

    this.settingTab = new NovelerSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.registerVaultTitleSync();
  }

  onunload() {
    const focusView = this.focusModeViews && this.focusModeViews.values().next().value;
    if (focusView) {
      this.restoreFocusSidebars(focusView);
    }
    if (this.focusModeViews) {
      this.focusModeViews.clear();
    }
    if (window.Noveler && window.Noveler.plugin === this) {
      delete window.Noveler;
    }
  }

  registerNovelerApi() {
    window.Noveler = {
      plugin: this,
      open: () => this.activateView(),
      openScene: (path, options = {}) => this.openScene(path, options),
      isStoryLineBridgeEnabled: () => this.isStoryLineBridgeEnabled(),
      isStoryLineScenePath: (path) => this.isStoryLineScenePath(path),
      isAntidoteConnectEnabled: () => this.isAntidoteConnectEnabled(),
      getActiveView: () => this.getActiveView(),
      createAntidoteDocument: (options = {}) => {
        if (!this.isAntidoteConnectEnabled()) {
          return null;
        }
        const view = this.getActiveView();
        return view && typeof view.createAntidoteDocument === "function" ? view.createAntidoteDocument(options) : null;
      },
      getCurrentScenePath: () => {
        const view = this.getActiveView();
        return view ? view.currentDocumentPath : "";
      }
    };
  }

  registerVaultTitleSync() {
    this.registerEvent(this.app.vault.on("modify", (file) => {
      this.refreshOpenViewsForFile(file);
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.refreshOpenViewTitlesForRenamedFile(file, oldPath);
    }));
  }

  async refreshOpenViewsForFile(file) {
    if (!(file instanceof TFile) || !/\.m(?:d|arkdown)$/i.test(file.name)) {
      return;
    }
    const vaultPath = normalizeVaultPath(file.path);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof NovelerView && normalizeVaultPath(leaf.view.currentDocumentPath) === vaultPath) {
        await leaf.view.handleExternalFileModify(file);
      }
    }
  }

  async refreshOpenViewTitlesForRenamedFile(file, oldPath) {
    if (!(file instanceof TFile)) {
      return;
    }
    const oldVaultPath = normalizeVaultPath(oldPath);
    const newVaultPath = normalizeVaultPath(file.path);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (!(leaf.view instanceof NovelerView) || normalizeVaultPath(leaf.view.currentDocumentPath) !== oldVaultPath) {
        continue;
      }
      leaf.view.currentDocumentPath = newVaultPath;
      if (!this.isStoryLineBridgeEnabled()) {
        this.settings.manuscriptPath = newVaultPath;
        await this.saveSettings();
      }
      await leaf.view.refreshTitleFromFile(file);
    }
  }

  getStoryLineBridge() {
    const bridge = getStoryLineBridgeApi();
    return bridge && bridge.isEnabled() ? bridge : null;
  }

  isStoryLineBridgeEnabled() {
    return !!this.getStoryLineBridge();
  }

  isAntidoteConnectEnabled() {
    return !!(this.settings.integrations && this.settings.integrations.antidoteConnect);
  }

  isStoryLineScenePath(path) {
    const bridge = this.getStoryLineBridge();
    if (bridge && typeof bridge.isStoryLineScenePath === "function") {
      return !!bridge.isStoryLineScenePath(path);
    }
    return true;
  }

  getStoryLineActiveScenePath() {
    const bridge = this.getStoryLineBridge();
    if (bridge && typeof bridge.getActiveScenePath === "function") {
      return normalizeVaultPath(bridge.getActiveScenePath());
    }
    return "";
  }

  notifyBridgePathRejected(path) {
    new Notice(`Noveler bridge only opens StoryLine scene files: ${path || "no scene selected"}`);
  }

  addFormatCommand(id, name, action, hotkeys) {
    const command = {
      id,
      name,
      checkCallback: (checking) => this.withView(checking, (view) => view.format(action))
    };
    if (hotkeys) {
      command.hotkeys = hotkeys;
    }
    this.addCommand(command);
  }

  addViewCommand(id, name, callback, hotkeys) {
    const command = {
      id,
      name,
      checkCallback: (checking) => this.withView(checking, callback)
    };
    if (hotkeys) {
      command.hotkeys = hotkeys;
    }
    this.addCommand(command);
  }

  withView(checking, callback) {
    const view = this.getActiveView();
    if (!view) {
      return false;
    }
    if (!checking) {
      callback(view);
    }
    return true;
  }

  getActiveView() {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view instanceof NovelerView) {
      return activeLeaf.view;
    }
    return null;
  }

  async activateView(state = {}) {
    if (this.isStoryLineBridgeEnabled()) {
      const bridgePath = normalizeVaultPath(state.path || state.filePath || this.getStoryLineActiveScenePath());
      if (bridgePath && !this.isStoryLineScenePath(bridgePath)) {
        this.notifyBridgePathRejected(bridgePath);
        return;
      }
      state = Object.assign({}, state, {
        path: bridgePath,
        source: state.source || "storyline"
      });
    }

    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true, state });
    } else if (state && Object.keys(state).length) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true, state });
    }
    this.app.workspace.revealLeaf(leaf);

    if (state.path && leaf.view instanceof NovelerView) {
      await leaf.view.openScenePath(state.path, { source: state.source, silent: true });
    }
  }

  async openScene(path, options = {}) {
    const vaultPath = normalizeVaultPath(path);
    if (!vaultPath) {
      await this.activateView();
      return;
    }
    if (this.isStoryLineBridgeEnabled() && !this.isStoryLineScenePath(vaultPath)) {
      this.notifyBridgePathRejected(vaultPath);
      return;
    }

    await this.activateView({
      path: vaultPath,
      source: options.source || "external"
    });
  }

  async loadSettings() {
    this.settings = mergeSettings(await this.loadData());
    await this.loadSettingsFileIntoRuntime();
    this.globalTypography = clone(this.settings.typography);
  }

  async saveSettings() {
    const data = this.getSerializableSettings();
    await this.queueSettingsPersistence(data, true);
    this.refreshOpenViews();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("noveler-settings-changed", { detail: { settings: this.settings } }));
    }
  }

  queueSettingsPersistence(settingsData, writeSettingsFile) {
    const snapshot = clone(settingsData);
    const persist = async () => {
      await this.saveData(snapshot);
      if (writeSettingsFile) {
        await this.saveSettingsFile(snapshot);
      }
    };
    this.settingsWritePromise = this.settingsWritePromise.then(persist, persist);
    return this.settingsWritePromise;
  }

  getSerializableSettings() {
    const data = clone(this.settings);
    if (this.globalTypography) {
      data.typography = clone(this.globalTypography);
    }
    return mergeSettings(data);
  }

  getSettingsFilePath() {
    const pluginDir = normalizeVaultPath(this.manifest && this.manifest.dir ? this.manifest.dir : "");
    return pluginDir ? `${pluginDir}/${SETTINGS_FILE_NAME}` : `Noveler/${SETTINGS_FILE_NAME}`;
  }

  getLegacyPluginSettingsFilePath() {
    const configDir = normalizeVaultPath(this.app.vault.configDir || ".obsidian");
    return `${configDir}/plugins/noveler/${SETTINGS_FILE_NAME}`;
  }

  async ensureAdapterFolder(path) {
    const folder = normalizeVaultPath(path).split("/").slice(0, -1).join("/");
    if (!folder || !this.app.vault.adapter || typeof this.app.vault.adapter.mkdir !== "function") {
      return;
    }
    const parts = folder.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.adapter.mkdir(current);
      }
    }
  }

  async loadSettingsFileIntoRuntime() {
    const fileSettings = await this.readSettingsFile();
    if (!fileSettings) {
      return false;
    }
    const merged = mergeSettings(this.settings);
    mergeInto(merged, fileSettings);
    this.settings = mergeSettings(merged);
    if (this.loadedSettingsFilePath && this.loadedSettingsFilePath !== this.getSettingsFilePath()) {
      await this.saveSettingsFile(this.settings);
    }
    return true;
  }

  async reloadSettingsFile() {
    const loaded = await this.loadSettingsFileIntoRuntime();
    if (loaded) {
      this.globalTypography = clone(this.settings.typography);
      this.refreshOpenViews();
    }
    return loaded;
  }

  async readSettingsFile() {
    try {
      if (!this.app.vault.adapter) {
        return null;
      }
      const primaryPath = this.getSettingsFilePath();
      const paths = Array.from(new Set([
        primaryPath,
        this.getLegacyPluginSettingsFilePath(),
        LEGACY_SETTINGS_FILE_PATH
      ]));
      for (const path of paths) {
        if (!(await this.app.vault.adapter.exists(path))) {
          continue;
        }
        const raw = await this.app.vault.adapter.read(path);
        const parsed = JSON.parse(raw);
        const settings = parsed && parsed.settings && typeof parsed.settings === "object"
          ? parsed.settings
          : parsed;
        if (settings && typeof settings === "object" && !Array.isArray(settings)) {
          this.loadedSettingsFilePath = path;
          return settings;
        }
      }
      return null;
    } catch (error) {
      console.warn(`Noveler could not load ${SETTINGS_FILE_NAME}.`, error);
      return null;
    }
  }

  async saveSettingsFile(settingsData) {
    try {
      const settingsPath = this.getSettingsFilePath();
      const payload = {
        version: SETTINGS_FILE_VERSION,
        savedAt: new Date().toISOString(),
        settings: mergeSettings(settingsData || this.getSerializableSettings())
      };
      await this.ensureAdapterFolder(settingsPath);
      await this.app.vault.adapter.write(settingsPath, `${JSON.stringify(payload, null, 2)}\n`);
      if (
        settingsPath !== LEGACY_SETTINGS_FILE_PATH
        && typeof this.app.vault.adapter.remove === "function"
        && await this.app.vault.adapter.exists(LEGACY_SETTINGS_FILE_PATH)
      ) {
        await this.app.vault.adapter.remove(LEGACY_SETTINGS_FILE_PATH);
      }
    } catch (error) {
      console.warn(`Noveler could not write ${SETTINGS_FILE_NAME}.`, error);
    }
  }

  async saveSceneSettings(path, sceneSettings, defaults) {
    const vaultPath = normalizeVaultPath(path);
    if (!vaultPath) {
      return;
    }
    if (!this.settings.sceneSettings || typeof this.settings.sceneSettings !== "object") {
      this.settings.sceneSettings = {};
    }
    this.settings.sceneSettings[vaultPath] = sceneSettings;
    const data = clone(this.settings);
    data.typography = clone(this.globalTypography || (defaults && defaults.typography) || DEFAULT_SETTINGS.typography);
    await this.queueSettingsPersistence(data, false);
  }

  refreshOpenViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof NovelerView) {
        leaf.view.restoreSceneTypographySettings();
        leaf.view.applySettings();
        leaf.view.refreshEditorControls();
      }
    }
  }

  acquireFocusMode(view) {
    if (!this.focusModeViews.size) {
      this.focusSidebarState = {
        left: view.getSidebarCollapsed("left"),
        right: view.getSidebarCollapsed("right")
      };
    }
    this.focusModeViews.add(view);
    view.setSidebarCollapsed("left", true);
    view.setSidebarCollapsed("right", true);
  }

  releaseFocusMode(view) {
    this.focusModeViews.delete(view);
    if (!this.focusModeViews.size) {
      this.restoreFocusSidebars(view);
    }
  }

  restoreFocusSidebars(view) {
    const previous = this.focusSidebarState;
    this.focusSidebarState = null;
    if (!previous || !view) {
      return;
    }
    if (previous.left === false) {
      view.setSidebarCollapsed("left", false);
    }
    if (previous.right === false) {
      view.setSidebarCollapsed("right", false);
    }
  }
}

class NovelerView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.saveTimer = null;
    this.lastRange = null;
    this.lastSavedHtml = "";
    this.isSaving = false;
    this.savePromise = null;
    this.savePending = false;
    this.savePendingSilent = true;
    this.lastKnownDiskContent = null;
    this.externalConflict = false;
    this.currentDocumentPath = "";
    this.currentMarkdownFrontmatter = "";
    this.currentDocumentFormat = "html";
    this.currentDocumentTitle = "";
    this.hasPendingMetadataSave = false;
    this.defaultSceneSettings = getNovelerSceneSettings(this.plugin.settings);
    this.paginationTimer = null;
    this.availableFonts = getFallbackFontOptions();
    this.fontsLoading = false;
    this.toolbarFitFrame = 0;
    this.colorPopoverEl = null;
    this.colorControlButtonEl = null;
    this.colorHexInputEl = null;
    this.focusUpdateFrame = 0;
    this.focusTransitionFrame = 0;
    this.focusCenterFrame = 0;
    this.pendingFocusRange = null;
    this.pendingModeSelectionState = null;
    this.lastCaretSelectionState = null;
    this.revealCaretAfterPagination = false;
    this.focusModeActive = false;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return this.currentDocumentTitle || "Noveler";
  }

  setDocumentTitle(title) {
    this.currentDocumentTitle = title || "Noveler";
    if (this.leaf && typeof this.leaf.updateHeader === "function") {
      this.leaf.updateHeader();
    }
    this.updatePageFooters();
  }

  getIcon() {
    return "book-open-text";
  }

  async onOpen() {
    if (await this.plugin.loadSettingsFileIntoRuntime()) {
      this.plugin.globalTypography = clone(this.plugin.settings.typography);
      this.defaultSceneSettings = getNovelerSceneSettings(this.plugin.settings);
    }
    this.render();
    this.loadInstalledFonts();
    await this.loadDocument(this.getStatePath());
    this.applySettings();
    this.updateWordCount();
  }

  async setState(state, result) {
    if (typeof super.setState === "function") {
      await super.setState(state, result);
    }

    const path = normalizeVaultPath((state && (state.path || state.filePath)) || "");
    if (path && this.editorEl) {
      await this.openScenePath(path, { source: state.source, silent: true });
    }
  }

  getState() {
    if (this.plugin.isStoryLineBridgeEnabled()) {
      return {
        path: this.currentDocumentPath || this.plugin.getStoryLineActiveScenePath()
      };
    }
    return {
      path: this.currentDocumentPath || this.plugin.settings.manuscriptPath
    };
  }

  getStatePath() {
    const state = this.leaf && typeof this.leaf.getViewState === "function" ? this.leaf.getViewState().state : null;
    return normalizeVaultPath((state && (state.path || state.filePath)) || "");
  }

  async onClose() {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.paginationTimer) {
      window.clearTimeout(this.paginationTimer);
      this.paginationTimer = null;
    }
    if (this.toolbarFitFrame) {
      window.cancelAnimationFrame(this.toolbarFitFrame);
      this.toolbarFitFrame = 0;
    }
    if (this.focusUpdateFrame) {
      window.cancelAnimationFrame(this.focusUpdateFrame);
      this.focusUpdateFrame = 0;
    }
    if (this.focusTransitionFrame) {
      window.cancelAnimationFrame(this.focusTransitionFrame);
      this.focusTransitionFrame = 0;
    }
    if (this.focusCenterFrame) {
      window.cancelAnimationFrame(this.focusCenterFrame);
      this.focusCenterFrame = 0;
    }
    this.leaveFocusMode();
    this.closeColorPopover();
    await this.saveDocument({ silent: true });
  }

  render() {
    const contentEl = this.containerEl.children[1] || this.containerEl;
    contentEl.empty();
    contentEl.addClass("noveler-view");

    this.shellEl = contentEl.createDiv({ cls: "noveler-shell" });
    this.topToolbarEl = this.shellEl.createDiv({ cls: "noveler-top-toolbar" });
    this.buildTopToolbar();

    this.workAreaEl = this.shellEl.createDiv({ cls: "noveler-work-area" });
    this.topRulerEl = this.workAreaEl.createDiv({ cls: "noveler-ruler noveler-horizontal-ruler" });
    this.workBodyEl = this.workAreaEl.createDiv({ cls: "noveler-work-body" });
    this.leftRulerEl = this.workBodyEl.createDiv({ cls: "noveler-ruler noveler-side-ruler noveler-left-ruler" });
    this.documentEl = this.workBodyEl.createDiv({ cls: "noveler-document" });
    this.pageRowEl = this.documentEl.createDiv({ cls: "noveler-page-row" });
    this.editorFrameEl = this.pageRowEl.createDiv({ cls: "noveler-editor-frame" });
    this.editorEl = this.editorFrameEl.createDiv({
      cls: "noveler-editor",
      attr: {
        contenteditable: "true",
        spellcheck: "true",
        role: "textbox",
        "aria-label": "Noveler manuscript editor",
        "aria-multiline": "true"
      }
    });

    this.statusBarEl = this.shellEl.createDiv({ cls: "noveler-status-bar" });
    this.statusTextEl = this.statusBarEl.createSpan({ cls: "noveler-status-text", text: "Ready" });
    this.statusControlsEl = this.statusBarEl.createDiv({ cls: "noveler-status-controls" });
    this.wordCountEl = this.statusBarEl.createSpan({ cls: "noveler-word-count", text: "0 words" });
    this.buildStatusControls();
    this.floatingToolbarEl = null;

    this.registerDomEvent(this.editorEl, "input", () => {
      this.captureSelection();
      this.schedulePagination();
      this.scheduleSave();
      this.updateWordCount();
      this.updateStatus("Unsaved changes");
    });
    this.registerDomEvent(this.editorEl, "beforeinput", (event) => this.onBeforeInput(event));
    this.registerDomEvent(this.editorEl, "paste", (event) => this.onEditorPaste(event));
    this.registerDomEvent(this.editorEl, "keydown", (event) => this.onKeydown(event));
    this.registerDomEvent(this.editorEl, "pointerdown", (event) => this.captureCaretFromPoint(event));
    this.registerDomEvent(this.editorEl, "click", (event) => this.onEditorClick(event));
    this.registerDomEvent(this.editorEl, "mouseup", () => this.captureSelection());
    this.registerDomEvent(this.editorEl, "keyup", () => this.captureSelection());
    this.registerDomEvent(this.editorEl, "contextmenu", (event) => this.openContextMenu(event));
    this.registerDomEvent(this.workAreaEl, "dragenter", (event) => this.onEditorDragEnter(event));
    this.registerDomEvent(this.workAreaEl, "dragover", (event) => this.onEditorDragOver(event));
    this.registerDomEvent(this.workAreaEl, "dragleave", (event) => this.onEditorDragLeave(event));
    this.registerDomEvent(this.workAreaEl, "drop", (event) => this.onEditorDrop(event));
    this.registerDomEvent(this.topRulerEl, "contextmenu", (event) => this.openRulerContextMenu(event));
    this.registerDomEvent(this.leftRulerEl, "contextmenu", (event) => this.openRulerContextMenu(event));
    this.registerDomEvent(document, "selectionchange", () => this.captureSelection());
    this.registerDomEvent(document, "pointerdown", (event) => this.onDocumentPointerDown(event));
    this.registerDomEvent(window, "resize", () => {
      this.scheduleFitTopToolbar();
      this.scheduleFocusUpdate();
    });
  }

  buildTopToolbar() {
    if (!this.topToolbarEl) {
      return;
    }

    const settings = this.plugin.settings;
    this.closeColorPopover();
    this.topToolbarEl.empty();
    this.topToolbarContentEl = this.topToolbarEl.createDiv({ cls: "noveler-top-toolbar-content" });

    const fontGroup = this.createToolbarGroup("font");
    const selectedFont = getSelectedFontFamily(settings.typography);
    const fontOptions = this.getFontOptions(selectedFont);
    this.createSelect(fontGroup, "Font", selectedFont, fontOptions, (value) => this.updateSettings((draft) => {
      draft.typography.fontPreset = "custom";
      draft.typography.customFontFamily = value;
    }, true));
    this.createNumberInput(fontGroup, "Size", settings.typography.fontSize, 6, 96, 0.5, (value) => this.updateSettings((draft) => {
      draft.typography.fontSize = value;
    }));

    const formatGroup = this.createToolbarGroup("format");
    this.createIconButton(formatGroup, "bold", "Bold", () => this.format("bold"));
    this.createIconButton(formatGroup, "italic", "Italic", () => this.format("italic"));
    this.createIconButton(formatGroup, "underline", "Underline", () => this.format("underline"));
    this.createIconButton(formatGroup, "strikethrough", "Strikethrough", () => this.format("strikethrough"));
    this.createColorInput(formatGroup, "Text color", settings.typography.textColor, (value) => this.applyTextColor(value));

    const paragraphGroup = this.createToolbarGroup("paragraph");
    this.createSelect(paragraphGroup, "Style", "", [
      ["", "Normal"],
      ["h1", "Heading 1"],
      ["h2", "Heading 2"],
      ["h3", "Heading 3"],
      ["dialogue", "Dialogue"],
      ["blockquote", "Block quote"]
    ], (value, select) => {
      if (value.startsWith("h")) {
        this.applyHeading(Number(value.slice(1)));
      } else if (value) {
        this.applyParagraphStyle(value);
      }
      select.value = "";
    });
    this.createSelect(paragraphGroup, "Align", settings.typography.alignment, [
      ["left", "Left"],
      ["center", "Center"],
      ["right", "Right"],
      ["justify", "Justify"]
    ], (value) => this.applyAlignment(value));
    this.createSelect(paragraphGroup, "Line", settings.typography.lineSpacingPreset, [
      ["1", "Single"],
      ["1.15", "1.15"],
      ["1.5", "1.5"],
      ["2", "Double"],
      ["custom", "Custom"]
    ], (value) => this.updateSettings((draft) => {
      draft.typography.lineSpacingPreset = value;
      if (value !== "custom") {
        draft.typography.lineHeight = Number(value);
      }
    }, true));
    this.createIconButton(paragraphGroup, "list", "Bulleted list", () => this.format("insertUnorderedList"));
    this.createIconButton(paragraphGroup, "list-ordered", "Numbered list", () => this.format("insertOrderedList"));
    this.scheduleFitTopToolbar();
  }

  refreshEditorControls() {
    this.buildTopToolbar();
    this.buildStatusControls();
  }

  scheduleFitTopToolbar() {
    if (this.toolbarFitFrame) {
      window.cancelAnimationFrame(this.toolbarFitFrame);
    }
    this.toolbarFitFrame = window.requestAnimationFrame(() => {
      this.toolbarFitFrame = 0;
      this.fitTopToolbar();
    });
  }

  fitTopToolbar() {
    if (!this.topToolbarEl || !this.topToolbarContentEl) {
      return;
    }
    this.topToolbarEl.style.removeProperty("--noveler-toolbar-scale");
    this.topToolbarEl.style.removeProperty("--noveler-toolbar-height");
    if (this.plugin.settings.layout.mode === "focus") {
      return;
    }
    const availableWidth = Math.max(1, this.topToolbarEl.clientWidth);
    this.topToolbarEl.classList.toggle("is-compact", availableWidth < 820);
    this.topToolbarEl.classList.toggle("is-tight", availableWidth < 640);
    this.topToolbarEl.classList.toggle("is-ultra-tight", availableWidth < 480);
    const overflowWidth = Math.max(1, this.topToolbarContentEl.scrollWidth);
    const scale = Math.min(1, availableWidth / overflowWidth);
    if (scale < 1) {
      const naturalHeight = Math.max(1, this.topToolbarContentEl.offsetHeight);
      this.topToolbarEl.style.setProperty("--noveler-toolbar-scale", String(scale));
      this.topToolbarEl.style.setProperty("--noveler-toolbar-height", `${Math.ceil(naturalHeight * scale)}px`);
    }
    if (this.colorPopoverEl && this.colorControlButtonEl) {
      this.positionColorPopover(this.colorControlButtonEl);
    }
  }

  async loadInstalledFonts() {
    if (this.fontsLoading) {
      return;
    }
    this.fontsLoading = true;
    const currentFont = this.plugin.settings.typography.customFontFamily;
    let fontFamilies = [];
    try {
      if (typeof window !== "undefined" && typeof window.queryLocalFonts === "function") {
        const fonts = await window.queryLocalFonts();
        fontFamilies = Array.from(new Set(fonts.map((font) => font.family || font.fullName).filter(Boolean)));
      }
    } catch (error) {
      console.warn("Noveler could not read installed fonts.", error);
    }

    if (!fontFamilies.length) {
      fontFamilies = FALLBACK_FONT_FAMILIES;
    }
    if (currentFont && !fontFamilies.includes(currentFont)) {
      fontFamilies.unshift(currentFont);
    }
    fontFamilies.sort((a, b) => a.localeCompare(b));
    this.availableFonts = fontFamilies.map((font) => [font, font]);
    this.fontsLoading = false;
    this.buildTopToolbar();
  }

  getFontOptions(selectedFont) {
    const options = this.availableFonts && this.availableFonts.length ? [...this.availableFonts] : getFallbackFontOptions(selectedFont);
    if (selectedFont && !options.some(([value]) => value === selectedFont)) {
      options.unshift([selectedFont, selectedFont]);
    }
    return options;
  }

  buildStatusControls() {
    if (!this.statusControlsEl) {
      return;
    }
    const settings = this.plugin.settings;
    this.statusControlsEl.empty();
    const modeButtons = this.statusControlsEl.createDiv({ cls: "noveler-segmented" });
    this.createTextButton(modeButtons, "Page", "Page mode", () => this.setLayoutMode("page"), settings.layout.mode === "page");
    this.createTextButton(modeButtons, "Focus", "Focus mode", () => this.setLayoutMode("focus"), settings.layout.mode === "focus");
    const zoom = settings.layout.mode === "focus"
      ? Number(settings.focus.defaultZoom) || DEFAULT_SETTINGS.focus.defaultZoom
      : Number(settings.layout.pageZoom) || DEFAULT_SETTINGS.layout.pageZoom;
    this.createSelect(this.statusControlsEl, "Zoom", String(zoom), getZoomOptions(zoom), (value) => {
      this.setPageZoom(Number(value));
    });
  }

  restoreSceneTypographySettings() {
    if (!this.currentDocumentPath || this.currentDocumentFormat !== "markdown") {
      return;
    }
    const frontmatterSceneSettings = getNovelerFrontmatterSettings(this.currentMarkdownFrontmatter);
    const storedSceneSettings = getStoredSceneSettings(this.plugin.settings, this.currentDocumentPath);
    const sceneSettings = hasSceneSettings(frontmatterSceneSettings) ? frontmatterSceneSettings : storedSceneSettings;
    mergeSceneSettingsIntoPluginSettings(this.plugin.settings, sceneSettings, {
      typography: this.plugin.globalTypography || DEFAULT_SETTINGS.typography
    });
  }

  applyInferredTypographyFromContent(sceneSettings) {
    if (hasSceneSettings(sceneSettings) || !this.editorEl) {
      return;
    }

    const inferred = this.inferTypographyFromStyledContent();
    if (!inferred || !Object.keys(inferred).length) {
      return;
    }

    Object.assign(this.plugin.settings.typography, inferred);
    if (this.canPersistSceneSettings()) {
      this.plugin.saveSceneSettings(
        this.currentDocumentPath,
        getNovelerSceneSettings(this.plugin.settings),
        this.defaultSceneSettings
      );
    }
  }

  inferTypographyFromStyledContent() {
    const source = this.findStyledTypographySource();
    if (!source) {
      return null;
    }

    const style = source.style;
    const inferred = {};
    const fontFamily = this.normalizeCssFontFamily(style.fontFamily);
    if (fontFamily) {
      inferred.fontPreset = "custom";
      inferred.customFontFamily = fontFamily;
    }

    const fontSize = this.parseCssLengthToPt(style.fontSize);
    if (fontSize) {
      inferred.fontSize = this.clampNumber(fontSize, 6, 96);
      inferred.fontScale = 100;
    }

    const fontWeight = this.normalizeCssFontWeight(style.fontWeight);
    if (fontWeight) {
      inferred.fontWeight = fontWeight;
    }
    if (style.fontStyle === "italic") {
      inferred.italic = true;
    }
    if (String(style.fontVariantCaps || style.fontVariant || "").includes("small-caps")) {
      inferred.smallCaps = true;
    }

    const letterSpacing = this.parseCssLengthToPx(style.letterSpacing);
    if (letterSpacing !== null) {
      inferred.letterSpacing = this.clampNumber(letterSpacing, -5, 20);
    }

    const lineHeight = this.parseCssLineHeight(style.lineHeight, inferred.fontSize || this.plugin.settings.typography.fontSize);
    if (lineHeight) {
      inferred.lineHeight = this.clampNumber(lineHeight, 1, 3);
      inferred.lineSpacingPreset = this.lineSpacingPresetForValue(inferred.lineHeight);
    }

    const alignment = String(style.textAlign || "").trim().toLowerCase();
    if (["left", "center", "right", "justify"].includes(alignment)) {
      inferred.alignment = alignment;
    }

    return inferred;
  }

  findStyledTypographySource() {
    const isUseful = (element) => {
      const style = element.getAttribute("style") || "";
      return /font-family|font-size|text-align|line-height|font-weight|font-style|font-variant|letter-spacing/i.test(style);
    };
    const blockSelector = "p[style], div[style], blockquote[style], li[style]";
    const blockCandidate = Array.from(this.editorEl.querySelectorAll(blockSelector)).find(isUseful);
    if (blockCandidate) {
      return blockCandidate;
    }

    const totalTextLength = (this.editorEl.textContent || "").trim().length;
    const minimumInlineLength = Math.max(20, Math.round(totalTextLength * 0.5));
    return Array.from(this.editorEl.querySelectorAll("span[style]")).find((element) => {
      const textLength = (element.textContent || "").trim().length;
      return textLength >= minimumInlineLength && isUseful(element);
    }) || null;
  }

  normalizeCssFontFamily(value) {
    const family = String(value || "")
      .split(",")[0]
      .replace(/^['"]|['"]$/g, "")
      .trim();
    if (!family || ["serif", "sans-serif", "monospace"].includes(family.toLowerCase())) {
      return "";
    }
    return family;
  }

  normalizeCssFontWeight(value) {
    const weight = String(value || "").trim().toLowerCase();
    if (!weight) {
      return "";
    }
    if (weight === "normal") {
      return "400";
    }
    if (weight === "bold") {
      return "700";
    }
    const numeric = Number(weight);
    if (!Number.isNaN(numeric)) {
      return String(Math.max(100, Math.min(900, Math.round(numeric / 100) * 100)));
    }
    return "";
  }

  parseCssLengthToPt(value) {
    const text = String(value || "").trim();
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) {
      return null;
    }
    if (/px$/i.test(text)) {
      return number * 0.75;
    }
    if (/pt$/i.test(text) || /^-?\d+(?:\.\d+)?$/.test(text)) {
      return number;
    }
    return null;
  }

  parseCssLengthToPx(value) {
    const text = String(value || "").trim();
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number) || text === "normal") {
      return null;
    }
    if (/pt$/i.test(text)) {
      return number / 0.75;
    }
    if (/px$/i.test(text) || /^-?\d+(?:\.\d+)?$/.test(text)) {
      return number;
    }
    return null;
  }

  parseCssLineHeight(value, fontSizePt) {
    const text = String(value || "").trim();
    if (!text || text === "normal") {
      return null;
    }
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) {
      return null;
    }
    if (/^\d+(?:\.\d+)?$/.test(text)) {
      return number;
    }
    const lineHeightPt = this.parseCssLengthToPt(text);
    const baseFontSize = Number(fontSizePt) || DEFAULT_SETTINGS.typography.fontSize;
    return lineHeightPt && baseFontSize ? lineHeightPt / baseFontSize : null;
  }

  lineSpacingPresetForValue(value) {
    const spacing = Number(value);
    const presets = [1, 1.15, 1.5, 2];
    const match = presets.find((preset) => Math.abs(spacing - preset) < 0.02);
    return match ? String(match) : "custom";
  }

  buildFloatingToolbar() {
    if (!this.floatingToolbarEl) {
      return;
    }
    this.floatingToolbarEl.empty();
    this.createIconButton(this.floatingToolbarEl, "bold", "Bold", () => this.format("bold"));
    this.createIconButton(this.floatingToolbarEl, "italic", "Italic", () => this.format("italic"));
    this.createIconButton(this.floatingToolbarEl, "underline", "Underline", () => this.format("underline"));
    this.createIconButton(this.floatingToolbarEl, "strikethrough", "Strikethrough", () => this.format("strikethrough"));
    this.createIconButton(this.floatingToolbarEl, "quote", "Block quote", () => this.applyParagraphStyle("blockquote"));
    this.createIconButton(this.floatingToolbarEl, "heading-1", "Heading 1", () => this.applyHeading(1));
    this.createIconButton(this.floatingToolbarEl, "heading-2", "Heading 2", () => this.applyHeading(2));
  }

  createToolbarGroup(groupName) {
    const groupClass = groupName ? ` noveler-toolbar-group-${this.getControlClassName(groupName)}` : "";
    const group = (this.topToolbarContentEl || this.topToolbarEl).createDiv({ cls: `noveler-toolbar-group${groupClass}` });
    const controls = group.createDiv({ cls: "noveler-toolbar-controls" });
    return controls;
  }

  createIconButton(parent, icon, label, action, active) {
    const button = parent.createEl("button", {
      cls: `noveler-icon-button${active ? " is-active" : ""}`,
      attr: {
        type: "button",
        title: label,
        "aria-label": label
      }
    });
    if (typeof setIcon === "function") {
      setIcon(button, icon);
    } else {
      button.setText(label);
    }
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.restoreSelection();
      action();
    });
    return button;
  }

  createTextButton(parent, text, label, action, active) {
    const button = parent.createEl("button", {
      text,
      cls: `noveler-text-button${active ? " is-active" : ""}`,
      attr: {
        type: "button",
        title: label,
        "aria-label": label
      }
    });
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.captureSelection();
      action();
    });
    return button;
  }

  createColorInput(parent, label, value, onChange) {
    const color = normalizeHexColor(value);
    const button = parent.createEl("button", {
      cls: "noveler-color-control",
      attr: {
        type: "button",
        title: label,
        "aria-label": label
      }
    });
    button.style.setProperty("--noveler-color-value", color);
    const iconEl = button.createSpan({ cls: "noveler-color-icon" });
    if (typeof setIcon === "function") {
      setIcon(iconEl, "palette");
    } else {
      iconEl.setText("A");
    }
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.captureSelection();
      this.toggleColorPopover(button, onChange);
    });
    this.colorControlButtonEl = button;
    return button;
  }

  toggleColorPopover(button, onChange) {
    if (this.colorPopoverEl) {
      this.closeColorPopover();
      return;
    }
    this.openColorPopover(button, onChange);
  }

  openColorPopover(button, onChange) {
    this.closeColorPopover();
    const color = normalizeHexColor(this.plugin.settings.typography.textColor);
    const popover = document.body.createDiv({ cls: "noveler-color-popover" });
    this.colorPopoverEl = popover;
    this.colorControlButtonEl = button;

    const header = popover.createDiv({ cls: "noveler-color-popover-header" });
    header.createSpan({ cls: "noveler-color-popover-title", text: "Text color" });
    const closeButton = header.createEl("button", {
      cls: "noveler-color-popover-close",
      attr: {
        type: "button",
        title: "Close",
        "aria-label": "Close text color"
      }
    });
    if (typeof setIcon === "function") {
      setIcon(closeButton, "x");
    } else {
      closeButton.setText("x");
    }
    closeButton.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.closeColorPopover();
    });

    const pickerState = hexToHsv(color);
    const picker = popover.createDiv({
      cls: "noveler-color-picker",
      attr: {
        role: "slider",
        "aria-label": "Pick text color saturation and brightness",
        tabindex: "0"
      }
    });
    picker.createDiv({ cls: "noveler-color-picker-marker" });
    const hueInput = popover.createEl("input", {
      cls: "noveler-color-hue",
      attr: {
        type: "range",
        min: "0",
        max: "360",
        step: "1",
        value: String(Math.round(pickerState.h)),
        "aria-label": "Text color hue"
      }
    });

    const row = popover.createDiv({ cls: "noveler-color-hex-row" });
    row.createDiv({ cls: "noveler-color-preview" }).style.setProperty("--noveler-color-value", color);
    row.createSpan({ cls: "noveler-color-hex-label", text: "Hex" });
    const input = row.createEl("input", {
      cls: "noveler-color-hex-input",
      attr: {
        type: "text",
        value: color,
        maxlength: "7",
        spellcheck: "false",
        "aria-label": "Hex text color"
      }
    });
    this.colorHexInputEl = input;

    const applyHex = () => {
      const raw = input.value.trim();
      const normalized = raw.startsWith("#") ? raw : `#${raw}`;
      if (!isHexColor(normalized)) {
        input.addClass("is-invalid");
        return;
      }
      input.removeClass("is-invalid");
      const next = normalizeHexColor(normalized);
      input.value = next;
      this.setColorControlValue(next);
      onChange(next);
    };
    input.addEventListener("input", () => {
      const raw = input.value.trim();
      const normalized = raw.startsWith("#") ? raw : `#${raw}`;
      if (isHexColor(normalized)) {
        input.removeClass("is-invalid");
        const next = normalizeHexColor(normalized);
        this.setColorControlValue(next);
        onChange(next);
      } else {
        input.addClass("is-invalid");
      }
    });
    input.addEventListener("change", applyHex);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyHex();
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.closeColorPopover();
      }
    });
    const applyPickerState = () => {
      const next = hsvToHex(pickerState.h, pickerState.s, pickerState.v);
      this.setColorControlValue(next);
      onChange(next);
    };
    const pickFromPointer = (event) => {
      const rect = picker.getBoundingClientRect();
      pickerState.s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      pickerState.v = Math.max(0, Math.min(1, 1 - ((event.clientY - rect.top) / rect.height)));
      applyPickerState();
    };
    picker.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      picker.setPointerCapture(event.pointerId);
      pickFromPointer(event);
    });
    picker.addEventListener("pointermove", (event) => {
      if (event.buttons) {
        pickFromPointer(event);
      }
    });
    picker.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 0.1 : 0.02;
      if (event.key === "ArrowLeft") {
        pickerState.s = Math.max(0, pickerState.s - step);
      } else if (event.key === "ArrowRight") {
        pickerState.s = Math.min(1, pickerState.s + step);
      } else if (event.key === "ArrowDown") {
        pickerState.v = Math.max(0, pickerState.v - step);
      } else if (event.key === "ArrowUp") {
        pickerState.v = Math.min(1, pickerState.v + step);
      } else {
        return;
      }
      event.preventDefault();
      applyPickerState();
    });
    hueInput.addEventListener("input", () => {
      pickerState.h = Number(hueInput.value) || 0;
      applyPickerState();
    });

    this.setColorControlValue(color);
    this.renderColorSwatches(popover, onChange);
    this.positionColorPopover(button);
    window.requestAnimationFrame(() => input.focus());
  }

  renderColorSwatches(popover, onChange) {
    const swatches = this.getTextColorSwatches();
    const row = popover.createDiv({ cls: "noveler-color-swatches" });
    for (let index = 0; index < 5; index += 1) {
      const swatchColor = swatches[index] || "";
      const swatch = row.createEl("button", {
        cls: `noveler-color-swatch${swatchColor ? "" : " is-empty"}`,
        attr: {
          type: "button",
          title: swatchColor
            ? "Click to apply. Right-click to save the current Hex here."
            : "Click to save the current Hex here.",
          "aria-label": `Saved text color ${index + 1}`
        }
      });
      swatch.style.setProperty("--noveler-swatch-color", swatchColor || "transparent");
      if (swatchColor) {
        swatch.style.setProperty("background-color", swatchColor, "important");
      }
      if (swatchColor) {
        const remove = swatch.createSpan({ cls: "noveler-color-swatch-remove" });
        remove.setText("×");
      }
      const removeButton = swatch.querySelector(".noveler-color-swatch-remove");
      if (removeButton) {
        removeButton.textContent = "x";
      }
      swatch.addEventListener("mousedown", (event) => event.preventDefault());
      swatch.addEventListener("click", (event) => {
        if (event.target && event.target.closest && event.target.closest(".noveler-color-swatch-remove")) {
          this.deleteTextColorSwatch(index);
          this.refreshColorPopover(onChange);
          return;
        }
        const current = normalizeHexColor(this.plugin.settings.typography.textColor);
        if (!swatchColor) {
          this.saveTextColorSwatch(index, current);
          this.refreshColorPopover(onChange);
          return;
        }
        this.setColorControlValue(swatchColor);
        onChange(swatchColor);
      });
      swatch.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.saveTextColorSwatch(index, normalizeHexColor(this.plugin.settings.typography.textColor));
        this.refreshColorPopover(onChange);
      });
    }
  }

  refreshColorPopover(onChange) {
    if (!this.colorPopoverEl || !this.colorControlButtonEl) {
      return;
    }
    this.openColorPopover(this.colorControlButtonEl, onChange);
  }

  closeColorPopover() {
    if (this.colorPopoverEl) {
      this.colorPopoverEl.remove();
      this.colorPopoverEl = null;
      this.colorHexInputEl = null;
    }
  }

  onDocumentPointerDown(event) {
    if (!this.colorPopoverEl) {
      return;
    }
    const target = event.target;
    if (
      target instanceof Node
      && (this.colorPopoverEl.contains(target) || (this.colorControlButtonEl && this.colorControlButtonEl.contains(target)))
    ) {
      return;
    }
    this.closeColorPopover();
  }

  positionColorPopover(button) {
    if (!this.colorPopoverEl || !button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const popoverRect = this.colorPopoverEl.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - popoverRect.width - 8, rect.left + rect.width / 2 - popoverRect.width / 2));
    const top = Math.min(window.innerHeight - popoverRect.height - 8, rect.bottom + 8);
    this.colorPopoverEl.style.left = `${left}px`;
    this.colorPopoverEl.style.top = `${Math.max(8, top)}px`;
  }

  setColorControlValue(color) {
    const normalized = normalizeHexColor(color);
    if (this.colorControlButtonEl) {
      this.colorControlButtonEl.style.setProperty("--noveler-color-value", normalized);
    }
    if (this.colorPopoverEl) {
      for (const preview of Array.from(this.colorPopoverEl.querySelectorAll(".noveler-color-preview"))) {
        preview.style.setProperty("--noveler-color-value", normalized);
      }
      const picker = this.colorPopoverEl.querySelector(".noveler-color-picker");
      const marker = this.colorPopoverEl.querySelector(".noveler-color-picker-marker");
      const hueInput = this.colorPopoverEl.querySelector(".noveler-color-hue");
      if (picker) {
        const hsv = hexToHsv(normalized);
        picker.style.setProperty("--noveler-picker-hue", hsvToHex(hsv.h, 1, 1));
        picker.style.setProperty("--noveler-picker-x", `${hsv.s * 100}%`);
        picker.style.setProperty("--noveler-picker-y", `${(1 - hsv.v) * 100}%`);
        picker.setAttribute("aria-valuetext", normalized);
        if (marker) {
          marker.style.left = `${hsv.s * 100}%`;
          marker.style.top = `${(1 - hsv.v) * 100}%`;
        }
        if (hueInput && hueInput.value !== String(Math.round(hsv.h))) {
          hueInput.value = String(Math.round(hsv.h));
        }
      }
    }
    if (this.colorHexInputEl && this.colorHexInputEl.value !== normalized) {
      this.colorHexInputEl.value = normalized;
      this.colorHexInputEl.removeClass("is-invalid");
    }
  }

  getTextColorSwatches() {
    if (!this.plugin.settings.toolbar || typeof this.plugin.settings.toolbar !== "object") {
      this.plugin.settings.toolbar = clone(DEFAULT_SETTINGS.toolbar);
    }
    const source = Array.isArray(this.plugin.settings.toolbar.textColorSwatches)
      ? this.plugin.settings.toolbar.textColorSwatches
      : [];
    return Array.from({ length: 5 }, (_item, index) => {
      const color = String(source[index] || "").trim();
      return isHexColor(color) ? normalizeHexColor(color) : "";
    });
  }

  saveTextColorSwatch(index, color) {
    const swatches = this.getTextColorSwatches();
    swatches[index] = normalizeHexColor(color);
    this.plugin.settings.toolbar.textColorSwatches = swatches;
    const data = this.plugin.getSerializableSettings();
    this.plugin.queueSettingsPersistence(data, true).catch((error) => console.warn("Noveler could not save text color swatches.", error));
  }

  deleteTextColorSwatch(index) {
    const swatches = this.getTextColorSwatches();
    swatches[index] = "";
    this.plugin.settings.toolbar.textColorSwatches = swatches;
    const data = this.plugin.getSerializableSettings();
    this.plugin.queueSettingsPersistence(data, true).catch((error) => console.warn("Noveler could not delete text color swatch.", error));
  }

  createSelect(parent, label, value, options, onChange) {
    const field = parent.createDiv({ cls: `noveler-field noveler-field-select noveler-field-${this.getControlClassName(label)}` });
    field.createSpan({ cls: "noveler-field-label", text: label });
    const select = field.createEl("select", { attr: { "aria-label": label } });
    for (const [optionValue, optionLabel] of options) {
      select.createEl("option", { text: optionLabel, attr: { value: optionValue } });
    }
    select.value = value;
    select.addEventListener("change", () => onChange(select.value, select));
    return select;
  }

  createNumberInput(parent, label, value, min, max, step, onChange) {
    const field = parent.createDiv({ cls: `noveler-field noveler-field-number noveler-field-${this.getControlClassName(label)}` });
    field.createSpan({ cls: "noveler-field-label", text: label });
    const input = field.createEl("input", {
      attr: {
        type: "number",
        min: String(min),
        max: String(max),
        step: String(step),
        "aria-label": label
      }
    });
    input.value = String(value);
    const commit = () => {
      const next = Number(input.value);
      if (input.value !== "" && !Number.isNaN(next)) {
        onChange(next);
      }
    };
    input.addEventListener("change", commit);
    input.addEventListener("input", commit);
    return input;
  }

  getControlClassName(label) {
    return String(label || "control")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "control";
  }

  createRange(parent, label, value, min, max, step, onChange) {
    const field = parent.createDiv({ cls: "noveler-field noveler-field-range" });
    const labelEl = field.createSpan({ cls: "noveler-field-label", text: `${label}: ${value}` });
    const input = field.createEl("input", {
      attr: {
        type: "range",
        min: String(min),
        max: String(max),
        step: String(step),
        "aria-label": label
      }
    });
    input.value = String(value);
    input.addEventListener("input", () => {
      const next = Number(input.value);
      labelEl.setText(`${label}: ${next}`);
      onChange(next);
    });
    return input;
  }

  createTextInput(parent, label, value, onChange, placeholder) {
    const field = parent.createDiv({ cls: "noveler-field noveler-field-text" });
    field.createSpan({ cls: "noveler-field-label", text: label });
    const input = field.createEl("input", {
      attr: {
        type: "text",
        placeholder: placeholder || label,
        "aria-label": label
      }
    });
    input.value = value;
    input.addEventListener("change", () => onChange(input.value));
    return input;
  }

  createToggle(parent, label, checked, onChange) {
    const wrapper = parent.createEl("label", { cls: "noveler-toggle" });
    const input = wrapper.createEl("input", { attr: { type: "checkbox", "aria-label": label } });
    input.checked = checked;
    wrapper.createSpan({ text: label });
    input.addEventListener("change", () => onChange(input.checked));
    return input;
  }

  updateSettings(mutator, rebuildToolbar) {
    mutator(this.plugin.settings);
    this.persistToolbarSettings();
    this.applySettings();
    if (rebuildToolbar) {
      this.buildTopToolbar();
    }
  }

  canPersistSceneSettings() {
    return Boolean(this.currentDocumentPath && this.currentDocumentFormat === "markdown");
  }

  persistToolbarSettings(options = {}) {
    if (this.canPersistSceneSettings()) {
      this.hasPendingMetadataSave = true;
      this.plugin.saveSceneSettings(
        this.currentDocumentPath,
        getNovelerSceneSettings(this.plugin.settings),
        this.defaultSceneSettings
      );
      this.scheduleSave();
      return;
    }
    this.plugin.globalTypography = clone(this.plugin.settings.typography);
    if (options.silent) {
      const data = this.plugin.getSerializableSettings();
      this.plugin.queueSettingsPersistence(data, true);
      return;
    }
    this.plugin.saveSettings();
  }

  persistGlobalLayoutSetting(key) {
    const keys = Array.isArray(key) ? key : [key];
    for (const layoutKey of keys) {
      if (this.defaultSceneSettings && this.defaultSceneSettings.layout) {
        this.defaultSceneSettings.layout[layoutKey] = this.plugin.settings.layout[layoutKey];
      }
      if (this.plugin.settingTab && this.plugin.settingTab.draftSettings) {
        this.plugin.settingTab.draftSettings.layout[layoutKey] = this.plugin.settings.layout[layoutKey];
      }
    }
    this.plugin.saveSettings();
  }

  persistFocusSetting(key) {
    if (this.plugin.settingTab && this.plugin.settingTab.draftSettings) {
      if (!this.plugin.settingTab.draftSettings.focus) {
        this.plugin.settingTab.draftSettings.focus = clone(DEFAULT_SETTINGS.focus);
      }
      this.plugin.settingTab.draftSettings.focus[key] = this.plugin.settings.focus[key];
    }
    this.plugin.saveSettings();
  }

  async loadDocument(pathOverride) {
    const bridgeEnabled = this.plugin.isStoryLineBridgeEnabled();
    const bridgePath = bridgeEnabled ? normalizeVaultPath(pathOverride || this.currentDocumentPath || this.plugin.getStoryLineActiveScenePath()) : "";
    const path = bridgeEnabled
      ? bridgePath
      : normalizeVaultPath(pathOverride || this.plugin.settings.manuscriptPath) || DEFAULT_SETTINGS.manuscriptPath;

    if (bridgeEnabled && (!path || !this.plugin.isStoryLineScenePath(path))) {
      this.showBridgeEmptyState();
      return;
    }

    if (!bridgeEnabled) {
      await this.ensureParentFolder(path);
    }
    let file = this.plugin.app.vault.getAbstractFileByPath(path);

    if (!file) {
      if (bridgeEnabled) {
        new Notice(`Noveler could not find StoryLine scene: ${path}`);
        this.showBridgeEmptyState();
        return;
      }
      file = await this.plugin.app.vault.create(path, defaultManuscriptForTitle(titleFromFileName(path)));
    }

    if (!(file instanceof TFile)) {
      new Notice(`Noveler cannot open ${path} because it is not a file.`);
      this.editorEl.innerHTML = bridgeEnabled ? BRIDGE_EMPTY_HTML : DEFAULT_MANUSCRIPT;
      return;
    }

    const content = await this.plugin.app.vault.read(file);
    this.lastKnownDiskContent = content;
    this.externalConflict = false;
    const markdownScene = /\.m(?:d|arkdown)$/i.test(file.name);
    const sceneContent = markdownScene ? splitMarkdownFrontmatter(content) : { frontmatter: "", body: content };
    const storedSceneSettings = markdownScene ? getStoredSceneSettings(this.plugin.settings, path) : null;
    const frontmatterSceneSettings = markdownScene ? getNovelerFrontmatterSettings(sceneContent.frontmatter) : null;
    const sceneSettings = hasSceneSettings(frontmatterSceneSettings) ? frontmatterSceneSettings : storedSceneSettings;
    mergeSceneSettingsIntoPluginSettings(this.plugin.settings, sceneSettings, {
      typography: this.plugin.globalTypography || DEFAULT_SETTINGS.typography
    });
    const title = this.deriveDocumentTitle(file, sceneContent.frontmatter || content);
    this.currentMarkdownFrontmatter = sceneContent.frontmatter;
    this.currentDocumentFormat = markdownScene ? "markdown" : "html";
    this.setDocumentTitle(title);
    this.editorEl.setAttribute("contenteditable", "true");
    this.editorEl.innerHTML = this.contentToEditorHtml(file.name, sceneContent.body, title);
    this.currentDocumentPath = path;
    this.applyInferredTypographyFromContent(sceneSettings);
    this.applySettings();
    this.refreshEditorControls();
    this.paginateEditor();
    this.lastSavedHtml = this.prepareHtmlForSave();
    this.hasPendingMetadataSave = false;
    this.updateStatus(`Loaded ${path}`);
  }

  deriveDocumentTitle(file, content) {
    const frontmatterTitle = parseSimpleFrontmatterValue(content, "title")
      || parseSimpleFrontmatterValue(content, "name");
    return frontmatterTitle || titleFromFileName(file && (file.basename || file.name));
  }

  hasLocalChanges() {
    return Boolean(
      this.editorEl
      && (this.prepareHtmlForSave() !== this.lastSavedHtml || this.hasPendingMetadataSave)
    );
  }

  async handleExternalFileModify(file) {
    if (
      !(file instanceof TFile)
      || !this.currentDocumentPath
      || normalizeVaultPath(file.path) !== normalizeVaultPath(this.currentDocumentPath)
      || this.isSaving
    ) {
      return;
    }

    try {
      const content = await this.plugin.app.vault.read(file);
      if (content === this.lastKnownDiskContent) {
        return;
      }

      const isMarkdown = this.currentDocumentFormat === "markdown" && /\.m(?:d|arkdown)$/i.test(file.name);
      if (isMarkdown && this.lastKnownDiskContent !== null) {
        const previous = splitMarkdownFrontmatter(this.lastKnownDiskContent);
        const incoming = splitMarkdownFrontmatter(content);
        if (previous.body === incoming.body) {
          this.lastKnownDiskContent = content;
          this.currentMarkdownFrontmatter = incoming.frontmatter;
          this.setDocumentTitle(this.deriveDocumentTitle(file, incoming.frontmatter || content));
          return;
        }
      }

      if (this.hasLocalChanges()) {
        if (!this.externalConflict) {
          new Notice("Noveler detected external changes to this scene. Saving is paused until the scene is reopened.");
        }
        this.externalConflict = true;
        this.updateStatus("External changes detected");
        return;
      }

      this.lastKnownDiskContent = content;
      this.externalConflict = false;
      await this.loadDocument(file.path);
      this.updateWordCount();
      this.updateStatus(`Reloaded external changes from ${file.path}`);
    } catch (error) {
      console.warn("Noveler could not reconcile external scene changes.", error);
    }
  }

  async refreshTitleFromFile(file) {
    if (!(file instanceof TFile) || !this.currentDocumentPath || normalizeVaultPath(file.path) !== normalizeVaultPath(this.currentDocumentPath)) {
      return;
    }
    try {
      const content = await this.plugin.app.vault.read(file);
      const sceneContent = splitMarkdownFrontmatter(content);
      if (this.currentDocumentFormat === "markdown") {
        this.currentMarkdownFrontmatter = sceneContent.frontmatter;
      }
      const title = this.deriveDocumentTitle(file, sceneContent.frontmatter || content);
      if (title !== this.currentDocumentTitle) {
        this.setDocumentTitle(title);
      }
    } catch (error) {
      console.warn("Noveler could not refresh the scene title.", error);
    }
  }

  showBridgeEmptyState() {
    this.currentDocumentPath = "";
    this.currentMarkdownFrontmatter = "";
    this.currentDocumentFormat = "markdown";
    this.lastKnownDiskContent = null;
    this.externalConflict = false;
    this.setDocumentTitle("Noveler");
    this.lastSavedHtml = BRIDGE_EMPTY_HTML;
    this.hasPendingMetadataSave = false;
    this.editorEl.setAttribute("contenteditable", "false");
    this.editorEl.innerHTML = BRIDGE_EMPTY_HTML;
    this.updateStatus("Select a StoryLine scene");
    this.updateWordCount();
  }

  async openScenePath(path, options = {}) {
    const vaultPath = normalizeVaultPath(path);
    if (!vaultPath) {
      return;
    }
    if (this.plugin.isStoryLineBridgeEnabled() && !this.plugin.isStoryLineScenePath(vaultPath)) {
      this.plugin.notifyBridgePathRejected(vaultPath);
      return;
    }

    if (vaultPath === this.currentDocumentPath && this.editorEl && this.prepareHtmlForSave() === this.lastSavedHtml) {
      this.restoreSceneTypographySettings();
      this.applySettings();
      this.refreshEditorControls();
      this.updateStatus(`Loaded ${vaultPath}`);
      return;
    }

    const file = this.plugin.app.vault.getAbstractFileByPath(vaultPath);
    if (!(file instanceof TFile)) {
      new Notice(`Noveler could not find scene: ${vaultPath}`);
      return;
    }

    if (!(await this.saveBeforeDocumentChange())) {
      return;
    }
    if (!this.plugin.isStoryLineBridgeEnabled()) {
      this.plugin.settings.manuscriptPath = vaultPath;
      await this.plugin.saveSettings();
    }
    await this.loadDocument(vaultPath);
    this.updateWordCount();
    this.updateStatus(options.source === "storyline" ? `StoryLine scene: ${vaultPath}` : `Opened ${vaultPath}`);
    if (!options.silent) {
      new Notice(`Noveler opened ${vaultPath}.`);
    }
  }

  async ensureParentFolder(path) {
    const parts = normalizeVaultPath(path).split("/");
    parts.pop();
    let current = "";
    for (const part of parts) {
      if (!part) {
        continue;
      }
      current = current ? `${current}/${part}` : part;
      const existing = this.plugin.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.plugin.app.vault.createFolder(current);
      }
    }
  }

  async openVaultFile(path) {
    const vaultPath = normalizeVaultPath(path);
    if (!vaultPath || !this.isSupportedDroppedFileName(vaultPath)) {
      new Notice("Noveler can open Markdown, text, and HTML files.");
      return;
    }
    if (this.plugin.isStoryLineBridgeEnabled()) {
      if (!this.plugin.isStoryLineScenePath(vaultPath)) {
        this.plugin.notifyBridgePathRejected(vaultPath);
        return;
      }
      await this.openScenePath(vaultPath, { source: "storyline" });
      return;
    }

    const file = this.plugin.app.vault.getAbstractFileByPath(vaultPath);
    if (!(file instanceof TFile)) {
      new Notice(`Noveler cannot open ${vaultPath}.`);
      return;
    }

    if (!(await this.saveBeforeDocumentChange())) {
      return;
    }
    const content = await this.plugin.app.vault.read(file);
    this.lastKnownDiskContent = content;
    this.externalConflict = false;
    const isMarkdown = /\.m(?:d|arkdown)$/i.test(file.name);

    if (isMarkdown) {
      this.plugin.settings.manuscriptPath = vaultPath;
      await this.plugin.saveSettings();
      const sceneContent = splitMarkdownFrontmatter(content);
      const storedSceneSettings = getStoredSceneSettings(this.plugin.settings, vaultPath);
      const frontmatterSceneSettings = getNovelerFrontmatterSettings(sceneContent.frontmatter);
      const sceneSettings = hasSceneSettings(frontmatterSceneSettings) ? frontmatterSceneSettings : storedSceneSettings;
      mergeSceneSettingsIntoPluginSettings(this.plugin.settings, sceneSettings, {
        typography: this.plugin.globalTypography || DEFAULT_SETTINGS.typography
      });
      const title = this.deriveDocumentTitle(file, content);
      this.setDocumentTitle(title);
      this.currentMarkdownFrontmatter = sceneContent.frontmatter;
      this.currentDocumentFormat = "markdown";
      this.editorEl.innerHTML = this.contentToEditorHtml(file.name, sceneContent.body, title);
      this.currentDocumentPath = vaultPath;
      this.applyInferredTypographyFromContent(sceneSettings);
      this.applySettings();
      this.refreshEditorControls();
      this.paginateEditor();
      this.lastSavedHtml = this.prepareHtmlForSave();
      this.hasPendingMetadataSave = false;
      this.updateWordCount();
      this.updateStatus(`Opened ${vaultPath}`);
      new Notice(`Noveler opened ${vaultPath}.`);
      return;
    }

    await this.importDroppedContent(file.name, content);
  }

  async openDroppedBrowserFile(file) {
    if (!file || !this.isSupportedDroppedFileName(file.name)) {
      new Notice("Noveler can open Markdown, text, and HTML files.");
      return;
    }
    if (this.plugin.isStoryLineBridgeEnabled()) {
      new Notice("Bridge mode only opens existing StoryLine scene files from the vault.");
      return;
    }

    if (!(await this.saveBeforeDocumentChange())) {
      return;
    }
    const content = await this.readBrowserFile(file);
    await this.importDroppedContent(file.name, content);
  }

  async importDroppedContent(fileName, content) {
    if (this.plugin.isStoryLineBridgeEnabled()) {
      new Notice("Bridge mode only writes existing StoryLine scene files.");
      return;
    }

    const title = titleFromFileName(fileName);
    const html = this.contentToEditorHtml(fileName, content, title);
    const importPath = await this.getUniqueImportPath(fileName);

    await this.ensureParentFolder(importPath);
    const existing = this.plugin.app.vault.getAbstractFileByPath(importPath);
    if (existing instanceof TFile) {
      await this.plugin.app.vault.modify(existing, html);
    } else {
      await this.plugin.app.vault.create(importPath, html);
    }

    this.plugin.settings.manuscriptPath = importPath;
    await this.plugin.saveSettings();
    this.setDocumentTitle(title);
    this.editorEl.innerHTML = html;
    this.currentMarkdownFrontmatter = "";
    this.currentDocumentFormat = "markdown";
    this.currentDocumentPath = importPath;
    this.lastKnownDiskContent = html;
    this.externalConflict = false;
    this.applyInferredTypographyFromContent(null);
    this.applySettings();
    this.refreshEditorControls();
    this.paginateEditor();
    this.lastSavedHtml = this.prepareHtmlForSave();
    this.hasPendingMetadataSave = false;
    this.updateWordCount();
    this.updateStatus(`Imported ${importPath}`);
    new Notice(`Noveler imported ${importPath}.`);
  }

  async getUniqueImportPath(fileName) {
    const folder = normalizeVaultPath(this.plugin.settings.fileOpen.importFolder) || DEFAULT_SETTINGS.fileOpen.importFolder;
    const baseName = this.sanitizeFileName(fileName).replace(/\.[^.]+$/, "") || "Dropped manuscript";
    let candidate = `${folder}/${baseName}.md`;
    let index = 2;

    while (this.plugin.app.vault.getAbstractFileByPath(candidate)) {
      candidate = `${folder}/${baseName} ${index}.md`;
      index += 1;
    }

    return candidate;
  }

  sanitizeFileName(fileName) {
    return String(fileName || "Dropped manuscript")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  isSupportedDroppedFileName(fileName) {
    return /\.(md|markdown|txt|html|htm)$/i.test(String(fileName || ""));
  }

  async readBrowserFile(file) {
    if (typeof file.text === "function") {
      return file.text();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Unable to read dropped file"));
      reader.readAsText(file);
    });
  }

  contentToEditorHtml(fileName, content, fallbackTitle) {
    const text = String(content || "");
    const title = fallbackTitle || "Untitled Manuscript";
    if (!text.trim()) {
      return defaultManuscriptForTitle(title);
    }

    if (title !== "Untitled Manuscript" && isUntitledManuscriptPlaceholder(text)) {
      return defaultManuscriptForTitle(title);
    }

    if (/\.html?$/i.test(fileName)) {
      return this.extractBodyHtml(text, title);
    }

    return this.markdownToEditorHtml(text);
  }

  extractBodyHtml(html, fallbackTitle) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const bodyHtml = doc.body.innerHTML.trim();
      if (!bodyHtml) {
        return defaultManuscriptForTitle(fallbackTitle || "Untitled Manuscript");
      }
      if (fallbackTitle && fallbackTitle !== "Untitled Manuscript" && isUntitledManuscriptPlaceholder(bodyHtml)) {
        return defaultManuscriptForTitle(fallbackTitle);
      }
      return sanitizeEditorHtml(bodyHtml);
    } catch (error) {
      console.error(error);
      return this.markdownToEditorHtml(html);
    }
  }

  markdownToEditorHtml(markdown) {
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let index = 0;
    const isBlockStart = (line) => /^(?:#{1,6}\s+|\s*(?:[-*_]\s*){3,}\s*$|\s*>|\s*(?:[-+*]|\d+\.)\s+|\s*```|\s*<(?:p|h[1-6]|div|blockquote|ul|ol|pre|hr)\b)/i.test(line);

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^\s*```\s*([^\s`]*)\s*$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
          code.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
        blocks.push(`<pre><code${language}>${escapeHtml(code.join("\n"))}</code></pre>`);
        continue;
      }

      if (/^\s*<(?:p|h[1-6]|div|blockquote|ul|ol|pre|hr)\b/i.test(line)) {
        const raw = [line];
        index += 1;
        while (index < lines.length && lines[index].trim()) {
          raw.push(lines[index]);
          index += 1;
        }
        const safe = sanitizeEditorHtml(raw.join("\n"));
        if (safe) blocks.push(safe);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        blocks.push(`<h${heading[1].length}>${this.markdownInlineToHtml(heading[2])}</h${heading[1].length}>`);
        index += 1;
        continue;
      }

      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        blocks.push("<hr>");
        index += 1;
        continue;
      }

      if (/^\s*>/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^\s*>/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }
        blocks.push(`<blockquote>${quoteLines.map((item) => this.markdownInlineToHtml(item)).join("<br>")}</blockquote>`);
        continue;
      }

      if (/^\s*(?:[-+*]|\d+\.)\s+/.test(line)) {
        const listLines = [];
        while (index < lines.length && /^\s*(?:[-+*]|\d+\.)\s+/.test(lines[index])) {
          listLines.push(lines[index]);
          index += 1;
        }
        blocks.push(this.markdownListToHtml(listLines));
        continue;
      }

      const paragraph = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
        paragraph.push(lines[index]);
        index += 1;
      }
      let paragraphHtml = "";
      paragraph.forEach((item, paragraphIndex) => {
        const hardBreak = /\s{2}$/.test(item);
        paragraphHtml += this.markdownInlineToHtml(item.replace(/\s+$/, ""));
        if (paragraphIndex < paragraph.length - 1) {
          paragraphHtml += hardBreak ? "<br>" : " ";
        }
      });
      blocks.push(`<p>${paragraphHtml}</p>`);
    }

    return sanitizeEditorHtml(blocks.join("")) || DEFAULT_MANUSCRIPT;
  }

  markdownInlineToHtml(value) {
    const tokens = [];
    const stash = (html) => {
      const token = `\uE000${tokens.length}\uE001`;
      tokens.push(html);
      return token;
    };
    let text = String(value || "");
    text = text.replace(/\\([\\`*_[\]{}()#+\-.!~])/g, (_match, char) => stash(escapeHtml(char)));
    text = text.replace(/`([^`]+)`/g, (_match, code) => stash(`<code>${escapeHtml(code)}</code>`));
    text = text.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, (_match, alt, src, title) => {
      if (!isSafeEditorUrl(src, true)) return escapeHtml(_match);
      return stash(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""}>`);
    });
    text = text.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, (_match, label, href, title) => {
      if (!isSafeEditorUrl(href)) return escapeHtml(_match);
      return stash(`<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}>${this.markdownInlineToHtml(label)}</a>`);
    });
    text = text.replace(/<\/?(?:strong|b|em|i|s|strike|u|sup|sub|span|font|a|code)\b[^>]*>/gi, (tag) => stash(sanitizeInlineEditorTag(tag)));
    text = escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<s>$1</s>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
    for (let tokenIndex = tokens.length - 1; tokenIndex >= 0; tokenIndex -= 1) {
      text = text.replace(`\uE000${tokenIndex}\uE001`, tokens[tokenIndex]);
    }
    return text;
  }

  markdownListToHtml(lines) {
    const container = document.createElement("div");
    const stack = [];
    for (const rawLine of lines) {
      const match = rawLine.match(/^(\s*)([-+*]|\d+\.)\s+(.+)$/);
      if (!match) continue;
      const indent = match[1].replace(/\t/g, "    ").length;
      const ordered = /\d+\./.test(match[2]);
      const checklist = !ordered && /^\[[ xX]\]\s+/.test(match[3]);
      let content = checklist ? match[3].replace(/^\[[ xX]\]\s+/, "") : match[3];
      const checked = checklist && /^\[[xX]\]/.test(match[3]);

      while (stack.length && indent < stack[stack.length - 1].indent) stack.pop();
      let level = stack[stack.length - 1];
      if (!level || indent > level.indent) {
        const list = document.createElement(ordered ? "ol" : "ul");
        if (checklist) list.className = "noveler-checklist";
        const parent = level && level.lastItem ? level.lastItem : container;
        parent.appendChild(list);
        level = { indent, ordered, list, lastItem: null };
        stack.push(level);
      } else if (level.ordered !== ordered) {
        const parent = level.list.parentElement || container;
        stack.pop();
        const list = document.createElement(ordered ? "ol" : "ul");
        if (checklist) list.className = "noveler-checklist";
        parent.appendChild(list);
        level = { indent, ordered, list, lastItem: null };
        stack.push(level);
      }
      if (checklist) level.list.classList.add("noveler-checklist");

      const item = document.createElement("li");
      if (checklist) {
        item.setAttribute("data-checked", checked ? "true" : "false");
        item.innerHTML = `<span class="noveler-checkbox" contenteditable="false">${checked ? "☑" : "☐"}</span> ${this.markdownInlineToHtml(content)}`;
      } else {
        item.innerHTML = this.markdownInlineToHtml(content);
      }
      level.list.appendChild(item);
      level.lastItem = item;
    }
    return sanitizeEditorHtml(container.innerHTML);
  }

  scheduleSave() {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => {
      this.saveDocument({ silent: true });
    }, 700);
  }

  async saveDocument(options = {}) {
    if (!this.editorEl) {
      return false;
    }
    const silent = !!options.silent;
    this.savePendingSilent = this.savePending ? this.savePendingSilent && silent : silent;
    this.savePending = true;
    if (!this.savePromise) {
      this.savePromise = this.flushSaveQueue();
    }
    return this.savePromise;
  }

  async flushSaveQueue() {
    this.isSaving = true;
    let success = true;
    try {
      while (this.savePending) {
        const silent = this.savePendingSilent;
        this.savePending = false;
        this.savePendingSilent = true;
        success = (await this.performSave({ silent })) && success;
      }
      return success;
    } finally {
      this.isSaving = false;
      this.savePromise = null;
    }
  }

  async saveBeforeDocumentChange() {
    if (!this.currentDocumentPath && this.plugin.isStoryLineBridgeEnabled()) {
      return true;
    }
    const saved = await this.saveDocument({ silent: true });
    if (!saved && this.hasLocalChanges()) {
      new Notice("Noveler kept the current scene open because its changes could not be saved.");
      return false;
    }
    return true;
  }

  async reconcileDiskBeforeSave(file) {
    if (!(file instanceof TFile) || this.lastKnownDiskContent === null) {
      return true;
    }
    const diskContent = await this.plugin.app.vault.read(file);
    if (diskContent === this.lastKnownDiskContent) {
      return true;
    }

    if (this.currentDocumentFormat === "markdown" && /\.m(?:d|arkdown)$/i.test(file.name)) {
      const previous = splitMarkdownFrontmatter(this.lastKnownDiskContent);
      const incoming = splitMarkdownFrontmatter(diskContent);
      if (previous.body === incoming.body) {
        this.lastKnownDiskContent = diskContent;
        this.currentMarkdownFrontmatter = incoming.frontmatter;
        this.setDocumentTitle(this.deriveDocumentTitle(file, incoming.frontmatter || diskContent));
        return true;
      }
    }

    this.externalConflict = true;
    this.updateStatus("Save blocked by external changes");
    new Notice("Noveler did not overwrite external scene changes. Reopen the scene to load the newer file.");
    return false;
  }

  async performSave(options = {}) {
    if (this.plugin.isStoryLineBridgeEnabled() && !this.currentDocumentPath) {
      if (!options.silent) {
        new Notice("Select a StoryLine scene before saving in bridge mode.");
      }
      return false;
    }

    const path = this.plugin.isStoryLineBridgeEnabled()
      ? normalizeVaultPath(this.currentDocumentPath)
      : normalizeVaultPath(this.plugin.settings.manuscriptPath) || DEFAULT_SETTINGS.manuscriptPath;
    if (this.plugin.isStoryLineBridgeEnabled() && !this.plugin.isStoryLineScenePath(path)) {
      this.plugin.notifyBridgePathRejected(path);
      return false;
    }
    if (this.externalConflict) {
      if (!options.silent) {
        new Notice("Noveler did not save because this scene changed outside the editor. Reopen it first.");
      }
      return false;
    }
    const html = this.prepareHtmlForSave();
    if (html === this.lastSavedHtml && options.silent && !this.hasPendingMetadataSave) {
      this.updateStatus("Saved");
      return true;
    }

    try {
      await this.ensureParentFolder(path);
      const existing = this.plugin.app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile && !(await this.reconcileDiskBeforeSave(existing))) {
        return false;
      }
      const content = this.prepareContentForSave(path, html);
      if (existing instanceof TFile) {
        await this.plugin.app.vault.modify(existing, content);
      } else if (!existing) {
        if (this.plugin.isStoryLineBridgeEnabled()) {
          throw new Error(`StoryLine scene not found: ${path}`);
        }
        await this.plugin.app.vault.create(path, content);
      } else {
        throw new Error(`${path} is not a file`);
      }
      this.lastSavedHtml = html;
      this.lastKnownDiskContent = content;
      this.externalConflict = false;
      this.hasPendingMetadataSave = false;
      this.updateStatus("Saved");
      if (!options.silent) {
        new Notice("Noveler manuscript saved.");
      }
      return true;
    } catch (error) {
      console.error(error);
      new Notice(`Noveler could not save: ${error.message}`);
      this.updateStatus("Save failed");
      return false;
    }
  }

  prepareHtmlForSave() {
    const cloneEl = this.editorEl.cloneNode(true);
    this.unwrapEditorPages(cloneEl);
    this.mergeSplitBlocks(cloneEl);
    this.removeFocusVisualState(cloneEl);
    cloneEl.innerHTML = sanitizeEditorHtml(cloneEl.innerHTML);
    if (this.plugin.settings.automation.removeDoubleSpacesOnSave) {
      this.cleanTextNodes(cloneEl, (text) => text.replace(/[ \t]{2,}/g, " "));
    }
    let html = cloneEl.innerHTML;
    if (this.plugin.settings.automation.normalizeLineBreaksOnSave) {
      html = this.normalizeBreakHtml(html);
    }
    return html.trim() || "<p><br></p>";
  }

  prepareContentForSave(path, html) {
    if (this.currentDocumentFormat === "markdown" && /\.m(?:d|arkdown)$/i.test(path)) {
      const cloneEl = this.editorEl.cloneNode(true);
      this.unwrapEditorPages(cloneEl);
      this.mergeSplitBlocks(cloneEl);
      this.removeFocusVisualState(cloneEl);
      cloneEl.innerHTML = sanitizeEditorHtml(cloneEl.innerHTML);
      if (this.plugin.settings.automation.removeDoubleSpacesOnSave) {
        this.cleanTextNodes(cloneEl, (text) => text.replace(/[ \t]{2,}/g, " "));
      }
      const markdown = this.htmlToMarkdown(cloneEl).trim();
      const body = `${markdown || ""}\n`;
      const frontmatter = mergeNovelerSettingsIntoFrontmatter(
        this.currentMarkdownFrontmatter,
        getNovelerSceneSettings(this.plugin.settings)
      );
      this.currentMarkdownFrontmatter = frontmatter;
      return frontmatter
        ? `${frontmatter}\n\n${body}`
        : body;
    }
    return html;
  }

  schedulePagination() {
    if (this.paginationTimer) {
      window.clearTimeout(this.paginationTimer);
    }
    this.paginationTimer = window.setTimeout(() => {
      this.paginationTimer = null;
      this.paginateEditor();
    }, 120);
  }

  paginateEditor() {
    if (!this.editorEl || this.plugin.settings.layout.mode !== "page") {
      return;
    }

    const pageHeight = Number(this.plugin.settings.layout.pageHeight) || DEFAULT_SETTINGS.layout.pageHeight;
    const selectionState = this.pendingModeSelectionState || this.captureEditorSelectionState();
    this.pendingModeSelectionState = null;
    const nodes = this.collectEditorContentNodes(this.editorEl);
    if (!nodes.length) {
      nodes.push(document.createElement("p"));
      nodes[0].appendChild(document.createElement("br"));
    }

    this.editorEl.empty();
    let page = this.createEditorPage();
    for (const node of nodes) {
      let pending = node;
      while (pending) {
        page.appendChild(pending);
        if (page.scrollHeight <= pageHeight + 2) {
          pending = null;
          continue;
        }

        page.removeChild(pending);
        const remainder = this.splitBlockToFitPage(pending, page, pageHeight);
        if (remainder) {
          pending = remainder;
          page = this.createEditorPage();
          continue;
        }

        if (this.getPageContentNodes(page).length) {
          page = this.createEditorPage();
          continue;
        }

        page.appendChild(pending);
        pending = null;
      }
    }

    this.updatePageFooters();
    this.updateEditorFrameHeight();
    this.restoreEditorSelectionState(selectionState);
    this.updateActivePageRuler();
    if (this.revealCaretAfterPagination) {
      this.revealCaretAfterPagination = false;
      window.requestAnimationFrame(() => this.revealCurrentCaretPage());
    }
  }

  collectEditorContentNodes(root) {
    const nodes = [];
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-page")) {
        nodes.push(...this.getPageContentNodes(child));
      } else if (child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-pagination-marker")) {
        continue;
      } else if (child.nodeType !== Node.TEXT_NODE || child.textContent.trim()) {
        nodes.push(child);
      }
    }
    return this.mergeCollectedSplitBlocks(nodes);
  }

  mergeCollectedSplitBlocks(nodes) {
    const output = [];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (!(node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("data-noveler-split-id"))) {
        output.push(node);
        continue;
      }

      const splitId = node.getAttribute("data-noveler-split-id");
      const group = [node];
      while (
        index + 1 < nodes.length
        && nodes[index + 1].nodeType === Node.ELEMENT_NODE
        && nodes[index + 1].getAttribute("data-noveler-split-id") === splitId
      ) {
        index += 1;
        group.push(nodes[index]);
      }

      const merged = node.cloneNode(false);
      merged.removeAttribute("data-noveler-split-id");
      merged.removeAttribute("data-noveler-split-part");
      for (const block of group) {
        for (const child of Array.from(block.childNodes)) {
          merged.appendChild(child.cloneNode(true));
        }
      }
      output.push(merged);
    }
    return output;
  }

  getPageContentNodes(page) {
    return Array.from(page.childNodes).filter((child) => {
      return !(child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-pagination-marker"));
    });
  }

  createEditorPage() {
    const page = this.editorEl.createDiv({ cls: "noveler-page" });
    return page;
  }

  updatePageFooters() {
    if (!this.editorEl) {
      return;
    }
    const pages = Array.from(this.editorEl.querySelectorAll(".noveler-page"));
    pages.forEach((page, index) => {
      page.dataset.pageLabel = String(index + 1);
      page.dataset.pageTitle = this.currentDocumentTitle || "";
      page.setAttribute("aria-label", `Page ${index + 1}`);
    });
    this.editorEl.style.setProperty("--noveler-page-count", String(pages.length || 1));
  }

  splitBlockToFitPage(node, page, pageHeight) {
    if (!this.canSplitBlock(node)) {
      return null;
    }

    const sourceText = node.textContent || "";
    const boundaries = Array.from(sourceText.matchAll(/\s+(?=\S)/g), (match) => match.index + match[0].length)
      .filter((offset) => offset > 0 && offset < sourceText.length);
    if (!boundaries.length) {
      return null;
    }

    const splitId = node.getAttribute("data-noveler-split-id") || `split-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    let low = 0;
    let high = boundaries.length - 1;
    let fit = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const tester = this.cloneBlockTextRange(node, 0, boundaries[mid]);
      page.appendChild(tester);
      if (page.scrollHeight <= pageHeight + 2) {
        fit = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
      tester.remove();
    }

    if (fit < 0) {
      return null;
    }

    const splitOffset = boundaries[fit];
    const head = this.cloneBlockTextRange(node, 0, splitOffset);
    head.setAttribute("data-noveler-split-id", splitId);
    head.setAttribute("data-noveler-split-part", "head");
    page.appendChild(head);

    const tail = this.cloneBlockTextRange(node, splitOffset, sourceText.length);
    tail.setAttribute("data-noveler-split-id", splitId);
    tail.setAttribute("data-noveler-split-part", "tail");
    return tail;
  }

  cloneBlockTextRange(node, startOffset, endOffset) {
    const source = node.cloneNode(true);
    for (const marker of source.querySelectorAll(".noveler-pagination-marker")) {
      marker.remove();
    }
    const start = this.getTextPosition(source, startOffset, "forward");
    const end = this.getTextPosition(source, endOffset, "backward");
    const shell = node.cloneNode(false);
    shell.removeAttribute("data-noveler-split-id");
    shell.removeAttribute("data-noveler-split-part");
    if (!start || !end) {
      return shell;
    }
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    shell.appendChild(range.cloneContents());
    return shell;
  }

  getTextPosition(root, targetOffset, bias = "forward") {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, Number(targetOffset) || 0);
    let lastNode = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const length = node.nodeValue ? node.nodeValue.length : 0;
      lastNode = node;
      if (remaining < length || (remaining === length && bias === "backward")) {
        return { node, offset: remaining };
      }
      remaining -= length;
    }
    if (lastNode) {
      return { node: lastNode, offset: lastNode.nodeValue ? lastNode.nodeValue.length : 0 };
    }
    return { node: root, offset: bias === "backward" ? root.childNodes.length : 0 };
  }

  canSplitBlock(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    const tag = node.tagName.toLowerCase();
    if (!["p", "blockquote", "div"].includes(tag)) {
      return false;
    }
    if (node.hasClass("noveler-scene-break") || node.querySelector("img, table, ul, ol, pre")) {
      return false;
    }
    return /\s/.test(node.textContent || "");
  }

  unwrapEditorPages(root) {
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-page")) {
        for (const pageChild of Array.from(child.childNodes)) {
          fragment.appendChild(pageChild);
        }
      } else {
        fragment.appendChild(child);
      }
    }
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
    root.appendChild(fragment);
  }

  mergeSplitBlocks(root) {
    const splitBlocks = Array.from(root.querySelectorAll("[data-noveler-split-id]"));
    const groups = new Map();
    for (const block of splitBlocks) {
      const id = block.getAttribute("data-noveler-split-id");
      if (!groups.has(id)) {
        groups.set(id, []);
      }
      groups.get(id).push(block);
    }

    for (const blocks of groups.values()) {
      const first = blocks[0];
      if (!first) {
        continue;
      }
      first.removeAttribute("data-noveler-split-id");
      first.removeAttribute("data-noveler-split-part");
      for (const block of blocks.slice(1)) {
        while (block.firstChild) {
          first.appendChild(block.firstChild);
        }
        block.remove();
      }
    }
  }

  captureEditorSelectionState(range = this.getSelectionRange() || this.lastRange) {
    if (!range || !this.editorEl) {
      return null;
    }
    const rangeElement = getElementForNode(range.commonAncestorContainer || range.startContainer);
    if (!rangeElement || (rangeElement !== this.editorEl && !this.editorEl.contains(rangeElement))) {
      return null;
    }
    const startRange = document.createRange();
    startRange.selectNodeContents(this.editorEl);
    startRange.setEnd(range.startContainer, range.startOffset);
    const endRange = document.createRange();
    endRange.selectNodeContents(this.editorEl);
    endRange.setEnd(range.endContainer, range.endOffset);
    const state = {
      start: startRange.toString().length,
      end: endRange.toString().length
    };
    const startBlock = getElementForNode(range.startContainer);
    const logicalBlock = startBlock && startBlock.closest("p,h1,h2,h3,h4,h5,h6,blockquote,div,ul,ol,hr,pre");
    if (logicalBlock && !(logicalBlock.textContent || "").length) {
      const blocks = this.getLogicalEditorBlocks();
      const blockIndex = blocks.indexOf(logicalBlock);
      if (blockIndex >= 0) {
        state.emptyBlockIndex = blockIndex;
      }
    }
    return state;
  }

  restoreEditorSelectionState(state) {
    if (!state || !this.editorEl) {
      return null;
    }
    let start;
    let end;
    if (Number.isInteger(state.emptyBlockIndex)) {
      const block = this.getLogicalEditorBlocks()[state.emptyBlockIndex];
      if (block) {
        start = { node: block, offset: 0 };
        end = { node: block, offset: 0 };
      }
    }
    start = start || this.getTextPosition(this.editorEl, state.start, "forward");
    end = end || this.getTextPosition(this.editorEl, state.end, "backward");
    if (!start || !end) {
      return null;
    }
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      this.captureSelection();
      return range;
    }
    return null;
  }

  captureCaretFromPoint(event) {
    if (!this.editorEl || event.button !== 0) {
      return;
    }
    let node = null;
    let offset = 0;
    if (typeof document.caretPositionFromPoint === "function") {
      const position = document.caretPositionFromPoint(event.clientX, event.clientY);
      node = position && position.offsetNode;
      offset = position ? position.offset : 0;
    } else if (typeof document.caretRangeFromPoint === "function") {
      const pointRange = document.caretRangeFromPoint(event.clientX, event.clientY);
      node = pointRange && pointRange.startContainer;
      offset = pointRange ? pointRange.startOffset : 0;
    }
    const element = getElementForNode(node);
    if (!node || !element || (element !== this.editorEl && !this.editorEl.contains(element))) {
      return;
    }
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const state = this.captureEditorSelectionState(range);
    if (state) {
      this.lastCaretSelectionState = { ...state };
      this.lastRange = range.cloneRange();
    }
  }

  getLogicalEditorBlocks() {
    if (!this.editorEl) {
      return [];
    }
    const blocks = [];
    for (const child of Array.from(this.editorEl.children)) {
      if (child.hasClass("noveler-page")) {
        blocks.push(...Array.from(child.children));
      } else {
        blocks.push(child);
      }
    }
    return blocks.filter((element) => !element.hasClass("noveler-pagination-marker"));
  }

  removeFocusVisualState(root) {
    if (!root) {
      return;
    }
    const elements = root.nodeType === Node.ELEMENT_NODE
      ? [root, ...root.querySelectorAll(".noveler-focus-block, [style*='--noveler-focus-line-']")]
      : Array.from(root.querySelectorAll(".noveler-focus-block, [style*='--noveler-focus-line-']"));
    for (const element of elements) {
      element.removeClass("noveler-focus-block");
      element.style.removeProperty("--noveler-focus-line-top");
      element.style.removeProperty("--noveler-focus-line-bottom");
      if (!element.getAttribute("style")) {
        element.removeAttribute("style");
      }
    }
  }

  insertSelectionMarker() {
    const range = this.getSelectionRange();
    if (!range || !range.collapsed) {
      return null;
    }
    const marker = document.createElement("span");
    marker.className = "noveler-pagination-marker";
    marker.setAttribute("data-noveler-pagination-marker", "true");
    marker.appendChild(document.createTextNode(""));
    range.insertNode(marker);
    range.setStartAfter(marker);
    range.collapse(true);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return marker;
  }

  restoreSelectionMarker(marker) {
    if (!marker || !marker.parentNode) {
      return;
    }
    const range = document.createRange();
    range.setStartAfter(marker);
    range.collapse(true);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    marker.remove();
    this.captureSelection();
  }

  getPageZoom() {
    const isFocus = this.plugin.settings.layout.mode === "focus";
    const zoom = isFocus
      ? Number(this.plugin.settings.focus.defaultZoom) || DEFAULT_SETTINGS.focus.defaultZoom
      : Number(this.plugin.settings.layout.pageZoom) || DEFAULT_SETTINGS.layout.pageZoom;
    return this.clampNumber(zoom, 50, 250) / 100;
  }

  updateEditorFrameHeight() {
    if (!this.editorFrameEl) {
      return;
    }
    const layout = this.plugin.settings.layout;
    if (layout.mode !== "page") {
      this.editorFrameEl.style.removeProperty("--noveler-editor-stack-height");
      return;
    }
    const pageHeight = Number(layout.pageHeight) || DEFAULT_SETTINGS.layout.pageHeight;
    const stackHeight = this.editorEl ? Math.max(pageHeight, this.editorEl.scrollHeight) : pageHeight;
    this.editorFrameEl.style.setProperty("--noveler-editor-stack-height", `${stackHeight * this.getPageZoom()}px`);
  }

  getSidebarSplit(side) {
    const workspace = this.plugin.app.workspace;
    return side === "left" ? workspace.leftSplit : workspace.rightSplit;
  }

  getSidebarCollapsed(side) {
    const split = this.getSidebarSplit(side);
    return split && typeof split.collapsed === "boolean" ? split.collapsed : null;
  }

  setSidebarCollapsed(side, collapsed) {
    const split = this.getSidebarSplit(side);
    if (!split || this.getSidebarCollapsed(side) === collapsed) {
      return;
    }
    try {
      if (collapsed && typeof split.collapse === "function") {
        split.collapse();
      } else if (!collapsed && typeof split.expand === "function") {
        split.expand();
      }
    } catch (error) {
      console.warn(`Noveler could not ${collapsed ? "collapse" : "restore"} the ${side} sidebar.`, error);
    }
  }

  enterFocusMode() {
    this.closeColorPopover();
    if (!this.focusModeActive) {
      this.focusModeActive = true;
      this.plugin.acquireFocusMode(this);
    }
    this.scheduleFocusUpdate();
  }

  leaveFocusMode() {
    if (!this.focusModeActive) {
      return;
    }
    this.focusModeActive = false;
    if (this.focusUpdateFrame) {
      window.cancelAnimationFrame(this.focusUpdateFrame);
      this.focusUpdateFrame = 0;
    }
    if (this.focusTransitionFrame) {
      window.cancelAnimationFrame(this.focusTransitionFrame);
      this.focusTransitionFrame = 0;
    }
    if (this.focusCenterFrame) {
      window.cancelAnimationFrame(this.focusCenterFrame);
      this.focusCenterFrame = 0;
    }
    if (this.editorEl) {
      for (const element of this.editorEl.querySelectorAll(".noveler-focus-block")) {
        element.removeClass("noveler-focus-block");
        element.style.removeProperty("--noveler-focus-line-top");
        element.style.removeProperty("--noveler-focus-line-bottom");
      }
    }
    this.plugin.releaseFocusMode(this);
  }

  scheduleFocusTransition(selectionState) {
    if (!selectionState || !this.editorEl || this.plugin.settings.layout.mode !== "focus") {
      this.scheduleFocusUpdate();
      return;
    }
    if (this.focusTransitionFrame) {
      window.cancelAnimationFrame(this.focusTransitionFrame);
    }
    this.focusTransitionFrame = window.requestAnimationFrame(() => {
      this.focusTransitionFrame = window.requestAnimationFrame(() => {
        this.focusTransitionFrame = 0;
        if (!this.editorEl || this.plugin.settings.layout.mode !== "focus") {
          return;
        }
        this.editorEl.focus({ preventScroll: true });
        const range = this.restoreEditorSelectionState(selectionState);
        if (range) {
          this.lastCaretSelectionState = { ...selectionState };
          this.updateFocusLine(range);
        }
      });
    });
  }

  scheduleFocusUpdate(range) {
    if (!this.editorEl || this.plugin.settings.layout.mode !== "focus") {
      return;
    }
    if (range) {
      this.pendingFocusRange = range.cloneRange();
    }
    if (this.focusUpdateFrame) {
      window.cancelAnimationFrame(this.focusUpdateFrame);
    }
    this.focusUpdateFrame = window.requestAnimationFrame(() => {
      this.focusUpdateFrame = 0;
      const pendingRange = this.pendingFocusRange;
      this.pendingFocusRange = null;
      this.updateFocusLine(pendingRange || this.getSelectionRange());
    });
  }

  updateFocusLine(range) {
    if (!this.editorEl || this.plugin.settings.layout.mode !== "focus") {
      return;
    }
    for (const element of this.editorEl.querySelectorAll(".noveler-focus-block")) {
      element.removeClass("noveler-focus-block");
      element.style.removeProperty("--noveler-focus-line-top");
      element.style.removeProperty("--noveler-focus-line-bottom");
    }
    if (!range) {
      return;
    }

    let block = getElementForNode(range.endContainer);
    while (block && block !== this.editorEl && block.parentElement !== this.editorEl) {
      block = block.parentElement;
    }
    if (block && block !== this.editorEl) {
      block.addClass("noveler-focus-block");
    }

    const focusRect = this.getFocusRangeRect(range, block);
    if (block && block !== this.editorEl && focusRect && this.plugin.settings.focus.highlightScope !== "paragraph") {
      const blockRect = block.getBoundingClientRect();
      const lineTop = Math.max(0, focusRect.top - blockRect.top - 1);
      const lineBottom = Math.min(blockRect.height, focusRect.bottom - blockRect.top + 1);
      block.style.setProperty("--noveler-focus-line-top", `${lineTop}px`);
      block.style.setProperty("--noveler-focus-line-bottom", `${Math.max(lineTop + 1, lineBottom)}px`);
    }

    if (this.plugin.settings.focus.typewriter) {
      this.centerFocusRect(focusRect);
    }
  }

  getFocusRangeRect(range, fallbackElement) {
    const caretRange = range.cloneRange();
    caretRange.collapse(false);
    const container = caretRange.startContainer;
    if (container && container.nodeType === Node.TEXT_NODE && container.data.length) {
      const characterRange = document.createRange();
      const offset = Math.min(caretRange.startOffset, container.data.length);
      const useForwardCharacter = offset < container.data.length;
      const startOffset = useForwardCharacter ? offset : Math.max(0, offset - 1);
      const endOffset = useForwardCharacter ? offset + 1 : offset;
      characterRange.setStart(container, startOffset);
      characterRange.setEnd(container, endOffset);
      const characterRects = Array.from(characterRange.getClientRects());
      if (characterRects.length) {
        return useForwardCharacter ? characterRects[0] : characterRects[characterRects.length - 1];
      }
    }

    const rects = Array.from(caretRange.getClientRects());
    const caretRect = rects.length ? rects[rects.length - 1] : caretRange.getBoundingClientRect();
    if (caretRect && caretRect.height && Number.isFinite(caretRect.top)) {
      return caretRect;
    }

    return fallbackElement ? fallbackElement.getBoundingClientRect() : null;
  }

  centerFocusRect(targetRect) {
    if (!this.workAreaEl || !targetRect || !Number.isFinite(targetRect.top)) {
      return;
    }
    this.applyFocusCenter(targetRect);
    if (this.focusCenterFrame) {
      window.cancelAnimationFrame(this.focusCenterFrame);
    }
    this.focusCenterFrame = window.requestAnimationFrame(() => {
      this.focusCenterFrame = 0;
      if (!this.editorEl || this.plugin.settings.layout.mode !== "focus") {
        return;
      }
      const range = this.getSelectionRange() || this.lastRange;
      if (!range) {
        return;
      }
      const fallback = getElementForNode(range.endContainer);
      this.applyFocusCenter(this.getFocusRangeRect(range, fallback));
    });
  }

  applyFocusCenter(targetRect) {
    if (!this.workAreaEl || !targetRect || !Number.isFinite(targetRect.top)) {
      return;
    }
    const viewport = this.workAreaEl.getBoundingClientRect();
    const targetCenterInContent = this.workAreaEl.scrollTop + targetRect.top - viewport.top + (targetRect.height / 2);
    const targetScrollTop = Math.max(0, targetCenterInContent - (this.workAreaEl.clientHeight / 2));
    if (Math.abs(this.workAreaEl.scrollTop - targetScrollTop) > 1) {
      this.workAreaEl.scrollTop = targetScrollTop;
    }
  }

  revealCurrentCaretPage() {
    if (!this.workAreaEl || !this.editorEl) {
      return;
    }
    const range = this.getSelectionRange() || this.lastRange;
    if (!range) {
      return;
    }
    const rangeElement = getElementForNode(range.commonAncestorContainer || range.startContainer);
    const page = rangeElement && rangeElement.closest(".noveler-page");
    if (!page || !this.editorEl.contains(page)) {
      return;
    }
    const pageRect = page.getBoundingClientRect();
    const viewport = this.workAreaEl.getBoundingClientRect();
    const verticalDelta = pageRect.top + (pageRect.height / 2) - (viewport.top + viewport.height / 2);
    const horizontalDelta = pageRect.left + (pageRect.width / 2) - (viewport.left + viewport.width / 2);
    if (Math.abs(verticalDelta) > 1) {
      this.workAreaEl.scrollTop += verticalDelta;
    }
    if (Math.abs(horizontalDelta) > 1) {
      this.workAreaEl.scrollLeft += horizontalDelta;
    }
  }

  applySettings() {
    if (!this.editorFrameEl || !this.editorEl) {
      return;
    }

    const settings = this.plugin.settings;
    const typography = settings.typography;
    const computedFontSize = typography.fontSize * (typography.fontScale / 100);
    if (!PAGE_SIZE_PRESETS[settings.layout.pageSize]) {
      settings.layout.pageSize = "custom";
    }
    const pageZoom = this.getPageZoom();
    const pageHeight = Number(settings.layout.pageHeight) || DEFAULT_SETTINGS.layout.pageHeight;
    const marginTop = Number(settings.layout.marginTop) || DEFAULT_SETTINGS.layout.marginTop;
    const marginBottom = Number(settings.layout.marginBottom) || DEFAULT_SETTINGS.layout.marginBottom;
    const headerFooterFontSize = Math.max(6, Math.min(36, Number(settings.layout.headerFooterFontSize) || DEFAULT_SETTINGS.layout.headerFooterFontSize));

    const mode = settings.layout.mode === "focus" ? "focus" : "page";
    settings.layout.mode = mode;
    this.shellEl.dataset.mode = mode;
    this.shellEl.dataset.focusDim = settings.focus.dimUnfocusedLines ? "true" : "false";
    this.shellEl.dataset.focusScope = settings.focus.highlightScope === "paragraph" ? "paragraph" : "line";
    this.workAreaEl.dataset.mode = mode;
    this.workAreaEl.dataset.dropEnabled = settings.fileOpen.allowDropOpen ? "true" : "false";
    const focusZoom = mode === "focus" ? this.getPageZoom() : DEFAULT_SETTINGS.focus.defaultZoom / 100;
    this.shellEl.style.setProperty("--noveler-focus-zoom", String(focusZoom));
    this.shellEl.style.setProperty("--noveler-focus-content-width", "80%");
    this.shellEl.style.setProperty("--noveler-focus-padding-y", "50vh");
    this.documentEl.style.setProperty("--noveler-page-width", `${settings.layout.pageWidth}px`);
    this.documentEl.style.setProperty("--noveler-page-height", `${pageHeight}px`);
    this.documentEl.style.setProperty("--noveler-page-zoom", String(pageZoom));
    this.documentEl.style.setProperty("--noveler-scaled-page-width", `${settings.layout.pageWidth * pageZoom}px`);
    this.documentEl.style.setProperty("--noveler-scaled-page-height", `${pageHeight * pageZoom}px`);
    this.documentEl.style.setProperty("--noveler-margin-top", `${marginTop}px`);
    this.documentEl.style.setProperty("--noveler-margin-left", `${settings.layout.marginLeft}px`);
    this.documentEl.style.setProperty("--noveler-margin-right", `${settings.layout.marginRight}px`);
    this.documentEl.style.setProperty("--noveler-margin-bottom", `${marginBottom}px`);
    this.documentEl.style.setProperty("--noveler-header-footer-font-size", `${headerFooterFontSize}pt`);
    this.editorFrameEl.style.setProperty("--noveler-page-width", `${settings.layout.pageWidth}px`);
    this.editorFrameEl.style.setProperty("--noveler-page-height", `${pageHeight}px`);
    this.editorFrameEl.style.setProperty("--noveler-page-zoom", String(pageZoom));
    this.editorFrameEl.style.setProperty("--noveler-scaled-page-width", `${settings.layout.pageWidth * pageZoom}px`);
    this.editorFrameEl.style.setProperty("--noveler-scaled-page-height", `${pageHeight * pageZoom}px`);
    this.editorFrameEl.style.setProperty("--noveler-margin-top", `${marginTop}px`);
    this.editorFrameEl.style.setProperty("--noveler-margin-left", `${settings.layout.marginLeft}px`);
    this.editorFrameEl.style.setProperty("--noveler-margin-right", `${settings.layout.marginRight}px`);
    this.editorFrameEl.style.setProperty("--noveler-margin-bottom", `${marginBottom}px`);
    this.editorFrameEl.style.setProperty("--noveler-header-footer-font-size", `${headerFooterFontSize}pt`);
    const contentZoom = mode === "focus" ? focusZoom : 1;
    this.editorEl.style.setProperty("--noveler-paragraph-before", `${typography.paragraphBefore * contentZoom}px`);
    this.editorEl.style.setProperty("--noveler-paragraph-after", `${typography.paragraphAfter * contentZoom}px`);
    this.editorEl.style.setProperty("--noveler-first-line-indent", `${typography.firstLineIndent}em`);
    this.editorEl.style.setProperty("--noveler-hanging-indent", `${typography.hangingIndent}em`);
    this.editorEl.style.setProperty("--noveler-page-zoom", String(pageZoom));
    this.editorEl.style.setProperty("--noveler-header-footer-font-size", `${headerFooterFontSize}pt`);
    for (let level = 1; level <= 6; level += 1) {
      const heading = getHeadingStyle(settings, level);
      this.editorEl.style.setProperty(`--noveler-h${level}-font-family`, quoteFontFamily(heading.fontFamily));
      const headingSize = this.clampNumber(Number(heading.fontSize) || DEFAULT_SETTINGS.headingStyles[`h${level}`].fontSize, 6, 96);
      this.editorEl.style.setProperty(`--noveler-h${level}-font-size`, `${headingSize * contentZoom}pt`);
      this.editorEl.style.setProperty(`--noveler-h${level}-font-weight`, String(heading.fontWeight || DEFAULT_SETTINGS.headingStyles[`h${level}`].fontWeight));
      this.editorEl.style.setProperty(`--noveler-h${level}-font-style`, heading.italic ? "italic" : "normal");
      this.editorEl.style.setProperty(`--noveler-h${level}-text-align`, ["left", "center", "right", "justify"].includes(heading.alignment) ? heading.alignment : "left");
    }

    this.editorEl.style.fontFamily = resolveFontFamily(settings);
    this.editorEl.style.fontSize = `${computedFontSize * contentZoom}pt`;
    this.editorEl.style.fontWeight = typography.fontWeight;
    this.editorEl.style.fontStyle = typography.italic ? "italic" : "normal";
    this.editorEl.style.fontVariantCaps = typography.smallCaps ? "small-caps" : "normal";
    this.editorEl.style.fontKerning = typography.kerning ? "normal" : "none";
    this.editorEl.style.letterSpacing = `${typography.letterSpacing * contentZoom}px`;
    this.editorEl.style.lineHeight = String(typography.lineHeight);
    this.editorEl.style.textAlign = typography.alignment;
    this.editorEl.style.fontFeatureSettings = typography.stylisticSet ? `"${typography.stylisticSet}" 1` : "normal";
    this.updateRulers();
    this.updateActivePageRuler();
    if (mode === "focus") {
      this.enterFocusMode();
    } else {
      this.leaveFocusMode();
    }
    if (mode === "page") {
      this.schedulePagination();
      this.scheduleFitTopToolbar();
    } else {
      this.unwrapEditorPages(this.editorEl);
      this.mergeSplitBlocks(this.editorEl);
      for (const marker of this.editorEl.querySelectorAll(".noveler-mode-caret-marker")) {
        marker.remove();
      }
      const selectionState = this.pendingModeSelectionState || this.lastCaretSelectionState;
      this.pendingModeSelectionState = null;
      this.editorEl.style.removeProperty("--noveler-page-count");
      if (this.leftRulerEl) {
        this.leftRulerEl.style.removeProperty("--noveler-active-page-top");
      }
      this.updateEditorFrameHeight();
      this.scheduleFocusTransition(selectionState);
    }
  }

  updateRulers() {
    if (!this.topRulerEl || !this.leftRulerEl) {
      return;
    }

    const layout = this.plugin.settings.layout;
    const units = layout.rulerUnits === "metric" ? "metric" : "imperial";
    const zoom = this.getPageZoom();
    const stepPhysicalPx = units === "metric" ? 37.7952755906 : 96;
    const stepPx = stepPhysicalPx * zoom;
    const minorStepPx = stepPx / 4;
    const pageWidth = Number(layout.pageWidth) || DEFAULT_SETTINGS.layout.pageWidth;
    const pageHeight = Number(layout.pageHeight) || DEFAULT_SETTINGS.layout.pageHeight;
    const scaledPageWidth = pageWidth * zoom;
    const scaledPageHeight = pageHeight * zoom;
    const marginTop = Number(layout.marginTop) || DEFAULT_SETTINGS.layout.marginTop;
    const marginBottom = Number(layout.marginBottom) || DEFAULT_SETTINGS.layout.marginBottom;
    const marginLeft = Number(layout.marginLeft) || DEFAULT_SETTINGS.layout.marginLeft;
    const marginRight = Number(layout.marginRight) || DEFAULT_SETTINGS.layout.marginRight;

    this.workAreaEl.style.setProperty("--noveler-ruler-step", `${stepPx}px`);
    this.workAreaEl.style.setProperty("--noveler-ruler-minor-step", `${minorStepPx}px`);
    this.workAreaEl.style.setProperty("--noveler-page-width", `${pageWidth}px`);
    this.workAreaEl.style.setProperty("--noveler-page-height", `${pageHeight}px`);
    this.workAreaEl.style.setProperty("--noveler-scaled-page-width", `${scaledPageWidth}px`);
    this.workAreaEl.style.setProperty("--noveler-scaled-page-height", `${scaledPageHeight}px`);
    this.workAreaEl.style.setProperty("--noveler-margin-top", `${marginTop * zoom}px`);
    this.workAreaEl.style.setProperty("--noveler-margin-bottom", `${marginBottom * zoom}px`);
    this.documentEl.dataset.units = units;
    this.documentEl.style.setProperty("--noveler-ruler-step", `${stepPx}px`);
    this.documentEl.style.setProperty("--noveler-ruler-minor-step", `${minorStepPx}px`);
    this.documentEl.style.setProperty("--noveler-page-width", `${pageWidth}px`);
    this.documentEl.style.setProperty("--noveler-page-height", `${pageHeight}px`);
    this.documentEl.style.setProperty("--noveler-scaled-page-width", `${scaledPageWidth}px`);
    this.documentEl.style.setProperty("--noveler-scaled-page-height", `${scaledPageHeight}px`);
    this.documentEl.style.setProperty("--noveler-margin-left", `${marginLeft}px`);
    this.documentEl.style.setProperty("--noveler-margin-right", `${marginRight}px`);

    this.topRulerEl.empty();
    const corner = this.topRulerEl.createDiv({ cls: "noveler-ruler-corner" });
    corner.setText(units === "metric" ? "cm" : "in");
    const track = this.topRulerEl.createDiv({ cls: "noveler-horizontal-ruler-track" });
    track.style.width = `${scaledPageWidth}px`;
    track.style.setProperty("--noveler-margin-left", `${marginLeft * zoom}px`);
    track.style.setProperty("--noveler-margin-right", `${marginRight * zoom}px`);
    track.createDiv({ cls: "noveler-margin-zone noveler-margin-zone-left" });
    track.createDiv({ cls: "noveler-margin-zone noveler-margin-zone-right" });
    track.createDiv({ cls: "noveler-margin-handle noveler-left-margin-handle", attr: { title: `Left margin ${this.formatRulerDistance(marginLeft)}` } });
    track.createDiv({ cls: "noveler-margin-handle noveler-right-margin-handle", attr: { title: `Right margin ${this.formatRulerDistance(marginRight)}` } });

    for (let position = 0; position <= pageWidth + 1; position += stepPhysicalPx) {
      const tick = track.createDiv({ cls: "noveler-ruler-tick is-major" });
      tick.style.left = `${position * zoom}px`;
      tick.createSpan({ text: this.formatRulerNumber(position) });
    }

    this.leftRulerEl.empty();
    const verticalTrack = this.leftRulerEl.createDiv({ cls: "noveler-vertical-ruler-track" });
    verticalTrack.style.height = `${scaledPageHeight}px`;
    verticalTrack.style.setProperty("--noveler-margin-top", `${marginTop * zoom}px`);
    verticalTrack.style.setProperty("--noveler-margin-bottom", `${marginBottom * zoom}px`);
    verticalTrack.createDiv({ cls: "noveler-margin-zone noveler-margin-zone-top" });
    verticalTrack.createDiv({ cls: "noveler-margin-zone noveler-margin-zone-bottom" });
    verticalTrack.createDiv({ cls: "noveler-margin-handle noveler-top-margin-handle", attr: { title: `Top margin ${this.formatRulerDistance(marginTop)}` } });
    verticalTrack.createDiv({ cls: "noveler-margin-handle noveler-bottom-margin-handle", attr: { title: `Bottom margin ${this.formatRulerDistance(marginBottom)}` } });

    for (let position = 0; position <= pageHeight + 1; position += stepPhysicalPx) {
      const tick = verticalTrack.createDiv({ cls: "noveler-ruler-tick is-major noveler-ruler-tick-vertical" });
      tick.style.top = `${position * zoom}px`;
      tick.createSpan({ text: this.formatRulerNumber(position) });
    }
  }

  decorateSideRuler(rulerEl, label, value, length) {
    rulerEl.style.setProperty("--noveler-ruler-step", this.workAreaEl.style.getPropertyValue("--noveler-ruler-step"));
    rulerEl.style.setProperty("--noveler-ruler-minor-step", this.workAreaEl.style.getPropertyValue("--noveler-ruler-minor-step"));
    rulerEl.style.setProperty("--noveler-page-height", `${length || DEFAULT_SETTINGS.layout.pageHeight}px`);
    rulerEl.createDiv({ cls: "noveler-side-ruler-label", text: label });
    rulerEl.createDiv({ cls: "noveler-side-ruler-value", text: this.formatRulerDistance(value) });
  }

  openRulerContextMenu(event) {
    event.preventDefault();
    const menu = new Menu();
    menu.addItem((item) => item
      .setTitle("Imperial (inches)")
      .setChecked(this.plugin.settings.layout.rulerUnits !== "metric")
      .onClick(async () => {
        this.plugin.settings.layout.rulerUnits = "imperial";
        this.persistGlobalLayoutSetting("rulerUnits");
        this.applySettings();
      }));
    menu.addItem((item) => item
      .setTitle("Metric (centimeters)")
      .setChecked(this.plugin.settings.layout.rulerUnits === "metric")
      .onClick(async () => {
        this.plugin.settings.layout.rulerUnits = "metric";
        this.persistGlobalLayoutSetting("rulerUnits");
        this.applySettings();
      }));
    menu.showAtMouseEvent(event);
  }

  formatRulerNumber(px) {
    const units = this.plugin.settings.layout.rulerUnits === "metric" ? "metric" : "imperial";
    const value = units === "metric" ? px / 37.7952755906 : px / 96;
    return String(Math.round(value));
  }

  formatRulerDistance(px) {
    const units = this.plugin.settings.layout.rulerUnits === "metric" ? "metric" : "imperial";
    const value = units === "metric" ? px / 37.7952755906 : px / 96;
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${units === "metric" ? "cm" : "in"}`;
  }

  setLayoutMode(mode) {
    const nextMode = mode === "focus" ? "focus" : "page";
    const previousMode = this.plugin.settings.layout.mode === "focus" ? "focus" : "page";
    if (nextMode === previousMode) {
      return;
    }
    const liveSelectionState = this.captureEditorSelectionState();
    this.pendingModeSelectionState = liveSelectionState
      ? { ...liveSelectionState }
      : (this.lastCaretSelectionState ? { ...this.lastCaretSelectionState } : null);
    this.revealCaretAfterPagination = nextMode === "page";
    this.plugin.settings.layout.mode = nextMode;
    this.persistGlobalLayoutSetting("mode");
    this.applySettings();
    this.buildStatusControls();
  }

  setPageSizePreset(pageSize) {
    const preset = PAGE_SIZE_PRESETS[pageSize];
    if (!preset) {
      return;
    }
    this.plugin.settings.layout.pageSize = pageSize;
    this.plugin.settings.layout.pageWidth = cmToPx(preset.widthCm);
    this.plugin.settings.layout.pageHeight = cmToPx(preset.heightCm);
    this.persistGlobalLayoutSetting(["pageSize", "pageWidth", "pageHeight"]);
    this.applySettings();
    this.buildStatusControls();
  }

  setPageZoom(value) {
    if (this.plugin.settings.layout.mode === "focus") {
      this.plugin.settings.focus.defaultZoom = this.clampNumber(Number(value) || DEFAULT_SETTINGS.focus.defaultZoom, 50, 250);
      this.persistFocusSetting("defaultZoom");
    } else {
      this.plugin.settings.layout.pageZoom = this.clampNumber(Number(value) || DEFAULT_SETTINGS.layout.pageZoom, 50, 250);
      this.persistGlobalLayoutSetting("pageZoom");
    }
    this.applySettings();
    this.buildStatusControls();
  }

  toggleLayoutMode() {
    this.setLayoutMode(this.plugin.settings.layout.mode === "page" ? "focus" : "page");
  }

  setFontPreset(preset) {
    this.plugin.settings.typography.fontPreset = preset;
    this.persistToolbarSettings();
    this.applySettings();
    this.buildTopToolbar();
  }

  setFontWeight(weight) {
    this.plugin.settings.typography.fontWeight = weight;
    this.persistToolbarSettings();
    this.applySettings();
    this.buildTopToolbar();
  }

  toggleTypographyFlag(key) {
    this.plugin.settings.typography[key] = !this.plugin.settings.typography[key];
    this.persistToolbarSettings();
    this.applySettings();
    this.buildTopToolbar();
  }

  adjustTypographyNumber(key, delta, min, max) {
    const typography = this.plugin.settings.typography;
    typography[key] = this.clampNumber((Number(typography[key]) || 0) + delta, min, max);
    this.persistToolbarSettings();
    this.applySettings();
    this.buildTopToolbar();
  }

  setLineSpacing(preset, value) {
    this.plugin.settings.typography.lineSpacingPreset = preset;
    this.plugin.settings.typography.lineHeight = value;
    this.persistToolbarSettings();
    this.applySettings();
    this.buildTopToolbar();
  }

  adjustLineHeight(delta) {
    const typography = this.plugin.settings.typography;
    typography.lineSpacingPreset = "custom";
    typography.lineHeight = this.clampNumber((Number(typography.lineHeight) || 1.5) + delta, 1, 3);
    this.persistToolbarSettings();
    this.applySettings();
    this.buildTopToolbar();
  }

  adjustLayoutNumber(key, delta, min, max) {
    if (key === "pageZoom" && this.plugin.settings.layout.mode === "focus") {
      this.setPageZoom((Number(this.plugin.settings.focus.defaultZoom) || DEFAULT_SETTINGS.focus.defaultZoom) + delta);
      return;
    }
    const layout = this.plugin.settings.layout;
    layout[key] = this.clampNumber((Number(layout[key]) || 0) + delta, min, max);
    if (key === "pageWidth" || key === "pageHeight") {
      layout.pageSize = "custom";
    }
    this.persistGlobalLayoutSetting(key === "pageWidth" || key === "pageHeight" ? [key, "pageSize"] : key);
    this.applySettings();
    this.buildStatusControls();
  }

  toggleAutomationFlag(key) {
    this.plugin.settings.automation[key] = !this.plugin.settings.automation[key];
    this.plugin.saveSettings();
    this.buildTopToolbar();
  }

  clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
  }

  format(action) {
    this.focusForCommand();
    const commandMap = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      strikethrough: "strikeThrough",
      superscript: "superscript",
      subscript: "subscript",
      insertUnorderedList: "insertUnorderedList",
      insertOrderedList: "insertOrderedList"
    };
    const command = commandMap[action] || action;
    document.execCommand(command, false, null);
    this.captureSelection();
    this.scheduleSave();
    this.updateWordCount();
  }

  applyTextColor(value) {
    const color = normalizeHexColor(value);
    this.plugin.settings.typography.textColor = color;
    this.focusForCommand();
    document.execCommand("foreColor", false, color);
    this.persistToolbarSettings({ silent: true });
    this.captureSelection();
    this.scheduleSave();
    this.updateWordCount();
    this.setColorControlValue(color);
  }

  applyHeading(level) {
    this.focusForCommand();
    document.execCommand("formatBlock", false, `h${level}`);
    const block = this.getCurrentBlock();
    if (block) {
      block.removeClasses(STYLE_CLASSES);
    }
    this.captureSelection();
    this.scheduleSave();
  }

  applyParagraphStyle(style) {
    this.focusForCommand();
    if (style === "blockquote") {
      document.execCommand("formatBlock", false, "blockquote");
      const blockquote = this.getCurrentBlock();
      if (blockquote) {
        blockquote.addClass("noveler-style-blockquote");
      }
      this.scheduleSave();
      return;
    }

    document.execCommand("formatBlock", false, "p");
    const block = this.getCurrentBlock();
    if (!block) {
      this.scheduleSave();
      return;
    }

    block.removeClasses(STYLE_CLASSES);
    if (style === "dialogue") {
      block.addClass("noveler-style-dialogue");
    } else {
      block.addClass("noveler-style-normal");
    }
    this.captureSelection();
    this.scheduleSave();
  }

  applyAlignment(alignment) {
    this.focusForCommand();
    const command = alignment === "justify" ? "justifyFull" : `justify${alignment.charAt(0).toUpperCase()}${alignment.slice(1)}`;
    document.execCommand(command, false, null);
    this.plugin.settings.typography.alignment = alignment;
    this.persistToolbarSettings();
    this.applySettings();
    this.scheduleSave();
  }

  insertSceneBreak(glyph, centered) {
    this.focusForCommand();
    const cls = centered === false ? "noveler-scene-break" : "noveler-scene-break is-centered";
    document.execCommand("insertHTML", false, `<div class="${cls}">${escapeHtml(glyph || "***")}</div><p><br></p>`);
    this.scheduleSave();
    this.updateWordCount();
  }

  insertHorizontalRule() {
    this.focusForCommand();
    document.execCommand("insertHTML", false, "<hr><p><br></p>");
    this.scheduleSave();
  }

  insertChecklist() {
    this.focusForCommand();
    document.execCommand("insertHTML", false, '<ul class="noveler-checklist"><li data-checked="false"><span class="noveler-checkbox" contenteditable="false">☐</span> </li></ul><p><br></p>');
    this.scheduleSave();
    this.updateWordCount();
  }

  onEditorDragEnter(event) {
    if (!this.plugin.settings.fileOpen.allowDropOpen) {
      return;
    }
    event.preventDefault();
    this.workAreaEl.addClass("is-dragging-file");
  }

  onEditorDragOver(event) {
    if (!this.plugin.settings.fileOpen.allowDropOpen) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    this.workAreaEl.addClass("is-dragging-file");
  }

  onEditorDragLeave(event) {
    if (event.relatedTarget instanceof Node && this.workAreaEl.contains(event.relatedTarget)) {
      return;
    }
    this.workAreaEl.removeClass("is-dragging-file");
  }

  async onEditorDrop(event) {
    if (!this.plugin.settings.fileOpen.allowDropOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.workAreaEl.removeClass("is-dragging-file");

    const files = Array.from(event.dataTransfer ? event.dataTransfer.files || [] : []);
    if (files.length) {
      const vaultPath = this.getVaultPathFromDroppedFile(files[0]);
      if (vaultPath) {
        await this.openVaultFile(vaultPath);
        return;
      }
      await this.openDroppedBrowserFile(files[0]);
      return;
    }

    const vaultPath = this.extractDroppedVaultPath(event.dataTransfer);
    if (vaultPath) {
      await this.openVaultFile(vaultPath);
      return;
    }

    new Notice("Drop a Markdown, text, or HTML file to open it in Noveler.");
  }

  extractDroppedVaultPath(dataTransfer) {
    if (!dataTransfer) {
      return "";
    }

    const candidates = this.getDroppedPathCandidates(dataTransfer);

    const basePath = this.getVaultBasePath();
    for (const rawCandidate of candidates) {
      const candidate = this.cleanDroppedPath(rawCandidate);
      if (!candidate || candidate.startsWith("#")) {
        continue;
      }

      const vaultRelative = this.absoluteToVaultPath(candidate, basePath) || normalizeVaultPath(candidate);
      if (this.plugin.app.vault.getAbstractFileByPath(vaultRelative) instanceof TFile) {
        return vaultRelative;
      }
    }

    return "";
  }

  getDroppedPathCandidates(dataTransfer) {
    const candidates = [];
    const preferredTypes = [
      "text/scene-path",
      "text/path",
      "application/x-obsidian-file",
      "application/x-obsidian-drag-data",
      "text/plain",
      "text/uri-list",
      "text/html"
    ];
    const allTypes = Array.from(dataTransfer.types || []);
    const types = Array.from(new Set([...preferredTypes, ...allTypes]));

    for (const type of types) {
      try {
        const value = dataTransfer.getData(type);
        if (value) {
          candidates.push(...this.extractCandidateStrings(value));
        }
      } catch (error) {
        // Some custom drag payloads throw when read outside their owner.
      }
    }

    return Array.from(new Set(candidates.map((candidate) => String(candidate || "").trim()).filter(Boolean)));
  }

  extractCandidateStrings(value) {
    const text = String(value || "");
    const candidates = [];
    const add = (candidate) => {
      const cleaned = String(candidate || "").trim();
      if (cleaned) {
        candidates.push(cleaned);
      }
    };

    for (const line of text.split(/\r?\n/)) {
      add(line);
    }

    try {
      this.collectJsonStrings(JSON.parse(text), candidates);
    } catch (error) {
      // Non-JSON drag payloads are expected.
    }

    const attrPattern = /\b(?:data-path|data-file-path|data-scene-path|data-href|href)=["']([^"']+)["']/gi;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(text)) !== null) {
      add(attrMatch[1]);
    }

    const markdownLinkPattern = /\]\(([^)]+\.m(?:d|arkdown)(?:#[^)]+)?)\)/gi;
    let markdownMatch;
    while ((markdownMatch = markdownLinkPattern.exec(text)) !== null) {
      add(markdownMatch[1]);
    }

    const wikiLinkPattern = /\[\[([^\]]+\.m(?:d|arkdown)(?:#[^\]]+)?)\]\]/gi;
    let wikiMatch;
    while ((wikiMatch = wikiLinkPattern.exec(text)) !== null) {
      add(wikiMatch[1]);
    }

    const pathPattern = /(?:file:\/\/\/|obsidian:\/\/open\?[^\s"'<>]+|(?:[A-Za-z]:)?[^"'<>|\r\n]+?\.m(?:d|arkdown))(?:#[^\s"'<>]*)?/gi;
    let pathMatch;
    while ((pathMatch = pathPattern.exec(text)) !== null) {
      add(pathMatch[0]);
    }

    return candidates;
  }

  collectJsonStrings(value, output) {
    if (typeof value === "string") {
      output.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        this.collectJsonStrings(item, output);
      }
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (/path|file|href|link|scene/i.test(key)) {
        this.collectJsonStrings(child, output);
      } else if (child && typeof child === "object") {
        this.collectJsonStrings(child, output);
      }
    }
  }

  getVaultBasePath() {
    const adapter = this.plugin.app.vault.adapter;
    if (adapter && typeof adapter.getBasePath === "function") {
      return normalizeVaultPath(adapter.getBasePath());
    }
    return "";
  }

  getVaultPathFromDroppedFile(file) {
    if (!file) {
      return "";
    }

    const basePath = this.getVaultBasePath();
    const candidates = [
      file.path,
      file.webkitRelativePath,
      file.name
    ];

    for (const rawCandidate of candidates) {
      const candidate = this.cleanDroppedPath(rawCandidate);
      const vaultRelative = this.absoluteToVaultPath(candidate, basePath) || normalizeVaultPath(candidate);
      if (vaultRelative && this.plugin.app.vault.getAbstractFileByPath(vaultRelative) instanceof TFile) {
        return vaultRelative;
      }
    }
    return "";
  }

  cleanDroppedPath(path) {
    let cleaned = String(path || "").trim();
    cleaned = cleaned.replace(/^<|>$/g, "");
    const wiki = cleaned.match(/^\[\[([^\]]+)\]\]$/);
    if (wiki) {
      cleaned = wiki[1];
    }

    if (cleaned.startsWith("obsidian://")) {
      try {
        const url = new URL(cleaned);
        cleaned = url.searchParams.get("file") || url.searchParams.get("path") || cleaned;
      } catch (error) {
        const match = cleaned.match(/[?&](?:file|path)=([^&]+)/);
        cleaned = match ? decodeURIComponent(match[1]) : cleaned;
      }
    }

    if (cleaned.startsWith("file://")) {
      cleaned = safeDecodeUriComponent(cleaned.replace(/^file:\/+/, ""));
      if (/^[A-Za-z]\//.test(cleaned)) {
        cleaned = `${cleaned.charAt(0)}:/${cleaned.slice(2)}`;
      }
    }
    cleaned = cleaned.replace(/[?#].*$/, "");
    return normalizeVaultPath(safeDecodeUriComponent(cleaned));
  }

  absoluteToVaultPath(path, basePath) {
    if (!basePath) {
      return "";
    }
    const normalizedPath = normalizeVaultPath(path).toLowerCase();
    const normalizedBase = normalizeVaultPath(basePath).toLowerCase();
    if (!normalizedPath.startsWith(`${normalizedBase}/`)) {
      return "";
    }
    return normalizeVaultPath(path).slice(normalizedBase.length + 1);
  }

  onEditorClick(event) {
    const target = event.target;
    if (!target || !target.closest) {
      return;
    }
    const checkbox = target.closest(".noveler-checkbox");
    if (!checkbox) {
      return;
    }
    const listItem = checkbox.closest("li");
    const checked = listItem && listItem.getAttribute("data-checked") === "true";
    if (listItem) {
      listItem.setAttribute("data-checked", checked ? "false" : "true");
    }
    checkbox.setText(checked ? "☐" : "☑");
    this.scheduleSave();
  }

  onKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      this.saveDocument();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      this.insertText("    ");
      return;
    }

    if (event.key === "Enter" && this.plugin.settings.automation.smartIndent) {
      const snapshot = this.getCurrentStyleSnapshot();
      window.setTimeout(() => this.applyStyleSnapshot(snapshot), 0);
    }
  }

  onBeforeInput(event) {
    if (event.inputType !== "insertText" || !event.data) {
      return;
    }

    const automation = this.plugin.settings.automation;
    const data = event.data;

    if (automation.smartQuotes && (data === '"' || data === "'")) {
      event.preventDefault();
      this.insertText(this.getSmartQuote(data));
      return;
    }

    if (automation.smartDashes && data === "-" && this.getTextBeforeCursor(1) === "-") {
      event.preventDefault();
      if (this.deletePreviousCharacter()) {
        this.insertText("—");
      } else {
        this.insertText("-");
      }
      return;
    }

    if (automation.autoCapitalize && /^[a-z]$/.test(data) && this.shouldCapitalizeAtCursor()) {
      event.preventDefault();
      this.insertText(data.toUpperCase());
    }
  }

  onEditorPaste(event) {
    const clipboard = event.clipboardData;
    if (!clipboard) {
      return;
    }
    const html = clipboard.getData("text/html");
    if (!html) {
      return;
    }
    event.preventDefault();
    const safeHtml = sanitizeEditorHtml(html);
    if (safeHtml) {
      this.focusForCommand();
      document.execCommand("insertHTML", false, safeHtml);
      this.captureSelection();
      this.schedulePagination();
      this.scheduleSave();
      this.updateWordCount();
    }
  }

  getSmartQuote(quote) {
    const before = this.getTextBeforeCursor(1);
    if (quote === "'") {
      return before && /[A-Za-z0-9]$/.test(before) ? "’" : "‘";
    }
    return !before || /[\s([{<\-–—]$/.test(before) ? "“" : "”";
  }

  shouldCapitalizeAtCursor() {
    const before = this.getTextBeforeCursor(100);
    if (!before.trim()) {
      return true;
    }
    return /[.!?]["')\]]?\s+$/.test(before);
  }

  insertText(text) {
    this.focusForCommand();
    document.execCommand("insertText", false, text);
    this.captureSelection();
    this.scheduleSave();
    this.updateWordCount();
  }

  deletePreviousCharacter() {
    const range = this.getSelectionRange();
    if (!range || !range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE || range.startOffset <= 0) {
      return false;
    }

    const textNode = range.startContainer;
    const offset = range.startOffset;
    textNode.deleteData(offset - 1, 1);
    range.setStart(textNode, offset - 1);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    this.captureSelection();
    return true;
  }

  getTextBeforeCursor(maxLength) {
    const range = this.getSelectionRange();
    if (!range) {
      return "";
    }
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(this.editorEl);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    return beforeRange.toString().slice(-maxLength);
  }

  getCurrentStyleSnapshot() {
    const block = this.getCurrentBlock();
    if (!block) {
      return null;
    }
    return {
      tagName: block.tagName.toLowerCase(),
      classes: STYLE_CLASSES.filter((cls) => block.hasClass(cls))
    };
  }

  applyStyleSnapshot(snapshot) {
    if (!snapshot || !snapshot.classes.length) {
      return;
    }
    const block = this.getCurrentBlock();
    if (!block || block.tagName.toLowerCase() !== "p") {
      return;
    }
    block.removeClasses(STYLE_CLASSES);
    for (const cls of snapshot.classes) {
      block.addClass(cls);
    }
  }

  focusForCommand() {
    this.editorEl.focus();
    this.restoreSelection();
  }

  createAntidoteDocument(options = {}) {
    const view = this;
    const checkWholeDocument = !!options.checkWholeDocument;
    return {
      getTitle: () => view.currentDocumentTitle || view.getDisplayText(),
      getPath: () => view.currentDocumentPath || "",
      getType: () => {
        const path = String(view.currentDocumentPath || "").toLowerCase();
        if (path.endsWith(".tex")) return "latex";
        if (path.endsWith(".srt")) return "subrip";
        if (path.endsWith(".txt") || path.endsWith(".text")) return "texte";
        return "markdown";
      },
      getLineBreak: () => "\n",
      getZones: () => view.getAntidoteZones(checkWholeDocument),
      canReplace: (start, end, context) => view.canReplaceAntidoteRange(start, end, context),
      replaceRange: (start, end, text) => view.replaceAntidoteRange(start, end, text),
      selectRange: (start, end) => view.selectAntidoteRange(start, end),
      isAvailable: () => !!(view.editorEl && document.body.contains(view.editorEl)),
      focus: () => view.focusAntidoteDocument()
    };
  }

  getAntidoteZones(checkWholeDocument) {
    const snapshot = this.createAntidoteTextSnapshot();
    const selection = this.getAntidoteSelectionOffsets(snapshot);
    if (checkWholeDocument && selection.start === selection.end) {
      return [{ text: snapshot.text, selectionStart: 0, selectionEnd: 0, id: "0" }];
    }
    return [{
      text: snapshot.text,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      id: "0"
    }];
  }

  createAntidoteTextSnapshot() {
    const snapshot = {
      text: "",
      positions: []
    };
    const contentNodes = this.getAntidoteContentNodes();

    const appendText = (node, text) => {
      const value = String(text || "");
      for (let index = 0; index < value.length; index += 1) {
        snapshot.text += value[index];
        snapshot.positions.push({ node, offset: index });
      }
    };

    const appendGenerated = (text) => {
      const value = String(text || "");
      for (let index = 0; index < value.length; index += 1) {
        snapshot.text += value[index];
        snapshot.positions.push(null);
      }
    };

    const appendBlockBreak = () => {
      if (snapshot.text && !snapshot.text.endsWith("\n")) {
        appendGenerated("\n");
      }
    };

    const serializeNode = (node) => {
      if (!node) {
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node, node.nodeValue || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || node.hasClass("noveler-pagination-marker")) {
        return;
      }
      if (node.tagName && node.tagName.toLowerCase() === "br") {
        appendGenerated("\n");
        return;
      }
      for (const child of Array.from(node.childNodes)) {
        serializeNode(child);
      }
    };

    for (let index = 0; index < contentNodes.length; index += 1) {
      const node = contentNodes[index];
      if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("data-noveler-split-id")) {
        const splitId = node.getAttribute("data-noveler-split-id");
        serializeNode(node);
        while (
          index + 1 < contentNodes.length
          && contentNodes[index + 1].nodeType === Node.ELEMENT_NODE
          && contentNodes[index + 1].getAttribute("data-noveler-split-id") === splitId
        ) {
          index += 1;
          appendGenerated(" ");
          serializeNode(contentNodes[index]);
        }
        appendBlockBreak();
        continue;
      }
      serializeNode(node);
      if (this.isAntidoteBlockNode(node)) {
        appendBlockBreak();
      }
    }

    while (snapshot.text.endsWith("\n")) {
      snapshot.text = snapshot.text.slice(0, -1);
      snapshot.positions.pop();
    }
    return snapshot;
  }

  getAntidoteContentNodes() {
    const nodes = [];
    if (!this.editorEl) {
      return nodes;
    }
    for (const child of Array.from(this.editorEl.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-page")) {
        nodes.push(...this.getPageContentNodes(child));
      } else if (!(child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-pagination-marker"))) {
        nodes.push(child);
      }
    }
    return nodes;
  }

  isAntidoteBlockNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE || !node.tagName) {
      return false;
    }
    return ["p", "div", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "li"].includes(node.tagName.toLowerCase());
  }

  getAntidoteSelectionOffsets(snapshot) {
    const range = this.getSelectionRange() || this.lastRange;
    if (!range) {
      return { start: 0, end: 0 };
    }
    const start = this.getAntidoteOffsetForBoundary(snapshot, range.startContainer, range.startOffset);
    const end = this.getAntidoteOffsetForBoundary(snapshot, range.endContainer, range.endOffset);
    return {
      start: Math.max(0, Math.min(snapshot.text.length, start)),
      end: Math.max(0, Math.min(snapshot.text.length, end))
    };
  }

  getAntidoteOffsetForBoundary(snapshot, container, offset) {
    if (container && container.nodeType === Node.TEXT_NODE) {
      let lastMatch = null;
      for (let index = 0; index < snapshot.positions.length; index += 1) {
        const position = snapshot.positions[index];
        if (!position || position.node !== container) {
          continue;
        }
        if (position.offset >= offset) {
          return index;
        }
        lastMatch = index;
      }
      if (lastMatch !== null) {
        return lastMatch + 1;
      }
    }

    try {
      const range = document.createRange();
      range.selectNodeContents(this.editorEl);
      range.setEnd(container, offset);
      return Math.max(0, Math.min(snapshot.text.length, range.toString().replace(/\r\n?/g, "\n").length));
    } catch (error) {
      return 0;
    }
  }

  canReplaceAntidoteRange(start, end, context) {
    if (!this.editorEl) {
      return false;
    }
    const snapshot = this.createAntidoteTextSnapshot();
    const safeStart = Math.max(0, Math.min(snapshot.text.length, Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.min(snapshot.text.length, Number(end) || safeStart));
    const expected = String(context || "");
    if (!expected) {
      return true;
    }
    const actual = snapshot.text.slice(safeStart, safeEnd);
    return actual === expected || snapshot.text.slice(safeStart, safeEnd + 1).startsWith(expected);
  }

  replaceAntidoteRange(start, end, text) {
    const snapshot = this.createAntidoteTextSnapshot();
    const safeStart = Math.max(0, Math.min(snapshot.text.length, Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.min(snapshot.text.length, Number(end) || safeStart));
    const startPosition = this.getAntidoteDomPosition(snapshot, safeStart, "forward");
    const endPosition = this.getAntidoteDomPosition(snapshot, safeEnd, "backward");
    if (!startPosition || !endPosition) {
      return Promise.resolve(false);
    }

    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    range.deleteContents();
    const replacement = document.createTextNode(String(text || ""));
    range.insertNode(replacement);
    range.setStartAfter(replacement);
    range.collapse(true);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.captureSelection();
    this.schedulePagination();
    this.scheduleSave();
    this.updateWordCount();
    this.updateStatus("Unsaved changes");
    return Promise.resolve(true);
  }

  selectAntidoteRange(start, end) {
    const snapshot = this.createAntidoteTextSnapshot();
    const safeStart = Math.max(0, Math.min(snapshot.text.length, Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.min(snapshot.text.length, Number(end) || safeStart));
    const startPosition = this.getAntidoteDomPosition(snapshot, safeStart, "forward");
    const endPosition = this.getAntidoteDomPosition(snapshot, safeEnd, "backward");
    if (!startPosition || !endPosition) {
      return;
    }
    this.focusAntidoteDocument();
    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.captureSelection();
    this.updateFloatingToolbar();
    this.keepAntidoteSelectionInView(range);
  }

  keepAntidoteSelectionInView(range) {
    if (
      !range
      || !this.workAreaEl
      || !(this.plugin.settings.integrations && this.plugin.settings.integrations.antidoteKeepFocus)
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      const rect = this.getAntidoteSelectionRect(range);
      if (!rect) {
        return;
      }
      const containerRect = this.workAreaEl.getBoundingClientRect();
      const verticalPadding = Math.min(160, Math.max(72, containerRect.height * 0.22));
      const horizontalPadding = Math.min(120, Math.max(48, containerRect.width * 0.12));
      let topDelta = 0;
      let leftDelta = 0;

      if (rect.top < containerRect.top + verticalPadding) {
        topDelta = rect.top - containerRect.top - verticalPadding;
      } else if (rect.bottom > containerRect.bottom - verticalPadding) {
        topDelta = rect.bottom - containerRect.bottom + verticalPadding;
      }

      if (rect.left < containerRect.left + horizontalPadding) {
        leftDelta = rect.left - containerRect.left - horizontalPadding;
      } else if (rect.right > containerRect.right - horizontalPadding) {
        leftDelta = rect.right - containerRect.right + horizontalPadding;
      }

      if (topDelta || leftDelta) {
        this.workAreaEl.scrollTo({
          top: Math.max(0, this.workAreaEl.scrollTop + topDelta),
          left: Math.max(0, this.workAreaEl.scrollLeft + leftDelta),
          behavior: "smooth"
        });
      }
    });
  }

  getAntidoteSelectionRect(range) {
    const rects = Array.from(range.getClientRects ? range.getClientRects() : []);
    const visibleRect = rects.find((rect) => rect.width > 0 || rect.height > 0);
    if (visibleRect) {
      return visibleRect;
    }
    const rect = range.getBoundingClientRect ? range.getBoundingClientRect() : null;
    if (rect && (rect.width > 0 || rect.height > 0)) {
      return rect;
    }
    const position = this.getElementForAntidoteRange(range);
    return position ? position.getBoundingClientRect() : null;
  }

  getElementForAntidoteRange(range) {
    const element = getElementForNode(range.startContainer);
    if (!element || !this.editorEl || (element !== this.editorEl && !this.editorEl.contains(element))) {
      return null;
    }
    return element === this.editorEl ? this.editorEl : element;
  }

  getAntidoteDomPosition(snapshot, offset, bias) {
    const positions = snapshot.positions;
    if (!positions.length) {
      return { node: this.editorEl, offset: 0 };
    }
    if (offset < positions.length) {
      for (let index = offset; index < positions.length; index += 1) {
        const position = positions[index];
        if (position) {
          return { node: position.node, offset: position.offset };
        }
      }
    }
    if (bias === "backward" || offset >= positions.length) {
      for (let index = Math.min(offset - 1, positions.length - 1); index >= 0; index -= 1) {
        const position = positions[index];
        if (position) {
          return { node: position.node, offset: position.offset + 1 };
        }
      }
    }
    for (const position of positions) {
      if (position) {
        return { node: position.node, offset: position.offset };
      }
    }
    return { node: this.editorEl, offset: this.editorEl.childNodes.length };
  }

  focusAntidoteDocument() {
    if (this.leaf) {
      this.plugin.app.workspace.revealLeaf(this.leaf);
    }
    if (this.editorEl) {
      this.editorEl.focus();
      this.restoreSelection();
    }
  }

  captureSelection() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !this.editorEl) {
      return;
    }

    const range = selection.getRangeAt(0);
    const element = getElementForNode(range.commonAncestorContainer);
    if (element && (element === this.editorEl || this.editorEl.contains(element))) {
      this.lastRange = range.cloneRange();
      const state = this.captureEditorSelectionState(range);
      if (state) {
        this.lastCaretSelectionState = { ...state };
      }
      this.updateActivePageRuler(range);
      this.scheduleFocusUpdate(range);
    }
  }

  restoreSelection() {
    if (!this.lastRange) {
      return;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(this.lastRange);
  }

  getSelectionRange() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const element = getElementForNode(range.commonAncestorContainer);
    if (!element || (element !== this.editorEl && !this.editorEl.contains(element))) {
      return null;
    }
    return range;
  }

  getCurrentBlock() {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) {
      return null;
    }

    let element = getElementForNode(selection.anchorNode);
    while (element && element !== this.editorEl) {
      if (element.matches("p,h1,h2,h3,h4,h5,h6,li,blockquote,div")) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }

  updateActivePageRuler(range) {
    if (!this.leftRulerEl || !this.editorEl || this.plugin.settings.layout.mode !== "page") {
      return;
    }
    const activeRange = range || this.getSelectionRange() || this.lastRange;
    if (!activeRange) {
      return;
    }
    const element = getElementForNode(activeRange.commonAncestorContainer || activeRange.startContainer);
    if (!element || (element !== this.editorEl && !this.editorEl.contains(element))) {
      return;
    }
    const page = element.closest(".noveler-page");
    if (!page || !this.editorEl.contains(page)) {
      return;
    }
    const top = Math.max(0, (page.offsetTop || 0) * this.getPageZoom());
    this.leftRulerEl.style.setProperty("--noveler-active-page-top", `${top}px`);
  }

  updateFloatingToolbar() {
    if (!this.floatingToolbarEl || !this.editorEl) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      this.floatingToolbarEl.removeClass("is-visible");
      return;
    }

    const range = selection.getRangeAt(0);
    const element = getElementForNode(range.commonAncestorContainer);
    if (!element || (element !== this.editorEl && !this.editorEl.contains(element))) {
      this.floatingToolbarEl.removeClass("is-visible");
      return;
    }

    this.captureSelection();
    const rect = range.getBoundingClientRect();
    const toolbarRect = this.floatingToolbarEl.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - toolbarRect.width - 8, rect.left + rect.width / 2 - toolbarRect.width / 2));
    const top = Math.max(8, rect.top - toolbarRect.height - 8);
    this.floatingToolbarEl.style.left = `${left}px`;
    this.floatingToolbarEl.style.top = `${top}px`;
    this.floatingToolbarEl.addClass("is-visible");
  }

  openContextMenu(event) {
    event.preventDefault();
    this.captureSelection();
    const menu = new Menu();
    menu.addItem((item) => item.setTitle("Bold").setIcon("bold").onClick(() => this.format("bold")));
    menu.addItem((item) => item.setTitle("Italic").setIcon("italic").onClick(() => this.format("italic")));
    menu.addItem((item) => item.setTitle("Underline").setIcon("underline").onClick(() => this.format("underline")));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Heading 1").setIcon("heading-1").onClick(() => this.applyHeading(1)));
    menu.addItem((item) => item.setTitle("Dialogue paragraph").setIcon("message-square").onClick(() => this.applyParagraphStyle("dialogue")));
    menu.addItem((item) => item.setTitle("Block quote").setIcon("quote").onClick(() => this.applyParagraphStyle("blockquote")));
    menu.addItem((item) => item.setTitle("Scene break").setIcon("asterisk").onClick(() => this.insertSceneBreak(this.plugin.settings.sceneBreakGlyph, true)));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Remove double spaces").setIcon("space").onClick(() => this.cleanupDocument({ doubleSpaces: true })));
    menu.addItem((item) => item.setTitle("Normalize line breaks").setIcon("wrap-text").onClick(() => this.cleanupDocument({ lineBreaks: true })));
    menu.addItem((item) => item.setTitle("Smarten punctuation").setIcon("wand-sparkles").onClick(() => this.cleanupDocument({ punctuation: true })));
    menu.showAtMouseEvent(event);
  }

  cleanupDocument(options) {
    if (!this.editorEl) {
      return;
    }

    if (options.doubleSpaces) {
      this.cleanTextNodes(this.editorEl, (text) => text.replace(/[ \t]{2,}/g, " "));
    }
    if (options.punctuation) {
      this.cleanTextNodes(this.editorEl, (text) => this.smartenText(text));
    }
    if (options.lineBreaks) {
      this.editorEl.innerHTML = this.normalizeBreakHtml(this.editorEl.innerHTML);
    }
    this.scheduleSave();
    this.updateWordCount();
    this.updateStatus("Cleaned up");
  }

  cleanTextNodes(root, transform) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      node.nodeValue = transform(node.nodeValue || "");
    }
  }

  smartenText(text) {
    let result = "";
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const previous = result.slice(-1);
      if (char === '"') {
        result += !previous || /[\s([{<\-–—]$/.test(previous) ? "“" : "”";
      } else if (char === "'") {
        result += previous && /[A-Za-z0-9]$/.test(previous) ? "’" : "‘";
      } else {
        result += char;
      }
    }
    return result
      .replace(/---/g, "—")
      .replace(/--/g, "–")
      .replace(/(^|[.!?]\s+)([a-z])/g, (_match, lead, letter) => `${lead}${letter.toUpperCase()}`);
  }

  normalizeBreakHtml(html) {
    return html
      .replace(/(?:<p>(?:<br\s*\/?>|\s|&nbsp;)*<\/p>\s*){3,}/gi, "<p><br></p><p><br></p>")
      .replace(/(?:<div>(?:<br\s*\/?>|\s|&nbsp;)*<\/div>\s*){3,}/gi, "<div><br></div><div><br></div>");
  }

  async exportMarkdown() {
    await this.saveDocument({ silent: true });
    const path = normalizeVaultPath(this.plugin.settings.exportPath) || DEFAULT_SETTINGS.exportPath;
    const cloneEl = this.editorEl.cloneNode(true);
    this.unwrapEditorPages(cloneEl);
    this.mergeSplitBlocks(cloneEl);
    this.removeFocusVisualState(cloneEl);
    cloneEl.innerHTML = sanitizeEditorHtml(cloneEl.innerHTML);
    const markdown = this.htmlToMarkdown(cloneEl).trim() + "\n";

    try {
      await this.ensureParentFolder(path);
      const existing = this.plugin.app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile) {
        await this.plugin.app.vault.modify(existing, markdown);
      } else if (!existing) {
        await this.plugin.app.vault.create(path, markdown);
      } else {
        throw new Error(`${path} is not a file`);
      }
      new Notice(`Noveler exported ${path}.`);
      this.updateStatus(`Exported ${path}`);
    } catch (error) {
      console.error(error);
      new Notice(`Noveler could not export: ${error.message}`);
    }
  }

  htmlToMarkdown(root) {
    const chunks = [];
    for (const node of this.collectSerializableNodes(root)) {
      const markdown = this.nodeToMarkdown(node).trimEnd();
      if (markdown) {
        chunks.push(markdown);
      }
    }
    return chunks.join("\n\n").replace(/\n{3,}/g, "\n\n");
  }

  collectSerializableNodes(root) {
    const nodes = [];
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-page")) {
        nodes.push(...this.collectSerializableNodes(child));
      } else if (!(child.nodeType === Node.ELEMENT_NODE && child.hasClass("noveler-pagination-marker"))) {
        nodes.push(child);
      }
    }
    return nodes;
  }

  childrenToMarkdown(element) {
    return Array.from(element.childNodes).map((node) => this.nodeToMarkdown(node)).join("");
  }

  nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node;
    const tag = element.tagName.toLowerCase();
    if (element.hasClass("noveler-page") || element.hasClass("noveler-pagination-marker")) {
      return "";
    }
    const content = this.childrenToMarkdown(element).trim();

    if (/^h[1-6]$/.test(tag)) {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-"))) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return `${"#".repeat(Number(tag.charAt(1)))} ${content}`;
    }
    if (tag === "p") {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-") && name !== "noveler-style-normal")) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return content;
    }
    if (tag === "span" || tag === "font") {
      const color = this.getInlineTextColor(element);
      if (color) {
        return `<span style="color: ${escapeHtml(color)}">${content}</span>`;
      }
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-"))) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return content;
    }
    if (tag === "strong" || tag === "b") {
      return `**${content}**`;
    }
    if (tag === "em" || tag === "i") {
      return `*${content}*`;
    }
    if (tag === "s" || tag === "strike") {
      return `~~${content}~~`;
    }
    if (tag === "u") {
      return `<u>${content}</u>`;
    }
    if (tag === "sup" || tag === "sub") {
      return `<${tag}>${content}</${tag}>`;
    }
    if (tag === "a") {
      const href = element.getAttribute("href") || "";
      if (!isSafeEditorUrl(href)) return content;
      const title = element.getAttribute("title");
      return `[${content}](${href}${title ? ` "${title.replace(/"/g, "\\\"")}"` : ""})`;
    }
    if (tag === "img") {
      const src = element.getAttribute("src") || "";
      if (!isSafeEditorUrl(src, true)) return "";
      const alt = element.getAttribute("alt") || "";
      const title = element.getAttribute("title");
      return `![${alt}](${src}${title ? ` "${title.replace(/"/g, "\\\"")}"` : ""})`;
    }
    if (tag === "code" && element.parentElement && element.parentElement.tagName.toLowerCase() === "pre") {
      return element.textContent || "";
    }
    if (tag === "code") {
      const code = element.textContent || "";
      const fence = code.includes("`") ? "``" : "`";
      return `${fence}${code}${fence}`;
    }
    if (tag === "pre") {
      const codeElement = element.querySelector(":scope > code");
      const languageClass = codeElement ? Array.from(codeElement.classList).find((name) => name.startsWith("language-")) : "";
      const language = languageClass ? languageClass.slice("language-".length) : "";
      return `\`\`\`${language}\n${codeElement ? codeElement.textContent || "" : element.textContent || ""}\n\`\`\``;
    }
    if (tag === "blockquote") {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-"))) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return content.split("\n").map((line) => `> ${line}`).join("\n");
    }
    if (tag === "hr") {
      return "---";
    }
    if (tag === "br") {
      return "\n";
    }
    if (tag === "ul") {
      return this.listToMarkdown(element, 0);
    }
    if (tag === "ol") {
      return this.listToMarkdown(element, 0);
    }
    if (tag === "li") {
      return content;
    }
    if (element.hasClass("noveler-scene-break")) {
      if (element.hasClass("is-centered")) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return content || this.plugin.settings.sceneBreakGlyph;
    }
    if (tag === "div") {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-"))) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return content;
    }
    return content;
  }

  listToMarkdown(list, depth) {
    const ordered = list.tagName.toLowerCase() === "ol";
    const checklist = list.hasClass("noveler-checklist");
    const indent = "  ".repeat(depth);
    const lines = [];
    const items = Array.from(list.children).filter((child) => child.tagName && child.tagName.toLowerCase() === "li");
    items.forEach((item, index) => {
      const nestedLists = Array.from(item.children).filter((child) => ["ul", "ol"].includes(child.tagName.toLowerCase()));
      const content = Array.from(item.childNodes)
        .filter((child) => !(child.nodeType === Node.ELEMENT_NODE && (["ul", "ol"].includes(child.tagName.toLowerCase()) || child.hasClass("noveler-checkbox"))))
        .map((child) => this.nodeToMarkdown(child))
        .join("")
        .trim();
      const isTask = checklist && item.hasAttribute("data-checked");
      const checked = item.getAttribute("data-checked") === "true";
      const marker = isTask ? (checked ? "- [x]" : "- [ ]") : ordered ? `${index + 1}.` : "-";
      lines.push(`${indent}${marker} ${content}`.trimEnd());
      for (const nested of nestedLists) {
        lines.push(this.listToMarkdown(nested, depth + 1));
      }
    });
    return lines.join("\n");
  }

  getInlineTextColor(element) {
    const color = String(element.getAttribute("color") || element.style.color || "").trim();
    if (
      /^#[0-9a-f]{3,8}$/i.test(color)
      || /^rgba?\([^)]+\)$/i.test(color)
      || /^hsla?\([^)]+\)$/i.test(color)
      || /^[a-z]+$/i.test(color)
    ) {
      return color;
    }
    return "";
  }

  updateStatus(text) {
    if (this.statusTextEl) {
      this.statusTextEl.setText(text);
    }
  }

  updateWordCount() {
    if (!this.wordCountEl || !this.editorEl) {
      return;
    }
    const text = this.editorEl.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.replace(/\s/g, "").length;
    this.wordCountEl.setText(`${words} words · ${chars} chars`);
  }
}

class NovelerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    if (!this.draftSettings) {
      this.draftSettings = clone(this.plugin.settings);
      this.draftSettings.typography = clone(this.plugin.globalTypography || this.plugin.settings.typography);
    }
    const draft = this.draftSettings;
    if (!draft.headingStyles || typeof draft.headingStyles !== "object") {
      draft.headingStyles = clone(DEFAULT_SETTINGS.headingStyles);
    }
    if (!draft.focus || typeof draft.focus !== "object") {
      draft.focus = clone(DEFAULT_SETTINGS.focus);
    }
    if (!draft.storyLineBridge || typeof draft.storyLineBridge !== "object") {
      draft.storyLineBridge = clone(DEFAULT_SETTINGS.storyLineBridge);
    }
    const saveDraft = async () => {
      draft.typography = clone(this.plugin.globalTypography || draft.typography || DEFAULT_SETTINGS.typography);
      this.plugin.settings = mergeSettings(draft);
      this.plugin.globalTypography = clone(this.plugin.settings.typography);
      this.draftSettings = null;
      await this.plugin.saveSettings();
      new Notice(`Noveler settings saved to ${this.plugin.getSettingsFilePath()}.`);
      this.display();
    };

    containerEl.createEl("h2", { text: "Noveler" });
    if (this.plugin.isStoryLineBridgeEnabled()) {
      containerEl.createEl("p", {
        cls: "setting-item-description",
        text: "StoryLine bridge is enabled. Noveler will only open and save StoryLine scene files."
      });
    }

    new Setting(containerEl)
      .setName("Save changes")
      .setDesc(`Settings are applied after saving and written to ${this.plugin.getSettingsFilePath()}.`)
      .addButton((button) => button
        .setButtonText("Save settings")
        .setCta()
        .onClick(saveDraft));

    containerEl.createEl("h3", { text: "Page defaults" });

    new Setting(containerEl)
      .setName("Editor mode")
      .setDesc("Choose whether Noveler opens in fixed Page mode or immersive Focus mode.")
      .addDropdown((dropdown) => dropdown
        .addOption("page", "Page mode")
        .addOption("focus", "Focus mode")
        .setValue(draft.layout.mode === "focus" ? "focus" : "page")
        .onChange((value) => {
          draft.layout.mode = value === "focus" ? "focus" : "page";
        }));

    new Setting(containerEl)
      .setName("Ruler units")
      .setDesc("Choose how Noveler labels page and margin rulers.")
      .addDropdown((dropdown) => dropdown
        .addOption("imperial", "Imperial (inches)")
        .addOption("metric", "Metric (centimeters)")
        .setValue(draft.layout.rulerUnits)
        .onChange((value) => {
          draft.layout.rulerUnits = value === "metric" ? "metric" : "imperial";
          this.display();
        }));

    new Setting(containerEl)
      .setName("Page size")
      .setDesc("Choose the page preset used in page mode.")
      .addDropdown((dropdown) => {
        for (const [value, label] of getPagePresetOptions()) {
          dropdown.addOption(value, label);
        }
        dropdown
          .setValue(PAGE_SIZE_PRESETS[draft.layout.pageSize] ? draft.layout.pageSize : "custom")
          .onChange((value) => {
            const preset = PAGE_SIZE_PRESETS[value];
            if (!preset) {
              return;
            }
            draft.layout.pageSize = value;
            draft.layout.pageWidth = cmToPx(preset.widthCm);
            draft.layout.pageHeight = cmToPx(preset.heightCm);
          });
      });

    new Setting(containerEl)
      .setName("Page zoom")
      .setDesc("Default visual zoom used in page mode.")
      .addDropdown((dropdown) => {
        for (const [value, label] of getZoomOptions(draft.layout.pageZoom)) {
          dropdown.addOption(value, label);
        }
        dropdown
          .setValue(String(draft.layout.pageZoom || DEFAULT_SETTINGS.layout.pageZoom))
          .onChange((value) => {
            draft.layout.pageZoom = Number(value) || DEFAULT_SETTINGS.layout.pageZoom;
          });
      });

    new Setting(containerEl)
      .setName("Header/footer text size")
      .setDesc("Visual page header and footer size in points.")
      .addText((text) => {
        const update = (value) => {
          const size = Number(value);
          if (Number.isFinite(size)) {
            draft.layout.headerFooterFontSize = Math.max(6, Math.min(36, size));
          }
        };
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.layout.headerFooterFontSize))
          .setValue(String(draft.layout.headerFooterFontSize || DEFAULT_SETTINGS.layout.headerFooterFontSize))
          .onChange(update);
        text.inputEl.addEventListener("input", () => update(text.inputEl.value));
      });

    const unitLabel = draft.layout.rulerUnits === "metric" ? "cm" : "in";
    const addMarginSetting = (name, key) => {
      new Setting(containerEl)
        .setName(name)
        .setDesc(`Default ${name.toLowerCase()} in ${unitLabel}. Standard manuscript margins are 1 in / 2.54 cm.`)
        .addText((text) => {
          const update = (value) => {
            const px = unitValueToPx(value, draft.layout.rulerUnits);
            if (px > 0) {
              draft.layout[key] = px;
            }
          };
          text
            .setPlaceholder(unitLabel === "cm" ? "2.54" : "1")
            .setValue(String(pxToUnitValue(draft.layout[key], draft.layout.rulerUnits)))
            .onChange(update);
          text.inputEl.addEventListener("input", () => update(text.inputEl.value));
        });
    };

    addMarginSetting("Top margin", "marginTop");
    addMarginSetting("Right margin", "marginRight");
    addMarginSetting("Bottom margin", "marginBottom");
    addMarginSetting("Left margin", "marginLeft");

    containerEl.createEl("h3", { text: "Focus mode" });

    new Setting(containerEl)
      .setName("Default zoom")
      .setDesc("Visual zoom used whenever the editor is in Focus mode.")
      .addDropdown((dropdown) => {
        for (const [value, label] of getZoomOptions(draft.focus.defaultZoom)) {
          dropdown.addOption(value, label);
        }
        dropdown
          .setValue(String(draft.focus.defaultZoom || DEFAULT_SETTINGS.focus.defaultZoom))
          .onChange((value) => {
            draft.focus.defaultZoom = Number(value) || DEFAULT_SETTINGS.focus.defaultZoom;
          });
      });

    new Setting(containerEl)
      .setName("Typewriter mode")
      .setDesc("Keep the line containing the text cursor centered while writing and navigating.")
      .addToggle((toggle) => toggle
        .setValue(draft.focus.typewriter !== false)
        .onChange((value) => {
          draft.focus.typewriter = value;
        }));

    new Setting(containerEl)
      .setName("Focus scope")
      .setDesc("Choose whether the current visual line or its entire paragraph remains fully visible.")
      .addDropdown((dropdown) => dropdown
        .addOption("line", "Current line")
        .addOption("paragraph", "Current paragraph")
        .setValue(draft.focus.highlightScope === "paragraph" ? "paragraph" : "line")
        .onChange((value) => {
          draft.focus.highlightScope = value === "paragraph" ? "paragraph" : "line";
        }));

    new Setting(containerEl)
      .setName("Dim unfocused lines")
      .setDesc("Reduce opacity outside the current line or paragraph, according to the Focus scope setting.")
      .addToggle((toggle) => toggle
        .setValue(draft.focus.dimUnfocusedLines !== false)
        .onChange((value) => {
          draft.focus.dimUnfocusedLines = value;
        }));

    containerEl.createEl("h3", { text: "Heading styles" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Each row controls font, size, weight, style, and alignment for the matching manuscript heading."
    });
    for (let level = 1; level <= 6; level += 1) {
      this.addHeadingStyleSetting(containerEl, draft, level);
    }

    containerEl.createEl("h3", { text: "Editing" });

    new Setting(containerEl)
      .setName("Open dropped files")
      .setDesc("Allow Markdown, text, and HTML files dropped into the editor window to open in Noveler.")
      .addToggle((toggle) => toggle
        .setValue(draft.fileOpen.allowDropOpen)
        .onChange((value) => {
          draft.fileOpen.allowDropOpen = value;
        }));

    new Setting(containerEl)
      .setName("Smart quotes")
      .setDesc("Convert straight quotes while typing.")
      .addToggle((toggle) => toggle
        .setValue(draft.automation.smartQuotes)
        .onChange((value) => {
          draft.automation.smartQuotes = value;
        }));

    new Setting(containerEl)
      .setName("Smart dashes")
      .setDesc("Convert repeated hyphens into manuscript dashes while typing.")
      .addToggle((toggle) => toggle
        .setValue(draft.automation.smartDashes)
        .onChange((value) => {
          draft.automation.smartDashes = value;
        }));

    new Setting(containerEl)
      .setName("Auto-capitalization")
      .setDesc("Capitalize letters typed after sentence-ending punctuation.")
      .addToggle((toggle) => toggle
        .setValue(draft.automation.autoCapitalize)
        .onChange((value) => {
          draft.automation.autoCapitalize = value;
        }));

    new Setting(containerEl)
      .setName("Smart indenting")
      .setDesc("Carry paragraph style classes across new paragraphs.")
      .addToggle((toggle) => toggle
        .setValue(draft.automation.smartIndent)
        .onChange((value) => {
          draft.automation.smartIndent = value;
        }));

    new Setting(containerEl)
      .setName("Remove double spaces on save")
      .setDesc("Collapse repeated spaces in saved output.")
      .addToggle((toggle) => toggle
        .setValue(draft.automation.removeDoubleSpacesOnSave)
        .onChange((value) => {
          draft.automation.removeDoubleSpacesOnSave = value;
        }));

    new Setting(containerEl)
      .setName("Normalize line breaks on save")
      .setDesc("Limit consecutive blank paragraphs in saved output.")
      .addToggle((toggle) => toggle
        .setValue(draft.automation.normalizeLineBreaksOnSave)
        .onChange((value) => {
          draft.automation.normalizeLineBreaksOnSave = value;
        }));

    containerEl.createEl("h3", { text: "Integrations" });

    new Setting(containerEl)
      .setName("StoryLine bridge")
      .setDesc("Route StoryLine scene editing, Manuscript views, and formatted exports through Noveler.")
      .addToggle((toggle) => toggle
        .setValue(!!draft.storyLineBridge.enabled)
        .onChange((value) => {
          draft.storyLineBridge.enabled = value;
        }));

    new Setting(containerEl)
      .setName("StoryLine root folder")
      .setDesc("The vault folder containing StoryLine projects.")
      .addText((text) => text
        .setPlaceholder("StoryLine")
        .setValue(draft.storyLineBridge.storyLineRoot || "StoryLine")
        .onChange((value) => {
          draft.storyLineBridge.storyLineRoot = normalizeVaultPath(value) || "StoryLine";
        }));

    new Setting(containerEl)
      .setName("Replace StoryLine scene opens")
      .setDesc("Open StoryLine scenes in Noveler instead of Obsidian's Markdown editor.")
      .addToggle((toggle) => toggle
        .setValue(draft.storyLineBridge.replaceStoryLineSceneOpens !== false)
        .onChange((value) => {
          draft.storyLineBridge.replaceStoryLineSceneOpens = value;
        }));

    new Setting(containerEl)
      .setName("Replace StoryLine Manuscript tab")
      .setDesc("Display Noveler in StoryLine's Manuscript view for the selected scene.")
      .addToggle((toggle) => toggle
        .setValue(draft.storyLineBridge.replaceManuscriptView !== false)
        .onChange((value) => {
          draft.storyLineBridge.replaceManuscriptView = value;
        }));

    new Setting(containerEl)
      .setName("Show EPUB export")
      .setDesc("Add ePub to StoryLine's export formats while the bridge is enabled.")
      .addToggle((toggle) => toggle
        .setValue(draft.storyLineBridge.enableEpubExport !== false)
        .onChange((value) => {
          draft.storyLineBridge.enableEpubExport = value;
        }));

    new Setting(containerEl)
      .setName("Antidote Connect")
      .setDesc("Allow Noveler to send the active manuscript to Antidote Connectix.")
      .addToggle((toggle) => toggle
        .setValue(!!(draft.integrations && draft.integrations.antidoteConnect))
        .onChange((value) => {
          if (!draft.integrations || typeof draft.integrations !== "object") {
            draft.integrations = {};
          }
          draft.integrations.antidoteConnect = value;
        }));

    new Setting(containerEl)
      .setName("Keep Antidote focus")
      .setDesc("Scroll Noveler to Antidote's selected correction, including when it is on another visual page.")
      .addToggle((toggle) => toggle
        .setValue(!(draft.integrations && draft.integrations.antidoteKeepFocus === false))
        .onChange((value) => {
          if (!draft.integrations || typeof draft.integrations !== "object") {
            draft.integrations = {};
          }
          draft.integrations.antidoteKeepFocus = value;
        }));

    new Setting(containerEl)
      .addButton((button) => button
        .setButtonText("Save settings")
        .setCta()
        .onClick(saveDraft));
  }

  addHeadingStyleSetting(containerEl, draft, level) {
    const key = `h${level}`;
    if (!draft.headingStyles[key] || typeof draft.headingStyles[key] !== "object") {
      draft.headingStyles[key] = clone(DEFAULT_SETTINGS.headingStyles[key]);
    }
    const style = draft.headingStyles[key];
    const defaultStyle = DEFAULT_SETTINGS.headingStyles[key];

    new Setting(containerEl)
      .setName(`Heading ${level}`)
      .setDesc("Font / size / weight / style / alignment")
      .addDropdown((dropdown) => {
        for (const [value, label] of this.getSettingsFontOptions(style.fontFamily)) {
          dropdown.addOption(value, label);
        }
        dropdown
          .setValue(style.fontFamily || "body")
          .onChange((value) => {
            style.fontFamily = value || "body";
          });
      })
      .addText((text) => {
        const update = (value) => {
          const size = Number(value);
          if (Number.isFinite(size)) {
            style.fontSize = Math.max(6, Math.min(96, Math.round(size * 100) / 100));
          }
        };
        text
          .setPlaceholder("Size")
          .setValue(String(style.fontSize || defaultStyle.fontSize))
          .onChange(update);
        text.inputEl.type = "number";
        text.inputEl.min = "6";
        text.inputEl.max = "96";
        text.inputEl.step = "0.5";
        text.inputEl.addClass("noveler-heading-size-input");
        text.inputEl.addEventListener("input", () => update(text.inputEl.value));
      })
      .addDropdown((dropdown) => dropdown
        .addOption("300", "Light")
        .addOption("400", "Regular")
        .addOption("500", "Medium")
        .addOption("600", "Semi-bold")
        .addOption("700", "Bold")
        .addOption("800", "Heavy")
        .setValue(String(style.fontWeight || defaultStyle.fontWeight))
        .onChange((value) => {
          style.fontWeight = value;
        }))
      .addDropdown((dropdown) => dropdown
        .addOption("normal", "Normal")
        .addOption("italic", "Italic")
        .setValue(style.italic ? "italic" : "normal")
        .onChange((value) => {
          style.italic = value === "italic";
        }))
      .addDropdown((dropdown) => dropdown
        .addOption("left", "Left")
        .addOption("center", "Center")
        .addOption("right", "Right")
        .addOption("justify", "Justify")
        .setValue(style.alignment || defaultStyle.alignment)
        .onChange((value) => {
          style.alignment = value;
        }));
  }

  getSettingsFontOptions(currentFont) {
    const fonts = new Map([["body", "Body font"]]);
    const addFont = (font) => {
      const family = String(font || "").trim();
      if (family && family !== "body" && !fonts.has(family)) {
        fonts.set(family, family);
      }
    };

    addFont(currentFont);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof NovelerView && Array.isArray(leaf.view.availableFonts)) {
        for (const [value] of leaf.view.availableFonts) {
          addFont(value);
        }
      }
    }
    for (const font of FALLBACK_FONT_FAMILIES) {
      addFont(font);
    }
    return Array.from(fonts.entries());
  }
}

module.exports = NovelerPlugin;
