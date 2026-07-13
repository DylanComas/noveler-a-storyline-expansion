"use strict";
const __novelerNativeRequire = require;
const __novelerModules = {
"./noveler": function(module, exports, require) {
const { ItemView, Menu, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, parseYaml, stringifyYaml, setIcon } = require("obsidian");

const VIEW_TYPE = "noveler-manuscript-writer";
const DEFAULT_MANUSCRIPT = "<p><br></p>";
const SETTINGS_FILE_NAME = "Noveler Settings.json";
const LEGACY_SETTINGS_FILE_PATH = SETTINGS_FILE_NAME;
const SETTINGS_FILE_VERSION = 1;
const ANNOTATION_LINK_MARKER = "#noveler-annotation-";
const DEFAULT_LOCALE = "en-US";
const LOCALE_FOLDER_NAME = ".lang";

const DEFAULT_SETTINGS = {
  language: DEFAULT_LOCALE,
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
    fontPreset: "custom",
    customFontFamily: "Times New Roman",
    fontSize: 12,
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
    h1: { fontFamily: "Georgia", fontSize: 28, fontWeight: "700", italic: false, alignment: "left" },
    h2: { fontFamily: "Georgia", fontSize: 24, fontWeight: "700", italic: false, alignment: "left" },
    h3: { fontFamily: "Georgia", fontSize: 21, fontWeight: "600", italic: false, alignment: "left" },
    h4: { fontFamily: "Georgia", fontSize: 18, fontWeight: "600", italic: false, alignment: "left" },
    h5: { fontFamily: "Georgia", fontSize: 16, fontWeight: "600", italic: false, alignment: "left" },
    h6: { fontFamily: "Georgia", fontSize: 14, fontWeight: "600", italic: false, alignment: "left" }
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
  integrations: {
    antidoteConnect: true,
    antidoteKeepFocus: true
  },
  export: {
    epubLanguage: "en"
  },
  storyLineBridge: {
    enabled: true,
    storyLineRoot: "StoryLine",
    replaceStoryLineSceneOpens: true,
    replaceManuscriptView: true,
    enableEpubExport: true,
    visualLinks: true,
    visualLinkCategories: {
      character: true,
      location: true,
      item: true
    },
    visualLinkColors: {
      character: "#8b5cf6",
      location: "#2f9e73",
      item: "#d97706"
    }
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
  "<p>Bridge mode only opens Markdown scene files inside a project's Scenes folder.</p>"
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

const EPUB_LANGUAGE_OPTIONS = [
  ["en", "English"],
  ["fr", "French"],
  ["de", "German"],
  ["es", "Spanish"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["fi", "Finnish"],
  ["no", "Norwegian"],
  ["sv", "Swedish"],
  ["uk", "Ukrainian"],
  ["ru", "Russian"],
  ["ar", "Arabic"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["ko", "Korean"]
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEpubLanguage(value) {
  const language = String(value || "").trim().replace(/_/g, "-").toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(language) ? language : "en";
}

function mergeSettings(stored) {
  const result = clone(DEFAULT_SETTINGS);
  mergeInto(result, stored || {});
  const storedTypography = stored && stored.typography;
  if (
    storedTypography
    && storedTypography.fontPreset === "serif"
    && !String(storedTypography.customFontFamily || "").trim()
    && Number(storedTypography.fontSize) === 18
  ) {
    result.typography.fontPreset = "custom";
    result.typography.customFontFamily = "Times New Roman";
    result.typography.fontSize = 12;
  }
  result.storyLineBridge.enabled = true;
  result.storyLineBridge.enableEpubExport = true;
  result.integrations.antidoteConnect = true;
  result.integrations.antidoteKeepFocus = true;
  result.export.epubLanguage = normalizeEpubLanguage(result.export.epubLanguage);
  for (let level = 1; level <= 6; level += 1) {
    const heading = result.headingStyles[`h${level}`];
    if (heading && (!heading.fontFamily || heading.fontFamily === "body")) {
      heading.fontFamily = "Georgia";
    }
  }
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
  const options = Object.entries(PAGE_SIZE_PRESETS).map(([value, preset]) => [value, preset.label]);
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

function encodeAnnotationPayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeAnnotationPayload(value) {
  try {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload && payload.v === 1 ? payload : null;
  } catch (error) {
    return null;
  }
}

function parseAnnotationLink(linktext) {
  const raw = String(linktext || "");
  const markerIndex = raw.indexOf(ANNOTATION_LINK_MARKER);
  if (markerIndex < 0) {
    return null;
  }
  const scenePath = normalizeVaultPath(raw.slice(0, markerIndex));
  const payload = decodeAnnotationPayload(raw.slice(markerIndex + ANNOTATION_LINK_MARKER.length));
  return scenePath && payload ? { scenePath, payload } : null;
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class NovelerLocalization {
  constructor(plugin) {
    this.plugin = plugin;
    this.locale = DEFAULT_LOCALE;
    this.catalog = {};
    this.locales = [];
    this.templates = [];
    this.textSources = new WeakMap();
    this.attributeSources = new WeakMap();
    this.observer = null;
    this.pollTimer = null;
    this.polling = false;
    this.localeFingerprint = "";
    this.catalogPath = "";
    this.catalogMtime = 0;
    this.scopeSelector = [
      ".noveler-view",
      ".noveler-settings",
      ".noveler-context-menu",
      ".noveler-storyline-context-submenu",
      ".noveler-entry-modal",
      ".noveler-color-popover",
      ".noveler-bridge-export-options",
      ".notice"
    ].join(", ");
  }

  get folderPath() {
    const pluginDir = normalizeVaultPath(this.plugin.manifest && this.plugin.manifest.dir ? this.plugin.manifest.dir : "");
    if (pluginDir) {
      return `${pluginDir}/${LOCALE_FOLDER_NAME}`;
    }
    const configDir = normalizeVaultPath(this.plugin.app.vault.configDir || ".obsidian");
    return `${configDir}/plugins/${this.plugin.manifest.id}/${LOCALE_FOLDER_NAME}`;
  }

  normalizeLocale(value) {
    const locale = String(value || "").trim();
    return /^[a-z]{2,3}-[A-Z]{2}$/.test(locale) ? locale : DEFAULT_LOCALE;
  }

  async initialize(requestedLocale) {
    await this.discoverLocales();
    await this.setLocale(requestedLocale, { refresh: false });
  }

  async discoverLocales() {
    const adapter = this.plugin.app.vault.adapter;
    const discovered = [];
    if (adapter && typeof adapter.exists === "function" && typeof adapter.list === "function") {
      try {
        if (await adapter.exists(this.folderPath)) {
          const listing = await adapter.list(this.folderPath);
          for (const path of listing.files || []) {
            const match = String(path).replace(/\\/g, "/").match(/\/([a-z]{2,3}-[A-Z]{2})\.json$/);
            if (!match) {
              continue;
            }
            const locale = match[1];
            let name = locale;
            try {
              const parsed = JSON.parse(await adapter.read(path));
              name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : locale;
            } catch (error) {
              console.warn(`Noveler ignored invalid language metadata in ${path}.`, error);
            }
            discovered.push({ locale, name, path });
          }
        }
      } catch (error) {
        console.warn("Noveler could not scan its language folder.", error);
      }
    }
    if (!discovered.some((entry) => entry.locale === DEFAULT_LOCALE)) {
      discovered.push({ locale: DEFAULT_LOCALE, name: "English (United States)", path: "" });
    }
    this.locales = discovered
      .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.locale === entry.locale) === index)
      .sort((left, right) => left.name.localeCompare(right.name));
    this.localeFingerprint = this.locales.map((entry) => `${entry.locale}:${entry.name}:${entry.path}`).join("|");
    return this.locales;
  }

  async getFileMtime(path) {
    const adapter = this.plugin.app.vault.adapter;
    if (!path || !adapter || typeof adapter.stat !== "function") {
      return 0;
    }
    try {
      const stat = await adapter.stat(path);
      return stat && Number.isFinite(Number(stat.mtime)) ? Number(stat.mtime) : 0;
    } catch (_error) {
      return 0;
    }
  }

  async readCatalog(locale) {
    const entry = this.locales.find((candidate) => candidate.locale === locale);
    if (!entry || !entry.path) {
      return {};
    }
    try {
      const parsed = JSON.parse(await this.plugin.app.vault.adapter.read(entry.path));
      if (!parsed || typeof parsed.strings !== "object" || Array.isArray(parsed.strings)) {
        throw new Error("The language file must contain a strings object.");
      }
      return Object.fromEntries(Object.entries(parsed.strings).filter(([key, value]) => (
        typeof key === "string" && typeof value === "string"
      )));
    } catch (error) {
      console.error(`Noveler could not load language ${locale}.`, error);
      if (locale !== DEFAULT_LOCALE) {
        new Notice(`Noveler could not load language ${locale}; English is being used.`);
      }
      return {};
    }
  }

  async setLocale(requestedLocale, options = {}) {
    const normalized = this.normalizeLocale(requestedLocale);
    const available = this.locales.some((entry) => entry.locale === normalized) ? normalized : DEFAULT_LOCALE;
    this.catalog = await this.readCatalog(available);
    this.locale = available;
    const entry = this.locales.find((candidate) => candidate.locale === available);
    this.catalogPath = entry ? entry.path : "";
    this.catalogMtime = await this.getFileMtime(this.catalogPath);
    this.compileTemplates();
    if (options.refresh !== false) {
      this.refresh();
    }
    return available;
  }

  compileTemplates() {
    this.templates = [];
    for (const [source, translated] of Object.entries(this.catalog)) {
      const names = [];
      let cursor = 0;
      let pattern = "";
      for (const match of source.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) {
        pattern += escapeRegExp(source.slice(cursor, match.index));
        pattern += "(.+?)";
        names.push(match[1]);
        cursor = match.index + match[0].length;
      }
      if (!names.length) {
        continue;
      }
      pattern += escapeRegExp(source.slice(cursor));
      this.templates.push({ regex: new RegExp(`^${pattern}$`), names, translated });
    }
  }

  translate(source) {
    const value = String(source == null ? "" : source);
    if (Object.prototype.hasOwnProperty.call(this.catalog, value)) {
      return this.catalog[value];
    }
    for (const template of this.templates) {
      const match = value.match(template.regex);
      if (!match) {
        continue;
      }
      const values = Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]]));
      return template.translated.replace(/\{([a-zA-Z0-9_]+)\}/g, (token, name) => (
        Object.prototype.hasOwnProperty.call(values, name) ? values[name] : token
      ));
    }
    return value;
  }

  translatePreservingWhitespace(value) {
    const match = String(value || "").match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match || !match[2]) {
      return value;
    }
    return `${match[1]}${this.translate(match[2])}${match[3]}`;
  }

  shouldIgnore(node) {
    const element = node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;
    return !!(element && element.closest(
      ".noveler-editor, .noveler-page-content, .cm-editor, .markdown-source-view, .markdown-preview-view, textarea, script, style, code, pre"
    ));
  }

  isInScope(node) {
    const element = node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;
    if (!element) {
      return false;
    }
    return !!element.closest(this.scopeSelector);
  }

  localizeTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || this.shouldIgnore(node) || !this.isInScope(node)) {
      return;
    }
    const current = node.nodeValue || "";
    const previous = this.textSources.get(node);
    const source = previous && current === previous.rendered ? previous.source : current;
    const rendered = this.translatePreservingWhitespace(source);
    this.textSources.set(node, { source, rendered });
    if (current !== rendered) {
      node.nodeValue = rendered;
    }
  }

  localizeAttributes(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE || this.shouldIgnore(element) || !this.isInScope(element)) {
      return;
    }
    const attributes = ["aria-label", "placeholder", "title"];
    let records = this.attributeSources.get(element);
    if (!records) {
      records = new Map();
      this.attributeSources.set(element, records);
    }
    for (const name of attributes) {
      if (!element.hasAttribute(name)) {
        continue;
      }
      const current = element.getAttribute(name) || "";
      const previous = records.get(name);
      const source = previous && current === previous.rendered ? previous.source : current;
      const rendered = this.translate(source);
      records.set(name, { source, rendered });
      if (current !== rendered) {
        element.setAttribute(name, rendered);
      }
    }
  }

  localizeTree(root) {
    if (!root || this.shouldIgnore(root)) {
      return;
    }
    if (root.nodeType === Node.TEXT_NODE) {
      this.localizeTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE) {
      this.localizeAttributes(root);
    }
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => this.shouldIgnore(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      }
    );
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        this.localizeTextNode(node);
      } else {
        this.localizeAttributes(node);
      }
      node = walker.nextNode();
    }
  }

  start() {
    if (this.observer || !document.body) {
      return;
    }
    this.refresh();
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          this.localizeTextNode(mutation.target);
        } else if (mutation.type === "attributes") {
          this.localizeAttributes(mutation.target);
        } else {
          for (const node of mutation.addedNodes) {
            this.localizeTree(node);
          }
        }
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title"]
    });
    this.pollTimer = window.setInterval(() => {
      this.pollLocaleFiles().catch((error) => console.warn("Noveler could not refresh its language files.", error));
    }, 3000);
  }

  async pollLocaleFiles() {
    if (this.polling) {
      return;
    }
    this.polling = true;
    try {
      const previousFingerprint = this.localeFingerprint;
      await this.discoverLocales();
      if (previousFingerprint !== this.localeFingerprint) {
        window.dispatchEvent(new CustomEvent("noveler-locales-changed", { detail: { locales: this.locales } }));
      }
      const entry = this.locales.find((candidate) => candidate.locale === this.locale);
      if (!entry && this.locale !== DEFAULT_LOCALE) {
        await this.plugin.changeLanguage(DEFAULT_LOCALE);
        return;
      }
      const path = entry ? entry.path : "";
      const mtime = await this.getFileMtime(path);
      if (path && (path !== this.catalogPath || (mtime && mtime !== this.catalogMtime))) {
        await this.setLocale(this.locale);
        this.plugin.refreshLocalizedCommands();
        window.dispatchEvent(new CustomEvent("noveler-language-changed", { detail: { locale: this.locale } }));
      }
    } finally {
      this.polling = false;
    }
  }

  refresh() {
    if (document.body) {
      for (const root of document.querySelectorAll(this.scopeSelector)) {
        if (!root.parentElement || !root.parentElement.closest(this.scopeSelector)) {
          this.localizeTree(root);
        }
      }
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

class NovelerPlugin extends Plugin {
  async onload() {
    this.settingsWritePromise = Promise.resolve();
    this.viewActivationPromise = Promise.resolve();
    this.propertiesRefreshTimer = null;
    this.focusModeViews = new Set();
    this.focusSidebarState = null;
    this.localizedCommandNames = new Map();
    await this.loadSettings();
    this.localization = new NovelerLocalization(this);
    await this.localization.initialize(this.settings.language);
    this.localization.start();

    this.registerView(VIEW_TYPE, (leaf) => new NovelerView(leaf, this));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.enforceSingleNovelerView()));
    if (typeof this.app.workspace.onLayoutReady === "function") {
      this.app.workspace.onLayoutReady(() => this.enforceSingleNovelerView());
    }
    this.installActiveFileBridge();
    this.registerNovelerApi();

    this.novelerRibbonEl = this.addRibbonIcon("book-open-text", this.t("Open Noveler"), () => {
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
      id: "noveler-page-break",
      name: "Noveler: Insert page break",
      checkCallback: (checking) => this.withView(checking, (view) => view.insertPageBreak())
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
    this.settingTab = new NovelerSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.registerDomEvent(window, "noveler-locales-changed", () => {
      if (this.settingTab && this.settingTab.containerEl && this.settingTab.containerEl.isConnected) {
        this.settingTab.display();
      }
    });
    this.registerDomEvent(window, "noveler-language-changed", () => {
      if (this.settingTab && this.settingTab.containerEl && this.settingTab.containerEl.isConnected) {
        this.localization.refresh();
      }
    });
    this.registerVaultTitleSync();
    this.refreshLocalizedCommands();
  }

  onunload() {
    if (this.localization) {
      this.localization.stop();
    }
    if (this.propertiesRefreshTimer) {
      window.clearTimeout(this.propertiesRefreshTimer);
      this.propertiesRefreshTimer = null;
    }
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
      isAnnotationLink: (linktext) => !!parseAnnotationLink(linktext),
      openAnnotationLink: (linktext) => this.openAnnotationLink(linktext),
      isStoryLineBridgeEnabled: () => this.isStoryLineBridgeEnabled(),
      isStoryLineScenePath: (path) => this.isStoryLineScenePath(path),
      isAntidoteConnectEnabled: () => this.isAntidoteConnectEnabled(),
      getActiveView: () => this.getActiveView(),
      translate: (source) => this.t(source),
      getLocale: () => this.localization ? this.localization.locale : DEFAULT_LOCALE,
      setLocale: (locale) => this.changeLanguage(locale),
      createAntidoteDocument: (options = {}) => {
        if (!this.isAntidoteConnectEnabled()) {
          return null;
        }
        const view = this.getActiveView();
        return view && typeof view.createAntidoteDocument === "function" ? view.createAntidoteDocument(options) : null;
      },
      getCurrentScenePath: () => {
        const view = this.getLoadedView();
        return view ? view.currentDocumentPath : "";
      }
    };
  }

  t(source) {
    return this.localization ? this.localization.translate(source) : String(source == null ? "" : source);
  }

  addCommand(command) {
    if (command && command.name) {
      command.__novelerSourceName = command.__novelerSourceName || command.name;
      this.localizedCommandNames.set(command.id, command.__novelerSourceName);
      command.name = this.t(command.__novelerSourceName);
    }
    return super.addCommand(command);
  }

  refreshLocalizedCommands() {
    const commands = this.app.commands && this.app.commands.commands ? this.app.commands.commands : {};
    const prefix = `${this.manifest.id}:`;
    for (const [id, command] of Object.entries(commands)) {
      if (!id.startsWith(prefix) || !command) {
        continue;
      }
      const localId = id.slice(prefix.length);
      const sourceName = this.localizedCommandNames.get(localId) || command.__novelerSourceName || command.name;
      command.__novelerSourceName = sourceName;
      command.name = this.t(sourceName);
    }
  }

  async changeLanguage(locale) {
    if (!this.localization) {
      return DEFAULT_LOCALE;
    }
    await this.localization.discoverLocales();
    const selected = await this.localization.setLocale(locale);
    this.settings.language = selected;
    await this.queueSettingsPersistence(this.getSerializableSettings(), true);
    this.refreshLocalizedCommands();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof NovelerView) {
        leaf.view.updatePageFooters();
      }
    }
    if (this.novelerRibbonEl) {
      this.novelerRibbonEl.setAttribute("aria-label", this.t("Open Noveler"));
    }
    if (this.storyLineBridgeModule) {
      this.storyLineBridgeModule.enhanceStoryLineExportModals();
    }
    window.dispatchEvent(new CustomEvent("noveler-language-changed", { detail: { locale: selected } }));
    return selected;
  }

  installActiveFileBridge() {
    const workspace = this.app.workspace;
    if (!workspace || typeof workspace.getActiveFile !== "function") {
      return;
    }
    const originalGetActiveFile = workspace.getActiveFile;
    const plugin = this;
    const bridgedGetActiveFile = function(...args) {
      const loadedSceneFile = plugin.getLoadedSceneFile();
      if (loadedSceneFile) {
        return loadedSceneFile;
      }
      return originalGetActiveFile.apply(this, args);
    };
    workspace.getActiveFile = bridgedGetActiveFile;
    this.register(() => {
      if (workspace.getActiveFile === bridgedGetActiveFile) {
        workspace.getActiveFile = originalGetActiveFile;
      }
    });
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
      leaf.view.setActiveDocumentFile(file);
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

  getLoadedView() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    return leaf && leaf.view instanceof NovelerView ? leaf.view : null;
  }

  getLoadedSceneFile() {
    const view = this.getLoadedView();
    if (!view) {
      return null;
    }
    if (view.file instanceof TFile) {
      return view.file;
    }
    const path = normalizeVaultPath(view.currentDocumentPath);
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    return file instanceof TFile ? file : null;
  }

  refreshLoadedSceneProperties() {
    if (this.propertiesRefreshTimer) {
      window.clearTimeout(this.propertiesRefreshTimer);
    }
    this.propertiesRefreshTimer = window.setTimeout(() => {
      this.propertiesRefreshTimer = null;
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf) {
        this.app.workspace.trigger("active-leaf-change", activeLeaf);
      }
    }, 0);
  }

  enforceSingleNovelerView(preferredLeaf) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (!leaves.length) {
      return null;
    }
    if (this.enforcingSingleNovelerView) {
      return leaves.includes(preferredLeaf) ? preferredLeaf : leaves[0];
    }
    const activeLeaf = this.app.workspace.activeLeaf;
    const keepLeaf = leaves.includes(preferredLeaf)
      ? preferredLeaf
      : leaves.includes(activeLeaf)
        ? activeLeaf
        : leaves[0];
    this.enforcingSingleNovelerView = true;
    try {
      for (const leaf of leaves) {
        if (leaf !== keepLeaf && typeof leaf.detach === "function") {
          leaf.detach();
        }
      }
    } finally {
      this.enforcingSingleNovelerView = false;
    }
    return keepLeaf;
  }

  activateView(state = {}, options = {}) {
    const activate = () => this.activateViewInternal(state, options);
    this.viewActivationPromise = this.viewActivationPromise.then(activate, activate);
    return this.viewActivationPromise;
  }

  async activateViewInternal(state = {}, options = {}) {
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

    let leaf = this.enforceSingleNovelerView();
    if (leaf && leaf.view instanceof NovelerView) {
      if (state.path) {
        await leaf.view.openScenePath(state.path, { source: state.source, silent: true });
      }
      this.app.workspace.revealLeaf(leaf);
      return;
    }
    if (!leaf) {
      leaf = options.targetLeaf && options.replaceLeaf
        ? options.targetLeaf
        : this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true, state });
    } else if (state && Object.keys(state).length) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true, state });
    }
    leaf = this.enforceSingleNovelerView(leaf) || leaf;
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
    }, options);
  }

  async openAnnotationLink(linktext) {
    const annotation = parseAnnotationLink(linktext);
    if (!annotation) {
      return false;
    }
    const sceneFile = this.app.vault.getAbstractFileByPath(annotation.scenePath);
    if (!(sceneFile instanceof TFile)) {
      new Notice(`Annotated scene not found: ${annotation.scenePath}`);
      return true;
    }

    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE).find((candidate) => (
      candidate.view instanceof NovelerView
      && normalizeVaultPath(candidate.view.currentDocumentPath) === annotation.scenePath
    ));
    if (!leaf) {
      await this.openScene(annotation.scenePath, { source: "annotation" });
      leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE).find((candidate) => (
        candidate.view instanceof NovelerView
        && normalizeVaultPath(candidate.view.currentDocumentPath) === annotation.scenePath
      ));
    }
    if (!leaf || !(leaf.view instanceof NovelerView)) {
      new Notice("Could not open the annotated scene in Noveler.");
      return true;
    }
    await this.app.workspace.revealLeaf(leaf);
    const highlighted = leaf.view.revealAnnotation(annotation.payload);
    if (!highlighted) {
      new Notice("The annotated passage could not be found in the current scene text.");
    }
    return true;
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
      if (writeSettingsFile) {
        await this.saveSettingsFile(snapshot);
        try {
          await this.saveData(snapshot);
        } catch (error) {
          console.warn("Noveler saved its settings JSON but could not update Obsidian's plugin data cache.", error);
        }
      } else {
        await this.saveData(snapshot);
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
      try {
        await this.saveSettingsFile(this.settings);
      } catch (error) {
        console.warn(`Noveler could not migrate ${SETTINGS_FILE_NAME} into the plugin folder.`, error);
      }
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
    const settingsPath = this.getSettingsFilePath();
    const payload = {
      version: SETTINGS_FILE_VERSION,
      savedAt: new Date().toISOString(),
      settings: mergeSettings(settingsData || this.getSerializableSettings())
    };
    try {
      await this.ensureAdapterFolder(settingsPath);
      await this.app.vault.adapter.write(settingsPath, `${JSON.stringify(payload, null, 2)}\n`);
    } catch (error) {
      console.error(`Noveler could not write ${SETTINGS_FILE_NAME}.`, error);
      throw error;
    }
    try {
      if (
        settingsPath !== LEGACY_SETTINGS_FILE_PATH
        && typeof this.app.vault.adapter.remove === "function"
        && await this.app.vault.adapter.exists(LEGACY_SETTINGS_FILE_PATH)
      ) {
        await this.app.vault.adapter.remove(LEGACY_SETTINGS_FILE_PATH);
      }
    } catch (error) {
      console.warn(`Noveler could not remove the legacy ${SETTINGS_FILE_NAME}.`, error);
    }
    return settingsPath;
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
    this.file = null;
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
    this.storyLineLinkFrame = 0;
    this.storyLineLinkRanges = [];
    this.storyLineHoverFrame = 0;
    this.storyLineHoverPoint = null;
    this.storyLineEntityRefreshTimer = null;
    this.storyLineContextMenu = null;
    this.storyLineContextSubmenuEl = null;
    this.storyLineContextAnchorEl = null;
    this.storyLineContextCloseTimer = null;
    this.annotationHighlightRange = null;
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
    this.registerStoryLineEntityLinkUpdates();
    this.loadInstalledFonts();
    await this.loadDocument(this.getStatePath());
    this.applySettings();
    this.updateWordCount();
  }

  async setState(state, result) {
    if (typeof super.setState === "function") {
      await super.setState(state, result);
    }

    const path = normalizeVaultPath((state && (state.path || state.filePath || (typeof state.file === "string" ? state.file : ""))) || "");
    if (path && this.editorEl) {
      await this.openScenePath(path, { source: state.source, silent: true });
    }
  }

  getState() {
    if (this.plugin.isStoryLineBridgeEnabled()) {
      const path = this.currentDocumentPath || this.plugin.getStoryLineActiveScenePath();
      return {
        path,
        file: path
      };
    }
    const path = this.currentDocumentPath || this.plugin.settings.manuscriptPath;
    return {
      path,
      file: path
    };
  }

  getFile() {
    return this.file instanceof TFile ? this.file : null;
  }

  setActiveDocumentFile(file, notify = true) {
    this.file = file instanceof TFile ? file : null;
    if (notify) {
      this.plugin.refreshLoadedSceneProperties();
    }
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
    if (this.storyLineLinkFrame) {
      window.cancelAnimationFrame(this.storyLineLinkFrame);
      this.storyLineLinkFrame = 0;
    }
    if (this.storyLineHoverFrame) {
      window.cancelAnimationFrame(this.storyLineHoverFrame);
      this.storyLineHoverFrame = 0;
    }
    if (this.storyLineEntityRefreshTimer) {
      window.clearTimeout(this.storyLineEntityRefreshTimer);
      this.storyLineEntityRefreshTimer = null;
    }
    this.closeStoryLineContextSubmenu();
    this.clearAnnotationHighlight();
    this.clearStoryLineVisualLinks();
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
      this.clearAnnotationHighlight();
      this.captureSelection();
      this.schedulePagination();
      this.scheduleStoryLineVisualLinks();
      this.scheduleSave();
      this.updateWordCount();
      this.updateStatus("Unsaved changes");
    });
    this.registerDomEvent(this.editorEl, "beforeinput", (event) => this.onBeforeInput(event));
    this.registerDomEvent(this.editorEl, "paste", (event) => this.onEditorPaste(event));
    this.registerDomEvent(this.editorEl, "keydown", (event) => this.onKeydown(event));
    this.registerDomEvent(window, "keydown", (event) => this.onCapturedKeydown(event), true);
    this.registerDomEvent(this.editorEl, "pointerdown", (event) => {
      this.clearAnnotationHighlight();
      this.captureCaretFromPoint(event);
    });
    this.registerDomEvent(this.editorEl, "click", (event) => this.onEditorClick(event));
    this.registerDomEvent(this.editorEl, "pointermove", (event) => this.updateStoryLineLinkHover(event));
    this.registerDomEvent(this.editorEl, "pointerleave", () => this.clearStoryLineLinkHover());
    this.registerDomEvent(this.editorEl, "mouseup", () => this.captureSelection());
    this.registerDomEvent(this.editorEl, "keyup", () => this.captureSelection());
    this.registerDomEvent(this.editorEl, "focusin", () => this.scheduleStoryLineVisualLinks());
    this.registerDomEvent(this.editorEl, "contextmenu", (event) => this.openContextMenu(event));
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
    if (this.getStoryLinePluginForCodex()) {
      const linkButtons = this.statusControlsEl.createDiv({ cls: "noveler-segmented noveler-storyline-link-controls" });
      this.createStoryLineLinkButton(linkButtons, "character", "users", "Character links");
      this.createStoryLineLinkButton(linkButtons, "location", "map-pin", "Location links");
      this.createStoryLineLinkButton(linkButtons, "item", "package", "Item links");
    }
  }

  createStoryLineLinkButton(parent, kind, icon, label) {
    const categories = this.plugin.settings.storyLineBridge.visualLinkCategories || DEFAULT_SETTINGS.storyLineBridge.visualLinkCategories;
    const button = this.createIconButton(parent, icon, label, () => this.toggleStoryLineVisualLinks(kind), categories[kind] !== false);
    button.addClass(`noveler-storyline-link-button-${kind}`);
    return button;
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
      ).catch((error) => console.warn("Noveler could not persist scene typography settings.", error));
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
    const target = event.target;
    if (
      this.storyLineContextSubmenuEl
      && target instanceof Node
      && !this.storyLineContextSubmenuEl.contains(target)
      && !(this.storyLineContextAnchorEl && this.storyLineContextAnchorEl.contains(target))
    ) {
      this.closeStoryLineContextSubmenu();
    }
    if (!this.colorPopoverEl) {
      return;
    }
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
      ).catch((error) => console.warn("Noveler could not persist scene typography settings.", error));
      this.scheduleSave();
      return;
    }
    this.plugin.globalTypography = clone(this.plugin.settings.typography);
    if (options.silent) {
      const data = this.plugin.getSerializableSettings();
      this.plugin.queueSettingsPersistence(data, true).catch((error) => {
        console.warn("Noveler could not persist toolbar settings.", error);
      });
      return;
    }
    this.plugin.saveSettings().catch((error) => console.warn("Noveler could not persist toolbar settings.", error));
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
    this.plugin.saveSettings().catch((error) => console.warn("Noveler could not persist layout settings.", error));
  }

  persistFocusSetting(key) {
    if (this.plugin.settingTab && this.plugin.settingTab.draftSettings) {
      if (!this.plugin.settingTab.draftSettings.focus) {
        this.plugin.settingTab.draftSettings.focus = clone(DEFAULT_SETTINGS.focus);
      }
      this.plugin.settingTab.draftSettings.focus[key] = this.plugin.settings.focus[key];
    }
    this.plugin.saveSettings().catch((error) => console.warn("Noveler could not persist Focus mode settings.", error));
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
    this.clearAnnotationHighlight();
    this.editorEl.setAttribute("contenteditable", "true");
    this.editorEl.innerHTML = this.contentToEditorHtml(file.name, sceneContent.body, title);
    this.currentDocumentPath = path;
    this.setActiveDocumentFile(file);
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
    this.setActiveDocumentFile(null);
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
      const currentFile = this.plugin.app.vault.getAbstractFileByPath(vaultPath);
      this.setActiveDocumentFile(currentFile instanceof TFile ? currentFile : null);
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
    text = text.replace(/\\([\\`*_[\]{}()#+\-.!~<>])/g, (_match, char) => stash(escapeHtml(char)));
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
      if (node.nodeType === Node.ELEMENT_NODE && node.hasClass("noveler-page-break")) {
        page = this.createEditorPage();
        page.appendChild(node);
        continue;
      }
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
    this.scheduleStoryLineVisualLinks();
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
      page.setAttribute("aria-label", this.plugin.t(`Page ${index + 1}`));
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
    this.scheduleStoryLineVisualLinks();
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
    if (menu.dom) {
      menu.dom.addClass("noveler-context-menu");
    }
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
    this.plugin.saveSettings().catch((error) => console.warn("Noveler could not persist editing settings.", error));
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

  insertPageBreak() {
    this.focusForCommand();
    const range = this.getSelectionRange();
    if (!range) {
      return;
    }

    range.deleteContents();
    const marker = document.createElement("div");
    marker.className = "noveler-page-break";
    marker.setAttribute("contenteditable", "false");
    range.insertNode(marker);

    const page = marker.closest(".noveler-page");
    const contentRoot = page || this.editorEl;
    while (marker.parentNode && marker.parentNode !== contentRoot) {
      const container = marker.parentNode;
      const parent = container.parentNode;
      if (!parent) {
        break;
      }
      const trailingContainer = container.cloneNode(false);
      while (marker.nextSibling) {
        trailingContainer.appendChild(marker.nextSibling);
      }
      parent.insertBefore(marker, container.nextSibling);
      if (trailingContainer.childNodes.length) {
        parent.insertBefore(trailingContainer, marker.nextSibling);
      }
    }

    let followingBlock = marker.nextSibling;
    if (!followingBlock || followingBlock.nodeType !== Node.ELEMENT_NODE) {
      followingBlock = document.createElement("p");
      followingBlock.appendChild(document.createElement("br"));
      marker.parentNode.insertBefore(followingBlock, marker.nextSibling);
    }

    const caret = document.createRange();
    caret.selectNodeContents(followingBlock);
    caret.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(caret);
    this.captureSelection();
    this.revealCaretAfterPagination = true;
    this.schedulePagination();
    this.scheduleSave();
    this.updateWordCount();
    this.updateStatus("Unsaved changes");
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

  onEditorClick(event) {
    if (this.openStoryLineLinkAtPoint(event)) {
      return;
    }
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

  onCapturedKeydown(event) {
    const target = event.target;
    if (!this.editorEl || !target || !this.editorEl.contains(target)) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      this.insertPageBreak();
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

  copyFromContextMenu() {
    this.focusForCommand();
    const range = this.getSelectionRange();
    if (!range || range.collapsed) {
      return;
    }
    if (!document.execCommand("copy") && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(range.toString()).catch(() => new Notice("Noveler could not copy the selection."));
    }
  }

  cutFromContextMenu() {
    this.focusForCommand();
    const range = this.getSelectionRange();
    if (!range || range.collapsed) {
      return;
    }
    if (!document.execCommand("cut")) {
      const text = range.toString();
      const clipboard = navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        new Notice("Noveler could not cut the selection.");
        return;
      }
      clipboard.writeText(text).then(() => {
        this.focusForCommand();
        document.execCommand("delete", false, null);
        this.afterClipboardEdit();
      }).catch(() => new Notice("Noveler could not cut the selection."));
      return;
    }
    this.afterClipboardEdit();
  }

  async pasteFromContextMenu() {
    this.focusForCommand();
    if (document.execCommand("paste")) {
      this.afterClipboardEdit();
      return;
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      const text = await navigator.clipboard.readText();
      this.insertText(text);
      this.schedulePagination();
    } catch (_error) {
      new Notice("Noveler could not access the clipboard.");
    }
  }

  afterClipboardEdit() {
    this.captureSelection();
    this.schedulePagination();
    this.scheduleSave();
    this.updateWordCount();
    this.updateStatus("Unsaved changes");
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
      canReplace: (start, end, context, id) => view.canReplaceAntidoteRange(start, end, context, id),
      replaceRange: (start, end, text, id) => view.replaceAntidoteRange(start, end, text, id),
      selectRange: (start, end, id) => view.selectAntidoteRange(start, end, id),
      isAvailable: () => !!(view.editorEl && document.body.contains(view.editorEl)),
      focus: () => view.focusAntidoteDocument()
    };
  }

  getAntidoteZones(checkWholeDocument) {
    if (checkWholeDocument) {
      return this.getAntidoteZoneNodeGroups().map((group) => {
        const snapshot = this.createAntidoteTextSnapshot(group.nodes);
        return {
          text: snapshot.text,
          selectionStart: 0,
          selectionEnd: 0,
          id: group.id
        };
      }).filter((zone) => zone.text.trim());
    }
    const snapshot = this.createAntidoteTextSnapshot();
    const selection = this.getAntidoteSelectionOffsets(snapshot);
    return [{
      text: snapshot.text,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      id: "document"
    }];
  }

  getAntidoteZoneNodeGroups() {
    const contentNodes = this.getAntidoteContentNodes();
    const groups = [];
    for (let index = 0; index < contentNodes.length; index += 1) {
      const node = contentNodes[index];
      if (node.nodeType === Node.ELEMENT_NODE && ["ul", "ol"].includes(node.tagName.toLowerCase())) {
        for (const item of Array.from(node.querySelectorAll(":scope > li"))) {
          groups.push({ nodes: [item] });
        }
        continue;
      }
      const nodes = [node];
      if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("data-noveler-split-id")) {
        const splitId = node.getAttribute("data-noveler-split-id");
        while (
          index + 1 < contentNodes.length
          && contentNodes[index + 1].nodeType === Node.ELEMENT_NODE
          && contentNodes[index + 1].getAttribute("data-noveler-split-id") === splitId
        ) {
          index += 1;
          nodes.push(contentNodes[index]);
        }
      }
      groups.push({ nodes });
    }

    return groups.map((group) => {
      const elements = group.nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE);
      let id = "";
      for (const element of elements) {
        id = element.getAttribute("data-noveler-antidote-zone-id") || id;
      }
      if (!id) {
        this.antidoteZoneSequence = (Number(this.antidoteZoneSequence) || 0) + 1;
        id = `noveler-zone-${this.antidoteZoneSequence}`;
      }
      for (const element of elements) {
        element.setAttribute("data-noveler-antidote-zone-id", id);
      }
      return { id, nodes: group.nodes };
    });
  }

  getAntidoteSnapshotForZone(id) {
    if (!id || id === "0" || id === "document") {
      return this.createAntidoteTextSnapshot();
    }
    const nodes = Array.from(this.editorEl.querySelectorAll("[data-noveler-antidote-zone-id]"))
      .filter((node) => node.getAttribute("data-noveler-antidote-zone-id") === String(id));
    return nodes.length ? this.createAntidoteTextSnapshot(nodes) : null;
  }

  createAntidoteTextSnapshot(contentNodesOverride) {
    const snapshot = {
      text: "",
      positions: []
    };
    const contentNodes = Array.isArray(contentNodesOverride) ? contentNodesOverride : this.getAntidoteContentNodes();

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

  canReplaceAntidoteRange(start, end, context, id) {
    if (!this.editorEl) {
      return false;
    }
    const snapshot = this.getAntidoteSnapshotForZone(id);
    if (!snapshot) {
      return false;
    }
    const safeStart = Math.max(0, Math.min(snapshot.text.length, Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.min(snapshot.text.length, Number(end) || safeStart));
    const expected = String(context || "");
    if (!expected) {
      return true;
    }
    const actual = snapshot.text.slice(safeStart, safeEnd);
    return actual === expected || snapshot.text.slice(safeStart, safeEnd + 1).startsWith(expected);
  }

  getAntidoteDiffTokens(value) {
    const tokens = [];
    const pattern = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;
    const text = String(value || "");
    let match;
    while ((match = pattern.exec(text)) !== null) {
      tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens;
  }

  getAntidoteReplacementEdits(originalValue, replacementValue, baseStart) {
    const original = String(originalValue || "");
    const replacement = String(replacementValue || "");
    if (original === replacement) {
      return [];
    }

    const originalTokens = this.getAntidoteDiffTokens(original);
    const replacementTokens = this.getAntidoteDiffTokens(replacement);
    if (!originalTokens.length || !replacementTokens.length || originalTokens.length * replacementTokens.length > 60000) {
      let prefix = 0;
      while (prefix < original.length && prefix < replacement.length && original[prefix] === replacement[prefix]) {
        prefix += 1;
      }
      let suffix = 0;
      while (
        suffix < original.length - prefix
        && suffix < replacement.length - prefix
        && original[original.length - 1 - suffix] === replacement[replacement.length - 1 - suffix]
      ) {
        suffix += 1;
      }
      return [{
        start: baseStart + prefix,
        end: baseStart + original.length - suffix,
        text: replacement.slice(prefix, replacement.length - suffix)
      }];
    }

    const table = Array.from(
      { length: originalTokens.length + 1 },
      () => new Uint16Array(replacementTokens.length + 1)
    );
    for (let left = originalTokens.length - 1; left >= 0; left -= 1) {
      for (let right = replacementTokens.length - 1; right >= 0; right -= 1) {
        table[left][right] = originalTokens[left].value === replacementTokens[right].value
          ? table[left + 1][right + 1] + 1
          : Math.max(table[left + 1][right], table[left][right + 1]);
      }
    }

    const matches = [];
    let left = 0;
    let right = 0;
    while (left < originalTokens.length && right < replacementTokens.length) {
      if (originalTokens[left].value === replacementTokens[right].value) {
        matches.push({ original: originalTokens[left], replacement: replacementTokens[right] });
        left += 1;
        right += 1;
      } else if (table[left + 1][right] >= table[left][right + 1]) {
        left += 1;
      } else {
        right += 1;
      }
    }

    const edits = [];
    let originalOffset = 0;
    let replacementOffset = 0;
    for (const match of [...matches, {
      original: { start: original.length, end: original.length },
      replacement: { start: replacement.length, end: replacement.length }
    }]) {
      if (originalOffset !== match.original.start || replacementOffset !== match.replacement.start) {
        edits.push({
          start: baseStart + originalOffset,
          end: baseStart + match.original.start,
          text: replacement.slice(replacementOffset, match.replacement.start)
        });
      }
      originalOffset = match.original.end;
      replacementOffset = match.replacement.end;
    }
    return edits;
  }

  canApplyAntidoteTextEdit(snapshot, edit) {
    if (edit.start === edit.end) {
      const position = this.getAntidoteDomPosition(snapshot, edit.start, "forward");
      return !!(position && position.node && position.node.nodeType === Node.TEXT_NODE);
    }
    for (let index = edit.start; index < edit.end; index += 1) {
      const position = snapshot.positions[index];
      if (!position || !position.node || position.node.nodeType !== Node.TEXT_NODE) {
        return false;
      }
    }
    return true;
  }

  applyAntidoteTextEdit(snapshot, edit) {
    if (edit.start === edit.end) {
      const position = this.getAntidoteDomPosition(snapshot, edit.start, "forward");
      const value = position.node.nodeValue || "";
      position.node.nodeValue = `${value.slice(0, position.offset)}${edit.text}${value.slice(position.offset)}`;
      return;
    }

    const segments = [];
    const byNode = new Map();
    for (let index = edit.start; index < edit.end; index += 1) {
      const position = snapshot.positions[index];
      let segment = byNode.get(position.node);
      if (!segment) {
        segment = { node: position.node, start: position.offset, end: position.offset + 1 };
        byNode.set(position.node, segment);
        segments.push(segment);
      } else {
        segment.start = Math.min(segment.start, position.offset);
        segment.end = Math.max(segment.end, position.offset + 1);
      }
    }

    for (let index = segments.length - 1; index >= 1; index -= 1) {
      const segment = segments[index];
      const value = segment.node.nodeValue || "";
      segment.node.nodeValue = `${value.slice(0, segment.start)}${value.slice(segment.end)}`;
    }
    const first = segments[0];
    const value = first.node.nodeValue || "";
    first.node.nodeValue = `${value.slice(0, first.start)}${edit.text}${value.slice(first.end)}`;
  }

  replaceAntidoteRange(start, end, text, id) {
    const snapshot = this.getAntidoteSnapshotForZone(id);
    if (!snapshot) {
      return Promise.resolve(false);
    }
    const safeStart = Math.max(0, Math.min(snapshot.text.length, Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.min(snapshot.text.length, Number(end) || safeStart));
    const replacement = String(text || "");
    const edits = this.getAntidoteReplacementEdits(snapshot.text.slice(safeStart, safeEnd), replacement, safeStart);
    if (edits.some((edit) => !this.canApplyAntidoteTextEdit(snapshot, edit))) {
      return Promise.resolve(false);
    }
    for (const edit of edits.slice().sort((left, right) => right.start - left.start)) {
      this.applyAntidoteTextEdit(snapshot, edit);
    }

    const updatedSnapshot = this.getAntidoteSnapshotForZone(id);
    const caretPosition = updatedSnapshot
      ? this.getAntidoteDomPosition(updatedSnapshot, Math.min(updatedSnapshot.text.length, safeStart + replacement.length), "backward")
      : null;
    const selection = window.getSelection();
    if (selection && caretPosition) {
      const range = document.createRange();
      range.setStart(caretPosition.node, caretPosition.offset);
      range.collapse(true);
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

  selectAntidoteRange(start, end, id) {
    const snapshot = this.getAntidoteSnapshotForZone(id);
    if (!snapshot) {
      return;
    }
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
    this.closeStoryLineContextSubmenu();
    this.captureSelection();
    const selectedText = this.getSelectedTextForStoryLineCodex();
    const storyLine = this.getStoryLinePluginForCodex();
    const menu = new Menu();
    this.storyLineContextMenu = menu;
    menu.addItem((item) => item.setTitle("Copy").setIcon("copy").setDisabled(!selectedText).onClick(() => this.copyFromContextMenu()));
    menu.addItem((item) => item.setTitle("Cut").setIcon("scissors").setDisabled(!selectedText).onClick(() => this.cutFromContextMenu()));
    menu.addItem((item) => item.setTitle("Paste").setIcon("clipboard-paste").onClick(() => this.pasteFromContextMenu()));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Bold").setIcon("bold").onClick(() => this.format("bold")));
    menu.addItem((item) => item.setTitle("Italic").setIcon("italic").onClick(() => this.format("italic")));
    menu.addItem((item) => item.setTitle("Underline").setIcon("underline").onClick(() => this.format("underline")));
    if (storyLine && selectedText) {
      menu.addSeparator();
      const currentScene = storyLine.sceneManager && typeof storyLine.sceneManager.getScene === "function"
        ? storyLine.sceneManager.getScene(normalizeVaultPath(this.currentDocumentPath))
        : null;
      if (currentScene) {
        menu.addItem((item) => item
          .setTitle("Annotation")
          .setIcon("message-square-text")
          .onClick(() => this.createStoryLineAnnotation()));
      }
      this.addStoryLineContextCategory(menu, storyLine, "character", "Characters", "users", selectedText);
      this.addStoryLineContextCategory(menu, storyLine, "location", "Locations", "map-pin", selectedText);
      this.addStoryLineContextCategory(menu, storyLine, "item", "Items", "package", selectedText);
    }
    if (menu.dom) {
      menu.dom.addClass("noveler-context-menu");
    }
    menu.showAtMouseEvent(event);
  }

  addStoryLineContextCategory(menu, storyLine, kind, title, icon, selectedText) {
    menu.addItem((item) => {
      item.setTitle(title).setIcon(icon);
      const anchor = item.dom;
      if (!anchor) {
        item.onClick((clickEvent) => {
          const clickAnchor = clickEvent.currentTarget && typeof clickEvent.currentTarget.getBoundingClientRect === "function"
            ? clickEvent.currentTarget
            : this.editorEl;
          this.openStoryLineContextSubmenu(clickAnchor, storyLine, kind, selectedText);
        });
        return;
      }
      anchor.addClass("noveler-storyline-context-parent");
      anchor.setAttribute("aria-haspopup", "menu");
      const chevron = anchor.createSpan({ cls: "noveler-storyline-context-chevron" });
      chevron.setAttribute("aria-hidden", "true");
      setIcon(chevron, "chevron-right");
      const openSubmenu = () => {
        this.cancelStoryLineContextClose();
        this.openStoryLineContextSubmenu(anchor, storyLine, kind, selectedText);
      };
      anchor.addEventListener("pointerenter", openSubmenu);
      anchor.addEventListener("focusin", openSubmenu);
      anchor.addEventListener("pointerleave", () => this.scheduleStoryLineContextClose());
      anchor.addEventListener("click", (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        openSubmenu();
      });
    });
  }

  getStoryLineContextEntries(storyLine, kind) {
    let entries = [];
    if (kind === "character" && storyLine.characterManager && typeof storyLine.characterManager.getAllCharacters === "function") {
      entries = storyLine.characterManager.getAllCharacters();
    } else if (kind === "location" && storyLine.locationManager && typeof storyLine.locationManager.getAllLocations === "function") {
      entries = storyLine.locationManager.getAllLocations();
    } else if (kind === "item" && storyLine.codexManager && typeof storyLine.codexManager.getEntries === "function") {
      entries = storyLine.codexManager.getEntries("items");
    }
    return entries
      .filter((entry) => entry && entry.filePath && entry.name)
      .slice()
      .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { sensitivity: "base" }));
  }

  openStoryLineContextSubmenu(anchor, storyLine, kind, selectedText) {
    if (this.storyLineContextAnchorEl === anchor && this.storyLineContextSubmenuEl) {
      return;
    }
    this.closeStoryLineContextSubmenu();
    this.storyLineContextAnchorEl = anchor;

    const labels = {
      character: { singular: "Character", plural: "characters", createIcon: "user-round-plus", icon: "users" },
      location: { singular: "Location", plural: "locations", createIcon: "map-pin-plus-inside", icon: "map-pin" },
      item: { singular: "Item", plural: "items", createIcon: "package-plus", icon: "package" }
    };
    const label = labels[kind];
    const entries = this.getStoryLineContextEntries(storyLine, kind);
    const panel = document.body.createDiv({
      cls: "menu noveler-storyline-context-submenu",
      attr: { role: "menu", "aria-label": `${label.singular} options` }
    });
    const menuHost = this.storyLineContextMenu && this.storyLineContextMenu.dom;
    if (menuHost) {
      menuHost.addClass("noveler-storyline-context-menu-host");
      menuHost.appendChild(panel);
    }
    this.storyLineContextSubmenuEl = panel;
    panel.addEventListener("pointerenter", () => this.cancelStoryLineContextClose());
    panel.addEventListener("pointerleave", () => this.scheduleStoryLineContextClose());
    panel.addEventListener("pointerdown", (pointerEvent) => pointerEvent.stopPropagation());
    panel.addEventListener("mousedown", (mouseEvent) => mouseEvent.stopPropagation());
    panel.addEventListener("click", (clickEvent) => clickEvent.stopPropagation());

    const createButton = panel.createEl("button", {
      cls: "noveler-storyline-context-create",
      attr: { type: "button", role: "menuitem" }
    });
    const createIcon = createButton.createSpan({ cls: "noveler-storyline-context-icon" });
    setIcon(createIcon, label.createIcon);
    createButton.createSpan({ text: `New ${label.singular}` });
    createButton.addEventListener("click", async () => {
      this.hideStoryLineContextMenus();
      const entryName = await this.promptForStoryLineEntryName(kind, selectedText);
      if (entryName) {
        await this.createStoryLineCodexEntry(kind, entryName);
      }
    });

    const search = panel.createEl("input", {
      cls: "noveler-storyline-context-search",
      attr: {
        type: "search",
        placeholder: `Search ${label.plural}`,
        "aria-label": `Search ${label.plural}`
      }
    });
    const list = panel.createDiv({ cls: "noveler-storyline-context-list", attr: { role: "group" } });
    const renderEntries = () => {
      list.empty();
      const query = search.value.trim().toLocaleLowerCase();
      const filtered = entries.filter((entry) => {
        const searchable = [
          entry.name,
          ...this.splitStoryLineAliases(entry.nickname),
          ...this.splitStoryLineAliases(entry.aliases),
          ...(kind === "item" ? this.getStoryLineItemAliases(entry, storyLine) : [])
        ].join(" ").toLocaleLowerCase();
        return !query || searchable.includes(query);
      });
      if (!filtered.length) {
        list.createDiv({ cls: "noveler-storyline-context-empty", text: `No ${label.plural} found` });
        return;
      }
      for (const entry of filtered) {
        const entryButton = list.createEl("button", {
          cls: "noveler-storyline-context-entry",
          attr: { type: "button", role: "menuitem", title: String(entry.name) }
        });
        const entryIcon = entryButton.createSpan({ cls: "noveler-storyline-context-icon" });
        setIcon(entryIcon, label.icon);
        entryButton.createSpan({ cls: "noveler-storyline-context-entry-name", text: String(entry.name) });
        entryButton.addEventListener("click", async () => {
          this.hideStoryLineContextMenus();
          try {
            await this.addSelectedTextToStoryLineAliases(storyLine, kind, entry, selectedText);
            await this.navigateToStoryLineEntry(kind, entry);
          } catch (error) {
            console.error("Noveler could not update or open the StoryLine entry.", error);
            new Notice("Could not update or open the StoryLine entry.");
          }
        });
      }
    };
    search.addEventListener("input", renderEntries);
    renderEntries();
    this.positionStoryLineContextSubmenu(anchor, panel);
  }

  positionStoryLineContextSubmenu(anchor, panel) {
    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 4;
    let left = anchorRect.right + gap;
    if (left + panelRect.width > window.innerWidth - 8) {
      left = Math.max(8, anchorRect.left - panelRect.width - gap);
    }
    const top = Math.max(8, Math.min(anchorRect.top, window.innerHeight - panelRect.height - 8));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  scheduleStoryLineContextClose() {
    this.cancelStoryLineContextClose();
    this.storyLineContextCloseTimer = window.setTimeout(() => {
      this.storyLineContextCloseTimer = null;
      const panel = this.storyLineContextSubmenuEl;
      const activeElement = panel && panel.ownerDocument ? panel.ownerDocument.activeElement : null;
      if (panel && (panel.matches(":hover") || (activeElement && panel.contains(activeElement)))) {
        return;
      }
      this.closeStoryLineContextSubmenu();
    }, 180);
  }

  cancelStoryLineContextClose() {
    if (this.storyLineContextCloseTimer) {
      window.clearTimeout(this.storyLineContextCloseTimer);
      this.storyLineContextCloseTimer = null;
    }
  }

  closeStoryLineContextSubmenu() {
    this.cancelStoryLineContextClose();
    if (this.storyLineContextSubmenuEl) {
      this.storyLineContextSubmenuEl.remove();
      this.storyLineContextSubmenuEl = null;
    }
    this.storyLineContextAnchorEl = null;
  }

  hideStoryLineContextMenus() {
    this.closeStoryLineContextSubmenu();
    if (this.storyLineContextMenu && typeof this.storyLineContextMenu.hide === "function") {
      this.storyLineContextMenu.hide();
    }
    this.storyLineContextMenu = null;
  }

  promptForStoryLineEntryName(kind, selectedText) {
    const labels = { character: "Character", location: "Location", item: "Item" };
    const initialName = String(selectedText || "").replace(/\s+/g, " ").trim();
    return new Promise((resolve) => {
      const modal = new Modal(this.plugin.app);
      let settled = false;
      const finish = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
        modal.close();
      };
      modal.onOpen = () => {
        (modal.modalEl || modal.contentEl).addClass("noveler-entry-modal");
        modal.titleEl.setText(`New ${labels[kind]}`);
        let name = initialName;
        let createButton;
        const updateButton = () => {
          if (createButton) {
            createButton.setDisabled(!name || name.length > 120);
          }
        };
        new Setting(modal.contentEl)
          .setName("Name")
          .setDesc("This name is used for both the StoryLine entry and its Markdown filename.")
          .addText((text) => {
            text.setValue(initialName).setPlaceholder(`${labels[kind]} name`).onChange((value) => {
              name = value.replace(/\s+/g, " ").trim();
              updateButton();
            });
            text.inputEl.addEventListener("keydown", (keyEvent) => {
              if (keyEvent.key === "Enter" && name && name.length <= 120) {
                keyEvent.preventDefault();
                finish(name);
              }
            });
            window.setTimeout(() => {
              text.inputEl.focus();
              text.inputEl.select();
            }, 0);
          });
        new Setting(modal.contentEl)
          .addButton((button) => button.setButtonText("Cancel").onClick(() => finish(null)))
          .addButton((button) => {
            createButton = button;
            button.setButtonText("Create").setCta().onClick(() => finish(name));
            updateButton();
          });
      };
      modal.onClose = () => {
        modal.contentEl.empty();
        if (!settled) {
          settled = true;
          resolve(null);
        }
      };
      modal.open();
    });
  }

  async addSelectedTextToStoryLineAliases(storyLine, kind, entry, selectedText) {
    if ((kind !== "character" && kind !== "location") || !entry) {
      return false;
    }
    const alias = String(selectedText || "").replace(/\s+/g, " ").trim();
    if (!alias || alias.toLocaleLowerCase() === String(entry.name || "").trim().toLocaleLowerCase()) {
      return false;
    }
    const existingAliases = this.splitStoryLineAliases(entry.nickname);
    if (existingAliases.some((existing) => existing.toLocaleLowerCase() === alias.toLocaleLowerCase())) {
      return false;
    }

    const currentNickname = String(entry.nickname || "").trimEnd();
    const updatedEntry = {
      ...entry,
      nickname: currentNickname ? `${currentNickname}\n${alias}` : alias
    };
    if (kind === "character") {
      if (!storyLine.characterManager || typeof storyLine.characterManager.saveCharacter !== "function") {
        throw new Error("StoryLine character manager cannot save aliases");
      }
      await storyLine.characterManager.saveCharacter(updatedEntry);
    } else {
      if (!storyLine.locationManager || typeof storyLine.locationManager.saveLocation !== "function") {
        throw new Error("StoryLine location manager cannot save aliases");
      }
      await storyLine.locationManager.saveLocation(updatedEntry);
    }
    if (typeof storyLine.reloadEntities === "function") {
      await storyLine.reloadEntities();
    }
    if (typeof storyLine.refreshOpenViews === "function") {
      await storyLine.refreshOpenViews();
    }
    this.scheduleStoryLineVisualLinks();
    new Notice(`Added "${alias}" as an alias for "${entry.name}".`);
    return true;
  }

  getSelectedTextForStoryLineCodex() {
    const range = this.getSelectionRange() || this.lastRange;
    if (!range || range.collapsed) {
      return "";
    }
    return range.toString().replace(/\s+/g, " ").trim();
  }

  getStoryLinePluginForCodex() {
    const plugins = this.plugin.app.plugins;
    if (!plugins) {
      return null;
    }
    if (plugins.plugins && plugins.plugins.storyline) {
      return plugins.plugins.storyline;
    }
    return typeof plugins.getPlugin === "function" ? plugins.getPlugin("storyline") : null;
  }

  async createStoryLineAnnotation() {
    const range = this.lastRange && !this.lastRange.collapsed ? this.lastRange.cloneRange() : this.getSelectionRange();
    const state = this.captureEditorSelectionState(range);
    const selectedText = range ? range.toString() : "";
    if (!range || !state || !selectedText.trim()) {
      new Notice("Select manuscript text before creating an annotation.");
      return;
    }
    const scenePath = normalizeVaultPath(this.currentDocumentPath);
    const storyLine = this.getStoryLinePluginForCodex();
    if (!scenePath || !storyLine || !storyLine.sceneManager) {
      new Notice("Annotations require an active StoryLine scene.");
      return;
    }

    const fullRange = document.createRange();
    fullRange.selectNodeContents(this.editorEl);
    const documentText = fullRange.toString();
    const payload = {
      v: 1,
      s: state.start,
      e: state.end,
      q: selectedText,
      p: documentText.slice(Math.max(0, state.start - 72), state.start),
      x: documentText.slice(state.end, state.end + 72)
    };

    try {
      await this.saveDocument({ silent: true });
      if (typeof storyLine.sceneManager.initialize === "function") {
        await storyLine.sceneManager.initialize();
      }
      if (typeof storyLine.reloadEntities === "function") {
        await storyLine.reloadEntities();
      }
      const scene = typeof storyLine.sceneManager.getScene === "function"
        ? storyLine.sceneManager.getScene(scenePath)
        : null;
      if (!scene) {
        new Notice("The active file is not a StoryLine scene.");
        return;
      }
      if (typeof storyLine.sceneManager.getOrCreateSceneNotesFile !== "function") {
        throw new Error("StoryLine Scene Notes API is unavailable");
      }
      const notesPath = normalizeVaultPath(await storyLine.sceneManager.getOrCreateSceneNotesFile(scene));
      const notesFile = this.plugin.app.vault.getAbstractFileByPath(notesPath);
      if (!(notesFile instanceof TFile)) {
        throw new Error("StoryLine could not create the Scene Notes file");
      }

      const encoded = encodeAnnotationPayload(payload);
      const excerpt = selectedText.replace(/\s+/g, " ").trim().slice(0, 80).replace(/[|\]]/g, "/");
      const annotationLine = `- [[${scenePath}${ANNOTATION_LINK_MARKER}${encoded}|Annotation: ${excerpt}${selectedText.trim().length > 80 ? "..." : ""}]]`;
      let updatedContent = "";
      const appendAnnotation = (content) => {
        const current = String(content || "");
        const separator = current && !current.endsWith("\n") ? "\n" : "";
        updatedContent = `${current}${separator}${annotationLine}\n`;
        return updatedContent;
      };
      if (typeof this.plugin.app.vault.process === "function") {
        await this.plugin.app.vault.process(notesFile, appendAnnotation);
      } else {
        await this.plugin.app.vault.modify(notesFile, appendAnnotation(await this.plugin.app.vault.read(notesFile)));
      }
      this.refreshOpenSceneNotesEditors(notesPath, updatedContent);
      this.updateStatus("Annotation added to Scene Notes");
      new Notice("Annotation added to StoryLine Scene Notes.");
    } catch (error) {
      console.error("Noveler could not create the StoryLine annotation.", error);
      new Notice(`Could not create annotation: ${error.message || String(error)}`);
    }
  }

  refreshOpenSceneNotesEditors(notesPath, content) {
    const visited = new Set();
    const updateView = (view) => {
      if (!view || visited.has(view)) {
        return;
      }
      visited.add(view);
      const filePath = view.file && view.file.path ? normalizeVaultPath(view.file.path) : "";
      if (filePath === notesPath && view.editor && typeof view.editor.getValue === "function" && typeof view.editor.setValue === "function") {
        if (view.editor.getValue() !== content) {
          view.editor.setValue(content);
        }
      }
      if (normalizeVaultPath(view.currentNotesPath) === notesPath && view.editorLeaf && view.editorLeaf.view) {
        updateView(view.editorLeaf.view);
      }
    };
    if (this.plugin.app.workspace && typeof this.plugin.app.workspace.iterateAllLeaves === "function") {
      this.plugin.app.workspace.iterateAllLeaves((leaf) => updateView(leaf.view));
    }
  }

  createAnnotationRange(start, end) {
    if (!this.editorEl || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null;
    }
    const startPosition = this.getTextPosition(this.editorEl, start, "forward");
    const endPosition = this.getTextPosition(this.editorEl, end, "backward");
    if (!startPosition || !endPosition) {
      return null;
    }
    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    return range;
  }

  resolveAnnotationOffsets(payload, documentText) {
    const quote = String(payload && payload.q || "");
    const expectedStart = Math.max(0, Number(payload && payload.s) || 0);
    const expectedEnd = Math.max(expectedStart, Number(payload && payload.e) || expectedStart + quote.length);
    if (quote && documentText.slice(expectedStart, expectedEnd) === quote) {
      return { start: expectedStart, end: expectedEnd };
    }

    if (quote) {
      const candidates = [];
      let index = documentText.indexOf(quote);
      while (index >= 0) {
        const before = documentText.slice(Math.max(0, index - String(payload.p || "").length), index);
        const after = documentText.slice(index + quote.length, index + quote.length + String(payload.x || "").length);
        let score = -Math.abs(index - expectedStart);
        if (payload.p && before === payload.p) {
          score += 100000;
        }
        if (payload.x && after === payload.x) {
          score += 100000;
        }
        candidates.push({ start: index, end: index + quote.length, score });
        index = documentText.indexOf(quote, index + 1);
      }
      if (candidates.length) {
        candidates.sort((left, right) => right.score - left.score);
        return candidates[0];
      }
    }

    const prefix = String(payload && payload.p || "");
    const suffix = String(payload && payload.x || "");
    if (prefix && suffix) {
      const prefixIndex = documentText.lastIndexOf(prefix, Math.min(documentText.length, expectedStart + prefix.length + 500));
      if (prefixIndex >= 0) {
        const start = prefixIndex + prefix.length;
        const end = documentText.indexOf(suffix, start);
        if (end >= start && end - start <= Math.max(quote.length + 1000, 2000)) {
          return { start, end };
        }
      }
    }
    if (expectedEnd <= documentText.length && expectedEnd > expectedStart) {
      return { start: expectedStart, end: expectedEnd };
    }
    return null;
  }

  revealAnnotation(payload) {
    if (!this.editorEl || !payload) {
      return false;
    }
    if (this.paginationTimer) {
      window.clearTimeout(this.paginationTimer);
      this.paginationTimer = null;
      this.paginateEditor();
    }
    const fullRange = document.createRange();
    fullRange.selectNodeContents(this.editorEl);
    const documentText = fullRange.toString();
    const offsets = this.resolveAnnotationOffsets(payload, documentText);
    const range = offsets && this.createAnnotationRange(offsets.start, offsets.end);
    if (!range) {
      return false;
    }

    this.clearAnnotationHighlight();
    this.annotationHighlightRange = range.cloneRange();
    if (typeof CSS !== "undefined" && CSS.highlights && typeof Highlight !== "undefined") {
      CSS.highlights.set("noveler-annotation-highlight", new Highlight(this.annotationHighlightRange));
    }
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      this.captureSelection();
    }
    this.editorEl.focus({ preventScroll: true });
    window.requestAnimationFrame(() => this.scrollAnnotationIntoView(range));
    return true;
  }

  scrollAnnotationIntoView(range) {
    if (!range || !this.workAreaEl) {
      return;
    }
    const rect = Array.from(range.getClientRects()).find((candidate) => candidate.width || candidate.height)
      || range.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const viewport = this.workAreaEl.getBoundingClientRect();
    const top = this.workAreaEl.scrollTop + rect.top + rect.height / 2 - viewport.top - viewport.height / 2;
    const left = this.workAreaEl.scrollLeft + rect.left + rect.width / 2 - viewport.left - viewport.width / 2;
    this.workAreaEl.scrollTo({
      top: Math.max(0, top),
      left: Math.max(0, left),
      behavior: "smooth"
    });
  }

  clearAnnotationHighlight() {
    this.annotationHighlightRange = null;
    if (typeof CSS !== "undefined" && CSS.highlights) {
      CSS.highlights.delete("noveler-annotation-highlight");
    }
  }

  async createStoryLineCodexEntry(kind, selectedText) {
    const name = String(selectedText || "").replace(/\s+/g, " ").trim();
    if (!name) {
      new Notice("Select a name in the manuscript first.");
      return;
    }
    if (name.length > 120) {
      new Notice("StoryLine Codex names must be 120 characters or fewer.");
      return;
    }

    const storyLine = this.getStoryLinePluginForCodex();
    if (!storyLine || !storyLine.sceneManager) {
      new Notice("Enable StoryLine before creating Codex entries.");
      return;
    }

    try {
      if (typeof storyLine.sceneManager.initialize === "function") {
        await storyLine.sceneManager.initialize();
      }
      if (!storyLine.sceneManager.activeProject) {
        new Notice("Open a StoryLine project before creating Codex entries.");
        return;
      }

      if (kind === "item") {
        const enabledCategories = Array.isArray(storyLine.settings && storyLine.settings.codexEnabledCategories)
          ? storyLine.settings.codexEnabledCategories
          : [];
        if (!enabledCategories.includes("items")) {
          storyLine.settings.codexEnabledCategories = [...enabledCategories, "items"];
          if (typeof storyLine.saveSettings === "function") {
            await storyLine.saveSettings();
          }
        }
      }

      if (typeof storyLine.reloadEntities === "function") {
        await storyLine.reloadEntities();
      }

      let entry;
      if (kind === "character") {
        if (!storyLine.characterManager || typeof storyLine.characterManager.createCharacter !== "function") {
          throw new Error("StoryLine character manager is unavailable");
        }
        entry = await storyLine.characterManager.createCharacter(storyLine.sceneManager.getCharacterFolder(), name);
      } else if (kind === "location") {
        if (!storyLine.locationManager || typeof storyLine.locationManager.createLocation !== "function") {
          throw new Error("StoryLine location manager is unavailable");
        }
        entry = await storyLine.locationManager.createLocation(storyLine.sceneManager.getLocationFolder(), name);
      } else {
        if (!storyLine.codexManager || typeof storyLine.codexManager.createEntry !== "function") {
          throw new Error("StoryLine Codex manager is unavailable");
        }
        entry = await storyLine.codexManager.createEntry(storyLine.sceneManager.getCodexFolder(), "items", name);
      }

      if (typeof storyLine.reloadEntities === "function") {
        await storyLine.reloadEntities();
      }
      if (typeof storyLine.refreshOpenViews === "function") {
        await storyLine.refreshOpenViews();
      }
      await this.navigateToStoryLineEntry(kind, entry, { onlyExisting: true });
      this.scheduleStoryLineVisualLinks();
      const label = kind === "item" ? "Item" : kind.charAt(0).toUpperCase() + kind.slice(1);
      new Notice(`${label} "${name}" created in StoryLine.`);
      return entry;
    } catch (error) {
      console.error("Noveler could not create the StoryLine Codex entry.", error);
      new Notice(`Could not create StoryLine ${kind}: ${error.message || String(error)}`);
      return null;
    }
  }

  getStoryLineLeaves(storyLine) {
    const leaves = [];
    const addLeaf = (leaf) => {
      if (!leaf || leaves.includes(leaf) || !leaf.view) {
        return;
      }
      const viewType = typeof leaf.view.getViewType === "function" ? leaf.view.getViewType() : "";
      if (leaf.view.plugin === storyLine || String(viewType).startsWith("story-line-")) {
        leaves.push(leaf);
      }
    };
    if (this.plugin.app.workspace && typeof this.plugin.app.workspace.iterateAllLeaves === "function") {
      this.plugin.app.workspace.iterateAllLeaves(addLeaf);
    }
    const preferredLeaf = storyLine && storyLine.storyLeaf;
    const preferredIndex = leaves.indexOf(preferredLeaf);
    if (preferredIndex > 0) {
      leaves.splice(preferredIndex, 1);
      leaves.unshift(preferredLeaf);
    }
    return leaves;
  }

  async navigateToStoryLineEntry(kind, entry, options = {}) {
    const storyLine = this.getStoryLinePluginForCodex();
    const filePath = normalizeVaultPath(entry && entry.filePath);
    if (!storyLine || !filePath) {
      return false;
    }

    const viewType = kind === "character"
      ? "story-line-character"
      : kind === "location"
        ? "story-line-location"
        : "story-line-codex";
    const leaves = this.getStoryLineLeaves(storyLine);
    let leaf = leaves.find((candidate) => candidate.view.getViewType() === viewType) || leaves[0];
    if (!leaf && !options.onlyExisting) {
      leaf = this.plugin.app.workspace.getLeaf(true);
    }
    if (!leaf) {
      return false;
    }

    if (!leaf.view || leaf.view.getViewType() !== viewType) {
      await leaf.setViewState({ type: viewType, active: true, state: {} });
    }
    const view = leaf.view;
    if (kind === "character") {
      view.selectedCharacter = filePath;
      if (view.rootContainer && typeof view.renderView === "function") {
        view.renderView(view.rootContainer);
      }
    } else if (kind === "location") {
      view.selectedItem = filePath;
      if (view.rootContainer && typeof view.renderView === "function") {
        view.renderView(view.rootContainer);
      }
    } else if (typeof view.navigateToEntry === "function") {
      await view.navigateToEntry(filePath);
    } else {
      view.activeCategory = "items";
      view.selectedEntry = filePath;
      if (view.rootContainer && typeof view.renderView === "function") {
        view.renderView(view.rootContainer);
      }
    }
    if (typeof this.plugin.app.workspace.revealLeaf === "function") {
      await this.plugin.app.workspace.revealLeaf(leaf);
    }
    return true;
  }

  registerStoryLineEntityLinkUpdates() {
    const vault = this.plugin.app && this.plugin.app.vault;
    if (!vault || typeof vault.on !== "function" || typeof this.registerEvent !== "function") {
      return;
    }
    const handleEntityChange = (file, oldPath) => {
      const currentPath = file && file.path ? file.path : "";
      if (this.isStoryLineEntityPath(currentPath) || this.isStoryLineEntityPath(oldPath)) {
        this.scheduleStoryLineEntityReload();
      }
    };
    this.registerEvent(vault.on("modify", handleEntityChange));
    this.registerEvent(vault.on("create", handleEntityChange));
    this.registerEvent(vault.on("delete", handleEntityChange));
    this.registerEvent(vault.on("rename", handleEntityChange));
  }

  isStoryLineEntityPath(path) {
    const vaultPath = normalizeVaultPath(path);
    const storyLine = this.getStoryLinePluginForCodex();
    if (!vaultPath || !storyLine || !storyLine.sceneManager) {
      return false;
    }
    const folderGetters = ["getCharacterFolder", "getLocationFolder", "getCodexFolder"];
    for (const getterName of folderGetters) {
      try {
        const folder = typeof storyLine.sceneManager[getterName] === "function"
          ? normalizeVaultPath(storyLine.sceneManager[getterName]())
          : "";
        if (folder && (vaultPath === folder || vaultPath.startsWith(`${folder}/`))) {
          return true;
        }
      } catch (error) {
        // StoryLine may not have an active project while its workspace is initializing.
      }
    }
    return false;
  }

  scheduleStoryLineEntityReload() {
    if (this.storyLineEntityRefreshTimer) {
      window.clearTimeout(this.storyLineEntityRefreshTimer);
    }
    this.storyLineEntityRefreshTimer = window.setTimeout(async () => {
      this.storyLineEntityRefreshTimer = null;
      const storyLine = this.getStoryLinePluginForCodex();
      try {
        if (storyLine && typeof storyLine.reloadEntities === "function") {
          await storyLine.reloadEntities();
        }
        this.scheduleStoryLineVisualLinks();
      } catch (error) {
        console.warn("Noveler could not refresh StoryLine links after an entity change.", error);
      }
    }, 250);
  }

  async toggleStoryLineVisualLinks(kind) {
    const bridge = this.plugin.settings.storyLineBridge;
    if (!bridge.visualLinkCategories || typeof bridge.visualLinkCategories !== "object") {
      bridge.visualLinkCategories = clone(DEFAULT_SETTINGS.storyLineBridge.visualLinkCategories);
    }
    bridge.visualLinkCategories[kind] = bridge.visualLinkCategories[kind] === false;
    bridge.visualLinks = Object.values(bridge.visualLinkCategories).some((enabled) => enabled !== false);
    const settingDraft = this.plugin.settingTab && this.plugin.settingTab.draftSettings;
    if (settingDraft && settingDraft.storyLineBridge) {
      settingDraft.storyLineBridge.visualLinkCategories = clone(bridge.visualLinkCategories);
      settingDraft.storyLineBridge.visualLinks = bridge.visualLinks;
    }
    await this.plugin.saveSettings();
    this.buildStatusControls();
    this.scheduleStoryLineVisualLinks();
  }

  scheduleStoryLineVisualLinks() {
    if (this.storyLineLinkFrame) {
      window.cancelAnimationFrame(this.storyLineLinkFrame);
    }
    this.storyLineLinkFrame = window.requestAnimationFrame(() => {
      this.storyLineLinkFrame = 0;
      this.updateStoryLineVisualLinks();
    });
  }

  clearStoryLineVisualLinks() {
    this.storyLineLinkRanges = [];
    if (typeof CSS !== "undefined" && CSS.highlights) {
      CSS.highlights.delete("noveler-storyline-character-links");
      CSS.highlights.delete("noveler-storyline-location-links");
      CSS.highlights.delete("noveler-storyline-item-links");
    }
    if (this.editorEl) {
      this.editorEl.removeClass("has-storyline-links");
      this.clearStoryLineLinkHover();
    }
  }

  splitStoryLineAliases(value) {
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.splitStoryLineAliases(item));
    }
    return String(value || "").split(/[,;\r\n]+/).map((alias) => alias.trim()).filter(Boolean);
  }

  isStoryLineAliasFieldKey(key) {
    const normalized = String(key || "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
    return normalized === "nickname"
      || normalized === "alias"
      || normalized === "aliases"
      || normalized.endsWith("nicknamealias")
      || normalized.endsWith("nicknamealiases");
  }

  getStoryLineItemAliases(entry, storyLine) {
    const aliases = [];
    const collect = (source) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        return;
      }
      for (const [key, value] of Object.entries(source)) {
        if (this.isStoryLineAliasFieldKey(key)) {
          aliases.push(...this.splitStoryLineAliases(value));
        }
      }
    };
    collect(entry);
    collect(entry && entry.custom);
    collect(entry && entry.universalFields);
    const fieldTemplates = storyLine
      && storyLine.fieldTemplates
      && typeof storyLine.fieldTemplates.getAll === "function"
      ? storyLine.fieldTemplates.getAll()
      : [];
    for (const template of fieldTemplates) {
      if (
        !template
        || (template.category && template.category !== "items")
        || (!this.isStoryLineAliasFieldKey(template.label) && !this.isStoryLineAliasFieldKey(template.topLevelKey))
      ) {
        continue;
      }
      if (entry && entry.universalFields && template.id) {
        aliases.push(...this.splitStoryLineAliases(entry.universalFields[template.id]));
      }
      if (entry && template.topLevelKey) {
        aliases.push(...this.splitStoryLineAliases(entry[template.topLevelKey]));
      }
    }
    return Array.from(new Map(aliases.map((alias) => [alias.toLocaleLowerCase(), alias])).values());
  }

  getStoryLineLinkTargets(storyLine) {
    const targetsByAlias = new Map();
    const ambiguous = new Set();
    const addTarget = (alias, kind, entry) => {
      const label = String(alias || "").replace(/\s+/g, " ").trim();
      const filePath = normalizeVaultPath(entry && entry.filePath);
      if (label.length < 2 || !filePath) {
        return;
      }
      const key = label.toLocaleLowerCase();
      const existing = targetsByAlias.get(key);
      if (existing && existing.filePath !== filePath) {
        ambiguous.add(key);
        targetsByAlias.delete(key);
        return;
      }
      if (!ambiguous.has(key)) {
        targetsByAlias.set(key, { alias: label, kind, filePath });
      }
    };

    const characters = storyLine.characterManager && typeof storyLine.characterManager.getAllCharacters === "function"
      ? storyLine.characterManager.getAllCharacters()
      : [];
    const charactersByName = new Map(characters.map((entry) => [String(entry.name || "").toLocaleLowerCase(), entry]));
    const firstWordCounts = new Map();
    const lastWordCounts = new Map();
    const characterNameParts = new Map();
    for (const entry of characters) {
      const parts = String(entry.name || "").trim().split(/\s+/).filter(Boolean);
      characterNameParts.set(entry.filePath, parts);
      if (!parts.length) {
        continue;
      }
      const firstKey = parts[0].toLocaleLowerCase();
      const lastKey = parts[parts.length - 1].toLocaleLowerCase();
      firstWordCounts.set(firstKey, (firstWordCounts.get(firstKey) || 0) + 1);
      lastWordCounts.set(lastKey, (lastWordCounts.get(lastKey) || 0) + 1);
    }
    for (const entry of characters) {
      addTarget(entry.name, "character", entry);
      const parts = characterNameParts.get(entry.filePath) || [];
      if (parts.length > 1) {
        addTarget(`${parts[0]} ${parts[parts.length - 1]}`, "character", entry);
      }
      if (parts.length && firstWordCounts.get(parts[0].toLocaleLowerCase()) === 1) {
        addTarget(parts[0], "character", entry);
      }
      if (parts.length > 1 && lastWordCounts.get(parts[parts.length - 1].toLocaleLowerCase()) === 1) {
        addTarget(parts[parts.length - 1], "character", entry);
      }
      for (const alias of [
        ...this.splitStoryLineAliases(entry.nickname),
        ...this.splitStoryLineAliases(entry.aliases)
      ]) {
        addTarget(alias, "character", entry);
      }
    }
    if (storyLine.characterManager && typeof storyLine.characterManager.buildAliasMap === "function") {
      const aliasMap = storyLine.characterManager.buildAliasMap(storyLine.settings && storyLine.settings.characterAliases);
      for (const [alias, canonicalName] of aliasMap) {
        addTarget(alias, "character", charactersByName.get(String(canonicalName || "").toLocaleLowerCase()));
      }
    }

    const locations = storyLine.locationManager && typeof storyLine.locationManager.getAllLocations === "function"
      ? storyLine.locationManager.getAllLocations()
      : [];
    for (const entry of locations) {
      addTarget(entry.name, "location", entry);
      for (const alias of [
        ...this.splitStoryLineAliases(entry.nickname),
        ...this.splitStoryLineAliases(entry.aliases)
      ]) {
        addTarget(alias, "location", entry);
      }
    }

    const items = storyLine.codexManager && typeof storyLine.codexManager.getEntries === "function"
      ? storyLine.codexManager.getEntries("items")
      : [];
    for (const entry of items) {
      addTarget(entry.name, "item", entry);
      for (const alias of this.getStoryLineItemAliases(entry, storyLine)) {
        addTarget(alias, "item", entry);
      }
    }
    return Array.from(targetsByAlias.values()).sort((left, right) => right.alias.length - left.alias.length);
  }

  isStoryLineWordCharacter(character) {
    return !!character && /[\p{L}\p{N}_]/u.test(character);
  }

  updateStoryLineVisualLinks() {
    this.clearStoryLineVisualLinks();
    if (!this.editorEl) {
      return;
    }
    const bridge = this.plugin.settings.storyLineBridge;
    const categories = bridge.visualLinkCategories || DEFAULT_SETTINGS.storyLineBridge.visualLinkCategories;
    const colors = bridge.visualLinkColors || DEFAULT_SETTINGS.storyLineBridge.visualLinkColors;
    this.editorEl.style.setProperty("--noveler-storyline-character-link-color", normalizeHexColor(colors.character));
    this.editorEl.style.setProperty("--noveler-storyline-location-link-color", normalizeHexColor(colors.location));
    this.editorEl.style.setProperty("--noveler-storyline-item-link-color", normalizeHexColor(colors.item));
    if (!Object.values(categories).some((enabled) => enabled !== false)) {
      return;
    }
    const storyLine = this.getStoryLinePluginForCodex();
    if (!storyLine || typeof CSS === "undefined" || !CSS.highlights || typeof Highlight === "undefined") {
      return;
    }
    const targets = this.getStoryLineLinkTargets(storyLine).filter((target) => categories[target.kind] !== false);
    if (!targets.length) {
      return;
    }

    const ranges = [];
    const walker = document.createTreeWalker(this.editorEl, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue || "";
      const lowerText = text.toLocaleLowerCase();
      const occupied = new Uint8Array(text.length);
      for (const target of targets) {
        const needle = target.alias.toLocaleLowerCase();
        let offset = lowerText.indexOf(needle);
        while (offset !== -1) {
          const end = offset + needle.length;
          const hasOverlap = occupied.subarray(offset, end).some((value) => value !== 0);
          const validStart = !this.isStoryLineWordCharacter(text[offset - 1]) || !this.isStoryLineWordCharacter(text[offset]);
          const validEnd = !this.isStoryLineWordCharacter(text[end - 1]) || !this.isStoryLineWordCharacter(text[end]);
          if (!hasOverlap && validStart && validEnd) {
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, end);
            occupied.fill(1, offset, end);
            ranges.push({ range, kind: target.kind, filePath: target.filePath });
          }
          offset = lowerText.indexOf(needle, offset + Math.max(1, needle.length));
        }
      }
    }
    if (!ranges.length) {
      return;
    }
    this.storyLineLinkRanges = ranges;
    for (const kind of ["character", "location", "item"]) {
      const categoryRanges = ranges.filter((item) => item.kind === kind).map((item) => item.range);
      if (categoryRanges.length) {
        CSS.highlights.set(`noveler-storyline-${kind}-links`, new Highlight(...categoryRanges));
      }
    }
    this.editorEl.addClass("has-storyline-links");
  }

  getStoryLineLinkAtPoint(x, y) {
    return this.storyLineLinkRanges.find((item) => Array.from(item.range.getClientRects()).some((rect) => (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    ))) || null;
  }

  updateStoryLineLinkHover(event) {
    if (!this.editorEl) {
      return;
    }
    this.storyLineHoverPoint = { x: event.clientX, y: event.clientY };
    if (this.storyLineHoverFrame) {
      return;
    }
    this.storyLineHoverFrame = window.requestAnimationFrame(() => {
      this.storyLineHoverFrame = 0;
      const point = this.storyLineHoverPoint;
      this.editorEl.toggleClass("is-storyline-link-hovered", !!(point && this.getStoryLineLinkAtPoint(point.x, point.y)));
    });
  }

  clearStoryLineLinkHover() {
    this.storyLineHoverPoint = null;
    if (this.storyLineHoverFrame) {
      window.cancelAnimationFrame(this.storyLineHoverFrame);
      this.storyLineHoverFrame = 0;
    }
    if (this.editorEl) {
      this.editorEl.removeClass("is-storyline-link-hovered");
    }
  }

  openStoryLineLinkAtPoint(event) {
    if (!this.storyLineLinkRanges.length) {
      return false;
    }
    const link = this.getStoryLineLinkAtPoint(event.clientX, event.clientY);
    if (!link) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    this.navigateToStoryLineEntry(link.kind, { filePath: link.filePath }).catch((error) => {
      console.error("Noveler could not open the StoryLine entry.", error);
      new Notice("Could not open the StoryLine entry.");
    });
    return true;
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

  escapeMarkdownText(value) {
    return String(value || "")
      .replace(/([\\`*_[\]~#<>])/g, "\\$1")
      .replace(/(^|\n)(\s*)(-{3,})(?=\s*(?:\n|$))/g, "$1$2\\$3")
      .replace(/(^|\n)(\s*)([-+])(?=\s)/g, "$1$2\\$3")
      .replace(/(^|\n)(\s*)(\d+)\.(?=\s)/g, "$1$2$3\\.");
  }

  wrapMarkdownInline(value, marker) {
    const content = String(value || "");
    const leading = content.match(/^\s*/)[0];
    const trailing = content.match(/\s*$/)[0];
    const end = Math.max(leading.length, content.length - trailing.length);
    const core = content.slice(leading.length, end);
    return core ? `${leading}${marker}${core}${marker}${trailing}` : content;
  }

  nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.escapeMarkdownText(node.textContent || "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node;
    const tag = element.tagName.toLowerCase();
    if (element.hasClass("noveler-page") || element.hasClass("noveler-pagination-marker")) {
      return "";
    }
    const content = this.childrenToMarkdown(element);
    const blockContent = content.trim();

    if (/^h[1-6]$/.test(tag)) {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-"))) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return `${"#".repeat(Number(tag.charAt(1)))} ${blockContent}`;
    }
    if (tag === "p") {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-") && name !== "noveler-style-normal")) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return blockContent;
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
      return this.wrapMarkdownInline(content, "**");
    }
    if (tag === "em" || tag === "i") {
      return this.wrapMarkdownInline(content, "*");
    }
    if (tag === "s" || tag === "strike") {
      return this.wrapMarkdownInline(content, "~~");
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
      return blockContent.split("\n").map((line) => `> ${line}`).join("\n");
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
      return blockContent;
    }
    if (element.hasClass("noveler-scene-break")) {
      if (element.hasClass("is-centered")) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return blockContent || this.plugin.settings.sceneBreakGlyph;
    }
    if (tag === "div") {
      if (element.getAttribute("style") || Array.from(element.classList).some((name) => name.startsWith("noveler-"))) {
        return sanitizeEditorHtml(element.outerHTML);
      }
      return blockContent;
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
    containerEl.addClass("noveler-settings");
    if (!this.draftSettings) {
      this.draftSettings = clone(this.plugin.settings);
      this.draftSettings.typography = clone(this.plugin.globalTypography || this.plugin.settings.typography);
    }
    const draft = this.draftSettings;
    draft.headingStyles = draft.headingStyles && typeof draft.headingStyles === "object"
      ? draft.headingStyles
      : clone(DEFAULT_SETTINGS.headingStyles);
    draft.typography = Object.assign(clone(DEFAULT_SETTINGS.typography), draft.typography || {});
    draft.focus = draft.focus && typeof draft.focus === "object" ? draft.focus : clone(DEFAULT_SETTINGS.focus);
    draft.integrations = draft.integrations && typeof draft.integrations === "object" ? draft.integrations : {};
    draft.export = draft.export && typeof draft.export === "object" ? draft.export : clone(DEFAULT_SETTINGS.export);
    draft.export.epubLanguage = normalizeEpubLanguage(draft.export.epubLanguage);
    draft.storyLineBridge = draft.storyLineBridge && typeof draft.storyLineBridge === "object"
      ? draft.storyLineBridge
      : clone(DEFAULT_SETTINGS.storyLineBridge);
    draft.storyLineBridge.visualLinkColors = draft.storyLineBridge.visualLinkColors && typeof draft.storyLineBridge.visualLinkColors === "object"
      ? draft.storyLineBridge.visualLinkColors
      : clone(DEFAULT_SETTINGS.storyLineBridge.visualLinkColors);
    this.enforceRequiredIntegrations(draft);

    const header = containerEl.createDiv({ cls: "noveler-settings-header" });
    const headerIcon = header.createDiv({ cls: "noveler-settings-header-icon" });
    setIcon(headerIcon, "book-open-text");
    const headerText = header.createDiv();
    headerText.createEl("h2", { text: "Noveler" });
    headerText.createEl("p", { text: "Writing environment, page presentation, and StoryLine workflow." });
    const languageControl = header.createDiv({ cls: "noveler-settings-language" });
    languageControl.createEl("label", { text: "Language", attr: { for: "noveler-language-select" } });
    const languageSelect = languageControl.createEl("select", {
      attr: { id: "noveler-language-select", "aria-label": "Plugin language" }
    });
    const locales = this.plugin.localization ? this.plugin.localization.locales : [];
    for (const locale of locales) {
      languageSelect.createEl("option", { text: locale.name, value: locale.locale });
    }
    languageSelect.value = this.plugin.localization ? this.plugin.localization.locale : DEFAULT_LOCALE;
    languageSelect.addEventListener("change", async () => {
      languageSelect.disabled = true;
      try {
        const selected = await this.plugin.changeLanguage(languageSelect.value);
        draft.language = selected;
        this.display();
      } finally {
        languageSelect.disabled = false;
      }
    });

    const editorSection = this.createSettingsSection(containerEl, {
      title: "Editor",
      description: "Manuscript defaults, page presentation, and plugin availability",
      icon: "panel-top",
      accent: "#3b82f6",
      open: true
    });
    this.attachSectionUndo(editorSection, draft, ["layout", "typography"], "Editor");
    const integrationGrid = editorSection.createDiv({ cls: "noveler-integration-grid" });
    this.addPluginStatusCard(integrationGrid, ["storyline"], "StoryLine", "library");
    this.addPluginStatusCard(
      integrationGrid,
      ["antidote-grammar-checker-integration", "aantidote-grammar-checker-integration"],
      "Antidote",
      "spell-check-2",
      ["Antidote Grammar Checker Integration"]
    );

    const editorGrid = editorSection.createDiv({ cls: "noveler-settings-grid noveler-editor-settings-grid" });
    new Setting(editorGrid)
      .setName("Opening mode")
      .setDesc("The layout used when Noveler opens.")
      .addDropdown((dropdown) => dropdown
        .addOption("page", "Page")
        .addOption("focus", "Focus")
        .setValue(draft.layout.mode === "focus" ? "focus" : "page")
        .onChange((value) => {
          draft.layout.mode = value === "focus" ? "focus" : "page";
        }));
    new Setting(editorGrid)
      .setName("Measurement system")
      .setDesc("Used by rulers and margin controls.")
      .addDropdown((dropdown) => dropdown
        .addOption("imperial", "Imperial")
        .addOption("metric", "Metric")
        .setValue(draft.layout.rulerUnits === "metric" ? "metric" : "imperial")
        .onChange((value) => {
          draft.layout.rulerUnits = value === "metric" ? "metric" : "imperial";
          this.display();
        }));
    new Setting(editorGrid)
      .setName("Default manuscript font")
      .setDesc("Font used when a scene has no saved typography.")
      .addDropdown((dropdown) => {
        const selectedFont = getSelectedFontFamily(draft.typography);
        for (const [value, label] of this.getSettingsFontOptions(selectedFont)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(selectedFont).onChange((value) => {
          draft.typography.fontPreset = "custom";
          draft.typography.customFontFamily = value || DEFAULT_SETTINGS.typography.customFontFamily;
        });
      });
    new Setting(editorGrid)
      .setName("Default manuscript font size")
      .setDesc("Point size used when a scene has no saved typography.")
      .addText((text) => {
        text.setValue(String(draft.typography.fontSize || DEFAULT_SETTINGS.typography.fontSize));
        text.inputEl.type = "number";
        text.inputEl.min = "6";
        text.inputEl.max = "96";
        text.inputEl.step = "0.5";
        text.inputEl.addEventListener("input", () => {
          const value = Number(text.inputEl.value);
          if (Number.isFinite(value)) {
            draft.typography.fontSize = Math.max(6, Math.min(96, value));
          }
        });
      });
    new Setting(editorGrid)
      .setName("Page format")
      .setDesc("Physical dimensions used in Page mode.")
      .addDropdown((dropdown) => {
        for (const [value, label] of getPagePresetOptions()) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(PAGE_SIZE_PRESETS[draft.layout.pageSize] ? draft.layout.pageSize : "custom").onChange((value) => {
          const preset = PAGE_SIZE_PRESETS[value];
          if (preset) {
            draft.layout.pageSize = value;
            draft.layout.pageWidth = cmToPx(preset.widthCm);
            draft.layout.pageHeight = cmToPx(preset.heightCm);
            this.display();
          }
        });
      });
    new Setting(editorGrid)
      .setName("Page zoom")
      .setDesc("Default magnification in Page mode.")
      .addDropdown((dropdown) => {
        for (const [value, label] of getZoomOptions(draft.layout.pageZoom)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(String(draft.layout.pageZoom || DEFAULT_SETTINGS.layout.pageZoom)).onChange((value) => {
          draft.layout.pageZoom = Number(value) || DEFAULT_SETTINGS.layout.pageZoom;
        });
      });
    new Setting(editorGrid)
      .setName("Header and footer size")
      .setDesc("Visual text size in points.")
      .addText((text) => {
        text.setValue(String(draft.layout.headerFooterFontSize || DEFAULT_SETTINGS.layout.headerFooterFontSize));
        text.inputEl.type = "number";
        text.inputEl.min = "6";
        text.inputEl.max = "36";
        text.inputEl.addEventListener("input", () => {
          const value = Number(text.inputEl.value);
          if (Number.isFinite(value)) {
            draft.layout.headerFooterFontSize = Math.max(6, Math.min(36, value));
          }
        });
      });
    this.addMarginEditor(editorSection, draft);

    const focusSection = this.createSettingsSection(containerEl, {
      title: "Focus mode",
      description: "Distraction-free writing behavior",
      icon: "scan-line",
      accent: "#8b5cf6"
    });
    this.attachSectionUndo(focusSection, draft, "focus", "Focus mode");
    const focusGrid = focusSection.createDiv({ cls: "noveler-settings-grid" });
    new Setting(focusGrid)
      .setName("Default zoom")
      .setDesc("Magnification used in Focus mode.")
      .addDropdown((dropdown) => {
        for (const [value, label] of getZoomOptions(draft.focus.defaultZoom)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(String(draft.focus.defaultZoom || DEFAULT_SETTINGS.focus.defaultZoom)).onChange((value) => {
          draft.focus.defaultZoom = Number(value) || DEFAULT_SETTINGS.focus.defaultZoom;
        });
      });
    new Setting(focusGrid)
      .setName("Typewriter mode")
      .setDesc("Keep the active writing position centered.")
      .addToggle((toggle) => toggle.setValue(draft.focus.typewriter !== false).onChange((value) => {
        draft.focus.typewriter = value;
      }));
    new Setting(focusGrid)
      .setName("Focus target")
      .setDesc("Emphasize the current visual line or paragraph.")
      .addDropdown((dropdown) => dropdown
        .addOption("line", "Current line")
        .addOption("paragraph", "Current paragraph")
        .setValue(draft.focus.highlightScope === "paragraph" ? "paragraph" : "line")
        .onChange((value) => {
          draft.focus.highlightScope = value === "paragraph" ? "paragraph" : "line";
        }));
    new Setting(focusGrid)
      .setName("Dim surrounding text")
      .setDesc("Reduce the opacity outside the focus target.")
      .addToggle((toggle) => toggle.setValue(draft.focus.dimUnfocusedLines !== false).onChange((value) => {
        draft.focus.dimUnfocusedLines = value;
      }));

    const headingSection = this.createSettingsSection(containerEl, {
      title: "Heading styles",
      description: "Typography presets for manuscript headings",
      icon: "heading",
      accent: "#ec4899"
    });
    this.attachSectionUndo(headingSection, draft, "headingStyles", "Heading styles");
    const headingList = headingSection.createDiv({ cls: "noveler-heading-style-list" });
    for (let level = 1; level <= 6; level += 1) {
      this.addModernHeadingStyle(headingList, draft, level);
    }

    const editingSection = this.createSettingsSection(containerEl, {
      title: "Editing",
      description: "Typing assistance and save-time normalization",
      icon: "text-cursor-input",
      accent: "#10b981"
    });
    this.attachSectionUndo(editingSection, draft, "automation", "Editing");
    const editingGrid = editingSection.createDiv({ cls: "noveler-settings-grid" });
    const editingOptions = [
      ["Smart quotes", "Convert straight quotes while typing.", "smartQuotes"],
      ["Smart dashes", "Convert repeated hyphens into manuscript dashes.", "smartDashes"],
      ["Auto-capitalization", "Capitalize after sentence-ending punctuation.", "autoCapitalize"],
      ["Smart indenting", "Carry paragraph styling into the next paragraph.", "smartIndent"],
      ["Remove double spaces on save", "Collapse repeated spaces in saved output.", "removeDoubleSpacesOnSave"],
      ["Normalize line breaks on save", "Limit repeated blank paragraphs in saved output.", "normalizeLineBreaksOnSave"]
    ];
    for (const [name, description, key] of editingOptions) {
      new Setting(editingGrid)
        .setName(name)
        .setDesc(description)
        .addToggle((toggle) => toggle.setValue(draft.automation[key] !== false).onChange((value) => {
          draft.automation[key] = value;
        }));
    }

    const storyLineSection = this.createSettingsSection(containerEl, {
      title: "StoryLine",
      description: "Scene routing, manuscript integration, and Codex link colors",
      icon: "library",
      accent: "#f59e0b"
    });
    this.attachSectionUndo(storyLineSection, draft, "storyLineBridge", "StoryLine");
    new Setting(storyLineSection)
      .setName("StoryLine root folder")
      .setDesc("The vault folder containing StoryLine projects.")
      .addText((text) => text
        .setPlaceholder("StoryLine")
        .setValue(draft.storyLineBridge.storyLineRoot || "StoryLine")
        .onChange((value) => {
          draft.storyLineBridge.storyLineRoot = normalizeVaultPath(value) || "StoryLine";
        }));
    const routingGrid = storyLineSection.createDiv({ cls: "noveler-settings-grid" });
    new Setting(routingGrid)
      .setName("Open scenes in Noveler")
      .setDesc("Replace Obsidian's Markdown editor for StoryLine scenes.")
      .addToggle((toggle) => toggle.setValue(draft.storyLineBridge.replaceStoryLineSceneOpens !== false).onChange((value) => {
        draft.storyLineBridge.replaceStoryLineSceneOpens = value;
      }));
    new Setting(routingGrid)
      .setName("Use Noveler in Manuscript")
      .setDesc("Embed Noveler in StoryLine's Manuscript tab.")
      .addToggle((toggle) => toggle.setValue(draft.storyLineBridge.replaceManuscriptView !== false).onChange((value) => {
        draft.storyLineBridge.replaceManuscriptView = value;
      }));
    const linkColorGrid = storyLineSection.createDiv({ cls: "noveler-link-color-grid" });
    for (const [kind, label, icon] of [
      ["character", "Characters", "users"],
      ["location", "Locations", "map-pin"],
      ["item", "Items", "package"]
    ]) {
      const colorSetting = new Setting(linkColorGrid).setName(label).setDesc("Visual link color");
      const iconEl = colorSetting.nameEl.createSpan({ cls: `noveler-link-color-icon is-${kind}` });
      setIcon(iconEl, icon);
      iconEl.style.color = normalizeHexColor(draft.storyLineBridge.visualLinkColors[kind]);
      colorSetting.addColorPicker((picker) => picker
        .setValue(normalizeHexColor(draft.storyLineBridge.visualLinkColors[kind]))
        .onChange((value) => {
          draft.storyLineBridge.visualLinkColors[kind] = normalizeHexColor(value);
          iconEl.style.color = draft.storyLineBridge.visualLinkColors[kind];
        }));
    }

    const exportSection = this.createSettingsSection(containerEl, {
      title: "Export",
      description: "Metadata used by StoryLine manuscript exports",
      icon: "file-output",
      accent: "#06b6d4"
    });
    this.attachSectionUndo(exportSection, draft, "export", "Export");
    const exportGrid = exportSection.createDiv({ cls: "noveler-settings-grid" });
    new Setting(exportGrid)
      .setName("EPUB language")
      .setDesc("The publication language stored in EPUB metadata and document markup.")
      .addDropdown((dropdown) => {
        const currentLanguage = normalizeEpubLanguage(draft.export.epubLanguage);
        for (const [value, label] of EPUB_LANGUAGE_OPTIONS) {
          dropdown.addOption(value, label);
        }
        if (!EPUB_LANGUAGE_OPTIONS.some(([value]) => value === currentLanguage)) {
          dropdown.addOption(currentLanguage, currentLanguage.toUpperCase());
        }
        dropdown.setValue(currentLanguage).onChange((value) => {
          draft.export.epubLanguage = normalizeEpubLanguage(value);
        });
      });

    const saveBar = containerEl.createDiv({ cls: "noveler-settings-save-bar" });
    const saveCopy = saveBar.createDiv();
    const saveState = saveCopy.createEl("strong");
    saveCopy.createEl("span", { text: `Saved in ${this.plugin.getSettingsFilePath()}` });
    const saveButton = saveBar.createEl("button", { cls: "mod-cta", text: "Save settings" });
    const updateSaveState = () => {
      const dirty = this.hasUnsavedChanges(draft);
      saveButton.disabled = !dirty;
      saveButton.toggleClass("is-disabled", !dirty);
      saveState.setText(dirty ? "Unsaved settings" : "No unsaved changes");
    };
    const scheduleSaveStateUpdate = () => window.setTimeout(updateSaveState, 0);
    containerEl.addEventListener("input", scheduleSaveStateUpdate);
    containerEl.addEventListener("change", scheduleSaveStateUpdate);
    saveButton.addEventListener("click", async () => {
      if (saveButton.disabled) {
        return;
      }
      this.enforceRequiredIntegrations(draft);
      const previousSettings = this.plugin.settings;
      const previousTypography = this.plugin.globalTypography;
      const candidateSettings = mergeSettings(draft);
      saveButton.disabled = true;
      saveButton.addClass("is-disabled");
      saveButton.setText("Saving...");
      try {
        this.plugin.settings = candidateSettings;
        this.plugin.globalTypography = clone(candidateSettings.typography);
        await this.plugin.saveSettings();
        this.draftSettings = null;
        new Notice(`Noveler settings saved to ${this.plugin.getSettingsFilePath()}.`);
        this.display();
      } catch (error) {
        this.plugin.settings = previousSettings;
        this.plugin.globalTypography = previousTypography;
        console.error("Noveler could not save settings.", error);
        new Notice(`Noveler settings were not saved: ${error.message || String(error)}`);
        saveButton.setText("Save settings");
        updateSaveState();
      }
    });
    updateSaveState();
  }

  enforceRequiredIntegrations(settings) {
    settings.integrations = settings.integrations && typeof settings.integrations === "object" ? settings.integrations : {};
    settings.integrations.antidoteConnect = true;
    settings.integrations.antidoteKeepFocus = true;
    settings.storyLineBridge = settings.storyLineBridge && typeof settings.storyLineBridge === "object"
      ? settings.storyLineBridge
      : clone(DEFAULT_SETTINGS.storyLineBridge);
    settings.storyLineBridge.enabled = true;
    settings.storyLineBridge.enableEpubExport = true;
  }

  createSettingsSection(parent, options) {
    const section = parent.createEl("details", { cls: "noveler-settings-section" });
    section.open = options.open === true;
    section.style.setProperty("--noveler-settings-accent", options.accent || "var(--interactive-accent)");
    const summary = section.createEl("summary");
    const iconEl = summary.createSpan({ cls: "noveler-settings-section-icon" });
    setIcon(iconEl, options.icon);
    const copy = summary.createSpan({ cls: "noveler-settings-section-copy" });
    copy.createEl("strong", { text: options.title });
    copy.createEl("small", { text: options.description });
    const undoButton = summary.createEl("button", {
      cls: "noveler-settings-section-undo",
      attr: { "aria-label": `Undo ${options.title} changes`, type: "button" }
    });
    setIcon(undoButton, "undo-2");
    const chevron = summary.createSpan({ cls: "noveler-settings-section-chevron" });
    setIcon(chevron, "chevron-down");
    const body = section.createDiv({ cls: "noveler-settings-section-body" });
    body.novelerUndoButton = undoButton;
    return body;
  }

  attachSectionUndo(body, draft, key, label) {
    const button = body && body.novelerUndoButton;
    if (!button) {
      return;
    }
    const keys = Array.isArray(key) ? key : [key];
    const getSavedValue = (settingsKey) => {
      if (settingsKey === "typography") {
        return clone(this.plugin.globalTypography || this.plugin.settings.typography || DEFAULT_SETTINGS.typography);
      }
      return clone(mergeSettings(this.plugin.settings)[settingsKey]);
    };
    const update = () => {
      const changed = keys.some((settingsKey) => (
        JSON.stringify(draft[settingsKey]) !== JSON.stringify(getSavedValue(settingsKey))
      ));
      button.toggleClass("is-visible", changed);
      button.setAttribute("aria-hidden", changed ? "false" : "true");
      button.tabIndex = changed ? 0 : -1;
    };
    const scheduleUpdate = () => window.setTimeout(update, 0);
    body.addEventListener("input", scheduleUpdate);
    body.addEventListener("change", scheduleUpdate);
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      for (const settingsKey of keys) {
        draft[settingsKey] = getSavedValue(settingsKey);
      }
      new Notice(`${label} changes undone.`);
      this.display();
    });
    update();
  }

  addPluginStatusCard(parent, pluginIds, name, icon, manifestNames = []) {
    const plugins = this.app.plugins;
    const ids = Array.isArray(pluginIds) ? pluginIds : [pluginIds];
    const expectedNames = [name, ...manifestNames].map((value) => String(value || "").trim().toLowerCase());
    const manifests = plugins && plugins.manifests ? plugins.manifests : {};
    const manifestEntry = Object.entries(manifests).find(([id, manifest]) => (
      ids.includes(id)
      || ids.includes(manifest && manifest.id)
      || expectedNames.includes(String(manifest && manifest.name || "").trim().toLowerCase())
    ));
    const detectedId = manifestEntry
      ? manifestEntry[0]
      : ids.find((id) => plugins && plugins.plugins && plugins.plugins[id]) || ids[0];
    const installed = !!(manifestEntry || (plugins && plugins.plugins && plugins.plugins[detectedId]));
    const enabled = installed && !!(plugins && (
      (plugins.enabledPlugins && typeof plugins.enabledPlugins.has === "function" && plugins.enabledPlugins.has(detectedId))
      || (plugins.plugins && plugins.plugins[detectedId])
    ));
    const state = enabled ? "enabled" : installed ? "disabled" : "missing";
    const card = parent.createDiv({ cls: `noveler-integration-card is-${state}` });
    const iconEl = card.createDiv({ cls: "noveler-integration-card-icon" });
    setIcon(iconEl, icon);
    const copy = card.createDiv({ cls: "noveler-integration-card-copy" });
    copy.createEl("strong", { text: name });
    const status = copy.createEl("span");
    status.createSpan({ cls: "noveler-integration-dot" });
    status.appendText(enabled ? "Enabled" : installed ? "Installed, disabled" : "Not installed");
    if (!installed) {
      const button = card.createEl("button", { text: "Get plugin" });
      button.addEventListener("click", () => window.open(`obsidian://show-plugin?id=${encodeURIComponent(ids[0])}`));
    } else if (!enabled) {
      const button = card.createEl("button", { text: "Enable" });
      button.addEventListener("click", async () => {
        try {
          if (typeof plugins.enablePluginAndSave === "function") {
            await plugins.enablePluginAndSave(detectedId);
          } else if (typeof plugins.enablePlugin === "function") {
            await plugins.enablePlugin(detectedId);
          }
          this.display();
        } catch (_error) {
          new Notice(`${name} could not be enabled automatically.`);
        }
      });
    }
  }

  addMarginEditor(parent, draft) {
    const units = draft.layout.rulerUnits === "metric" ? "metric" : "imperial";
    const unitLabel = units === "metric" ? "cm" : "in";
    const wrapper = parent.createDiv({ cls: "noveler-margin-editor" });
    const copy = wrapper.createDiv({ cls: "noveler-margin-editor-copy" });
    copy.createEl("strong", { text: "Page margins" });
    copy.createEl("span", { text: `Set the printable area in ${unitLabel}.` });
    const layout = wrapper.createDiv({ cls: "noveler-margin-layout" });
    const page = layout.createDiv({ cls: "noveler-margin-page-preview" });
    const pageContent = page.createDiv({ cls: "noveler-margin-page-content" });
    const updatePreview = () => {
      const pageWidth = Math.max(1, Number(draft.layout.pageWidth) || DEFAULT_SETTINGS.layout.pageWidth);
      const pageHeight = Math.max(1, Number(draft.layout.pageHeight) || DEFAULT_SETTINGS.layout.pageHeight);
      const percentage = (value, dimension) => `${Math.max(0, Math.min(48, (Number(value) || 0) / dimension * 100))}%`;
      page.style.aspectRatio = `${pageWidth} / ${pageHeight}`;
      pageContent.style.top = percentage(draft.layout.marginTop, pageHeight);
      pageContent.style.right = percentage(draft.layout.marginRight, pageWidth);
      pageContent.style.bottom = percentage(draft.layout.marginBottom, pageHeight);
      pageContent.style.left = percentage(draft.layout.marginLeft, pageWidth);
    };
    const positions = [
      ["Top", "marginTop", "is-top"],
      ["Left", "marginLeft", "is-left"],
      ["Right", "marginRight", "is-right"],
      ["Bottom", "marginBottom", "is-bottom"]
    ];
    for (const [label, key, className] of positions) {
      const field = layout.createEl("label", { cls: `noveler-margin-field ${className}` });
      field.createSpan({ text: label });
      const control = field.createSpan({ cls: "noveler-margin-control" });
      const input = control.createEl("input", { type: "number" });
      input.min = "0.1";
      input.step = units === "metric" ? "0.1" : "0.05";
      input.value = String(pxToUnitValue(draft.layout[key], units));
      control.createSpan({ text: unitLabel });
      input.addEventListener("input", () => {
        const px = unitValueToPx(input.value, units);
        if (px > 0) {
          draft.layout[key] = px;
          updatePreview();
        }
      });
    }
    updatePreview();
  }

  addModernHeadingStyle(parent, draft, level) {
    const key = `h${level}`;
    draft.headingStyles[key] = draft.headingStyles[key] && typeof draft.headingStyles[key] === "object"
      ? draft.headingStyles[key]
      : clone(DEFAULT_SETTINGS.headingStyles[key]);
    const style = draft.headingStyles[key];
    const defaults = DEFAULT_SETTINGS.headingStyles[key];
    if (!style.fontFamily || style.fontFamily === "body") {
      style.fontFamily = "Georgia";
    }
    const card = parent.createEl("details", { cls: "noveler-heading-style-card" });
    const summary = card.createEl("summary");
    summary.createSpan({ cls: "noveler-heading-level", text: `H${level}` });
    const preview = summary.createSpan({ cls: "noveler-heading-preview", text: `Heading ${level}` });
    const chevron = summary.createSpan({ cls: "noveler-heading-chevron" });
    setIcon(chevron, "chevron-down");
    const controls = card.createDiv({ cls: "noveler-heading-controls" });
    const refreshPreview = () => {
      preview.style.fontFamily = style.fontFamily || "Georgia";
      preview.style.fontSize = `${Math.max(12, Math.min(24, Number(style.fontSize) || defaults.fontSize))}px`;
      preview.style.fontWeight = String(style.fontWeight || defaults.fontWeight);
      preview.style.fontStyle = style.italic ? "italic" : "normal";
      preview.style.textAlign = style.alignment || defaults.alignment;
    };
    const addField = (labelText) => {
      const label = controls.createEl("label");
      label.createSpan({ text: labelText });
      return label;
    };
    const font = addField("Font").createEl("select");
    for (const [value, label] of this.getSettingsFontOptions(style.fontFamily)) {
      font.createEl("option", { value, text: label });
    }
    font.value = style.fontFamily || "Georgia";
    font.addEventListener("change", () => {
      style.fontFamily = font.value || "Georgia";
      refreshPreview();
    });
    const size = addField("Size").createEl("input", { type: "number" });
    size.min = "6";
    size.max = "96";
    size.step = "0.5";
    size.value = String(style.fontSize || defaults.fontSize);
    size.addEventListener("input", () => {
      const value = Number(size.value);
      if (Number.isFinite(value)) {
        style.fontSize = Math.max(6, Math.min(96, value));
        refreshPreview();
      }
    });
    const weight = addField("Weight").createEl("select");
    for (const [value, label] of [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semi-bold"], ["700", "Bold"], ["800", "Heavy"]]) {
      weight.createEl("option", { value, text: label });
    }
    weight.value = String(style.fontWeight || defaults.fontWeight);
    weight.addEventListener("change", () => {
      style.fontWeight = weight.value;
      refreshPreview();
    });
    const alignment = addField("Alignment").createEl("select");
    for (const value of ["left", "center", "right", "justify"]) {
      alignment.createEl("option", { value, text: value.charAt(0).toUpperCase() + value.slice(1) });
    }
    alignment.value = style.alignment || defaults.alignment;
    alignment.addEventListener("change", () => {
      style.alignment = alignment.value;
      refreshPreview();
    });
    const italicLabel = addField("Style");
    const italicControl = italicLabel.createSpan({ cls: "noveler-heading-italic" });
    const italic = italicControl.createEl("input", { type: "checkbox" });
    italic.checked = !!style.italic;
    italicControl.createSpan({ text: "Italic" });
    italic.addEventListener("change", () => {
      style.italic = italic.checked;
      refreshPreview();
    });
    refreshPreview();
  }

  getSettingsFontOptions(currentFont) {
    const fonts = new Map();
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

  hasUnsavedChanges(draft) {
    const candidate = mergeSettings(clone(draft));
    const saved = mergeSettings(clone(this.plugin.settings));
    saved.typography = clone(this.plugin.globalTypography || this.plugin.settings.typography || DEFAULT_SETTINGS.typography);
    return JSON.stringify(candidate) !== JSON.stringify(saved);
  }
}

module.exports = NovelerPlugin;

},
"./storyline-bridge": function(module, exports, require) {
const { Notice, TFile, normalizePath, parseYaml } = require("obsidian");

const NOVELER_VIEW_TYPE = "noveler-manuscript-writer";
const STORYLINE_MANUSCRIPT_VIEW_TYPE = "story-line-manuscript";
const EXPORT_FORMATS = new Set(["docx", "pdf", "epub"]);

const NOVELER_DEFAULT_LAYOUT = {
  mode: "page",
  pageSize: "us-letter",
  pageZoom: 125,
  pageWidth: 760,
  pageHeight: 986,
  marginTop: 96,
  marginRight: 96,
  marginBottom: 96,
  marginLeft: 96,
  rulerUnits: "imperial"
};

const NOVELER_DEFAULT_TYPOGRAPHY = {
  fontPreset: "custom",
  customFontFamily: "Times New Roman",
  fontSize: 12,
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
};

const NOVELER_SCENE_TYPOGRAPHY_KEYS = [
  "fontPreset",
  "customFontFamily",
  "fontSize",
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

const DEFAULT_SETTINGS = {
  enabled: true,
  storyLineRoot: "StoryLine",
  replaceStoryLineSceneOpens: true,
  replaceManuscriptView: true,
  enableEpubExport: true,
  visualLinks: true,
  visualLinkCategories: {
    character: true,
    location: true,
    item: true
  },
  visualLinkColors: {
    character: "#8b5cf6",
    location: "#2f9e73",
    item: "#d97706"
  }
};

const DEFAULT_EXPORT_OPTIONS = {
  showBookTitle: true,
  showAct: true,
  showChapter: true,
  includeSceneTitles: true,
  numberScenesOnExport: false,
  includeCorkboardNotes: false,
  includeInactiveScenes: false
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEpubLanguage(value) {
  const language = String(value || "").trim().replace(/_/g, "-").toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(language) ? language : "en";
}

function mergeSettings(stored) {
  return Object.assign(clone(DEFAULT_SETTINGS), stored || {});
}

function normalizeVaultPath(path) {
  return normalizePath(String(path || "").replace(/\\/g, "/").replace(/^\/+/, "").trim());
}

function getClassList(element) {
  if (!element || !element.classList) {
    return [];
  }
  return Array.from(element.classList);
}

function closestWithDataPath(element) {
  if (!element || typeof element.closest !== "function") {
    return null;
  }
  return element.closest("[data-path], [data-file-path], [data-scene-path], [data-href]");
}

function getElementText(element) {
  return String((element && element.textContent) || "").replace(/\s+/g, " ").trim();
}

function createCheckboxControl(parent, label, checked, onChange) {
  const wrapper = parent.createEl("label", { cls: "noveler-bridge-export-option" });
  const input = wrapper.createEl("input", { attr: { type: "checkbox" } });
  input.checked = !!checked;
  wrapper.createSpan({ text: label });
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

function readObsidianToggleState(setting, fallback) {
  if (!setting) {
    return fallback;
  }
  const toggle = setting.querySelector(".checkbox-container");
  if (toggle) {
    const ariaChecked = toggle.getAttribute("aria-checked");
    if (ariaChecked === "true") {
      return true;
    }
    if (ariaChecked === "false") {
      return false;
    }
    if (toggle.hasClass && toggle.hasClass("is-enabled")) {
      return true;
    }
    if (toggle.classList && toggle.classList.contains("is-enabled")) {
      return true;
    }
    const nestedInput = toggle.querySelector("input[type='checkbox']");
    if (nestedInput) {
      return !!nestedInput.checked;
    }
    return false;
  }
  const input = setting.querySelector("input[type='checkbox']");
  return input ? !!input.checked : fallback;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttr(value) {
  return escapeXml(value).replace(/"/g, "&quot;");
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
  if (!body || typeof parseYaml !== "function") {
    return {};
  }
  try {
    const parsed = parseYaml(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("[Noveler StoryLine Bridge] Could not parse scene frontmatter.", error);
    return {};
  }
}

function parseSimpleFrontmatterValue(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "im");
  const match = String(frontmatter || "").match(pattern);
  return match ? match[1].replace(/^["']|["']$/g, "").trim() : "";
}

function pick(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

function basenameNoExt(path) {
  return String(path || "Untitled").split("/").pop().replace(/\.[^.]+$/, "") || "Untitled";
}

function safeFileName(value) {
  return String(value || "Untitled")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim() || "Untitled";
}

function pxToIn(px) {
  return (Number(px) || 0) / 96;
}

function pxToTwips(px) {
  return Math.max(0, Math.round(pxToIn(px) * 1440));
}

function pxToCm(px) {
  return pxToIn(px) * 2.54;
}

function formatCssNumber(value) {
  const number = Number(value) || 0;
  return String(Math.round(number * 1000) / 1000);
}

function resolveFontFamilyFromTypography(typography) {
  if (typography.customFontFamily) {
    return typography.customFontFamily;
  }
  if (typography.fontPreset === "sans") {
    return "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif";
  }
  if (typography.fontPreset === "mono") {
    return "JetBrains Mono, Consolas, SFMono-Regular, monospace";
  }
  return "Georgia, Times New Roman, serif";
}

function primaryFontName(fontFamily) {
  return String(fontFamily || "Times New Roman")
    .split(",")[0]
    .replace(/['"]/g, "")
    .trim() || "Times New Roman";
}

function paragraphCss(typography) {
  const hanging = Number(typography.hangingIndent) || 0;
  const first = Number(typography.firstLineIndent) || 0;
  const indent = first - hanging;
  const styles = [
    "margin-top:0",
    "margin-bottom:0",
    `padding-left:${formatCssNumber(hanging)}em`,
    `text-indent:${formatCssNumber(indent)}em`
  ];
  return styles.join(";");
}

function typographyCss(typography) {
  const computedFontSize = (Number(typography.fontSize) || NOVELER_DEFAULT_TYPOGRAPHY.fontSize)
    * ((Number(typography.fontScale) || 100) / 100);
  const styles = [
    `font-family:${resolveFontFamilyFromTypography(typography)}`,
    `font-size:${formatCssNumber(computedFontSize)}pt`,
    `font-weight:${typography.fontWeight || "400"}`,
    `font-style:${typography.italic ? "italic" : "normal"}`,
    `font-variant-caps:${typography.smallCaps ? "small-caps" : "normal"}`,
    `font-kerning:${typography.kerning === false ? "none" : "normal"}`,
    `letter-spacing:${formatCssNumber(typography.letterSpacing)}px`,
    `line-height:${formatCssNumber(typography.lineHeight || 1.5)}`,
    `text-align:${typography.alignment || "left"}`
  ];
  if (typography.stylisticSet) {
    styles.push(`font-feature-settings:"${String(typography.stylisticSet).replace(/"/g, "")}" 1`);
  }
  return styles.join(";");
}

function mergeTypography(base, override) {
  return Object.assign(clone(NOVELER_DEFAULT_TYPOGRAPHY), base || {}, override || {});
}

function compareStoryValue(left, right) {
  if (left === right) {
    return 0;
  }
  if (left === undefined || left === null || left === "") {
    return 1;
  }
  if (right === undefined || right === null || right === "") {
    return -1;
  }
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function formatActName(act, sceneManager) {
  const number = Number(act);
  let base;
  if (!Number.isNaN(number) && number === 0) {
    base = "Prologue";
  } else if (!Number.isNaN(number) && number === 99) {
    base = "Epilogue";
  } else {
    base = `Act ${act}`;
  }
  const label = sceneManager && typeof sceneManager.getActLabel === "function" && !Number.isNaN(number)
    ? sceneManager.getActLabel(number)
    : "";
  return label ? `${base}: ${label}` : base;
}

function formatChapterName(chapter, sceneManager) {
  const number = Number(chapter);
  const base = `Chapter ${chapter}`;
  const label = sceneManager && typeof sceneManager.getChapterLabel === "function" && !Number.isNaN(number)
    ? sceneManager.getChapterLabel(number)
    : "";
  return label ? `${base}: ${label}` : base;
}

function getActiveDocument() {
  return typeof activeDocument !== "undefined" ? activeDocument : document;
}

function uint8FromString(value) {
  return new TextEncoder().encode(String(value || ""));
}

function concatUint8(chunks, totalLength) {
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

let crcTable = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }
  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
    }
    crcTable[index] = value >>> 0;
  }
  return crcTable;
}

function crc32(data) {
  const table = getCrcTable();
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < data.length; index += 1) {
    crc = table[(crc ^ data[index]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function createZip(files) {
  const localChunks = [];
  const centralChunks = [];
  const dateTime = dosDateTime();
  let offset = 0;

  for (const file of files) {
    const nameBytes = uint8FromString(file.name);
    const dataBytes = file.data instanceof Uint8Array
      ? file.data
      : file.data instanceof ArrayBuffer
        ? new Uint8Array(file.data)
        : uint8FromString(file.data);
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034B50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dateTime.time, true);
    localView.setUint16(12, dateTime.day, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    localChunks.push(local, dataBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014B50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dateTime.time, true);
    centralView.setUint16(14, dateTime.day, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralChunks.push(central);

    offset += local.length + dataBytes.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054B50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return concatUint8([...localChunks, ...centralChunks, end], offset + centralSize + end.length);
}

function stripWikiLinks(text) {
  return String(text || "").replace(/\[\[([^\]]+)\]\]/g, (_match, target) => {
    if (target.includes("|")) {
      return target.split("|").pop().trim();
    }
    if (target.includes("/")) {
      return target.split("/").pop().trim();
    }
    return target.trim();
  });
}

function mergeRunStyle(base, override) {
  return Object.assign({}, base || {}, override || {});
}

function pushTextRun(runs, text, style) {
  if (!text) {
    return;
  }
  const last = runs[runs.length - 1];
  if (last && last.type === "text" && JSON.stringify(last.style || {}) === JSON.stringify(style || {})) {
    last.text += text;
    return;
  }
  runs.push({ type: "text", text, style: style || {} });
}

function parseInlineRuns(text, inheritedStyle = {}) {
  const source = stripWikiLinks(String(text || ""));
  const runs = [];
  let index = 0;

  const tokenMatchers = [
    { regex: /^<strong[^>]*>([\s\S]*?)<\/strong>/i, style: { bold: true } },
    { regex: /^<b[^>]*>([\s\S]*?)<\/b>/i, style: { bold: true } },
    { regex: /^<em[^>]*>([\s\S]*?)<\/em>/i, style: { italic: true } },
    { regex: /^<i[^>]*>([\s\S]*?)<\/i>/i, style: { italic: true } },
    { regex: /^<u[^>]*>([\s\S]*?)<\/u>/i, style: { underline: true } },
    { regex: /^<s[^>]*>([\s\S]*?)<\/s>/i, style: { strike: true } },
    { regex: /^<strike[^>]*>([\s\S]*?)<\/strike>/i, style: { strike: true } },
    { regex: /^<sup[^>]*>([\s\S]*?)<\/sup>/i, style: { verticalAlign: "superscript" } },
    { regex: /^<sub[^>]*>([\s\S]*?)<\/sub>/i, style: { verticalAlign: "subscript" } },
    { regex: /^<br\s*\/?>/i, break: true },
    { regex: /^\*\*([\s\S]+?)\*\*/, style: { bold: true } },
    { regex: /^__([\s\S]+?)__/, style: { bold: true } },
    { regex: /^~~([\s\S]+?)~~/, style: { strike: true } },
    { regex: /^`([^`]+?)`/, style: { code: true } },
    { regex: /^\*([^*\n]+?)\*/, style: { italic: true } },
    { regex: /^_([^_\n]+?)_/, style: { italic: true } },
    { regex: /^\[([^\]]+)\]\([^)]+\)/, style: {} }
  ];

  while (index < source.length) {
    const slice = source.slice(index);
    let matched = false;
    for (const matcher of tokenMatchers) {
      const match = slice.match(matcher.regex);
      if (!match) {
        continue;
      }
      if (matcher.break) {
        runs.push({ type: "break" });
      } else {
        const style = mergeRunStyle(inheritedStyle, matcher.style);
        runs.push(...parseInlineRuns(match[1], style));
      }
      index += match[0].length;
      matched = true;
      break;
    }
    if (matched) {
      continue;
    }

    const nextSpecial = slice.search(/(\*\*|__|~~|`|\*|_|<strong|<b|<em|<i|<u|<s|<strike|<sup|<sub|<br|\[[^\]]+\]\([^)]+\))/i);
    const plain = nextSpecial <= 0 ? slice.charAt(0) : slice.slice(0, nextSpecial);
    pushTextRun(runs, plain, inheritedStyle);
    index += plain.length;
  }

  return runs;
}

function nodeToInlineRuns(node, inheritedStyle = {}) {
  if (!node) {
    return [];
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ type: "text", text: node.textContent || "", style: inheritedStyle }];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node;
  const tag = element.tagName.toLowerCase();
  if (tag === "br") {
    return [{ type: "break" }];
  }

  const style = mergeRunStyle(inheritedStyle, {
    bold: inheritedStyle.bold || tag === "strong" || tag === "b",
    italic: inheritedStyle.italic || tag === "em" || tag === "i",
    underline: inheritedStyle.underline || tag === "u",
    strike: inheritedStyle.strike || tag === "s" || tag === "strike",
    verticalAlign: tag === "sup" ? "superscript" : tag === "sub" ? "subscript" : inheritedStyle.verticalAlign,
    code: inheritedStyle.code || tag === "code"
  });

  const runs = [];
  for (const child of Array.from(element.childNodes)) {
    runs.push(...nodeToInlineRuns(child, style));
  }
  return runs;
}

function normalizeBlockText(block) {
  return String(block || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function markdownToBlocks(markdown, typography) {
  const text = String(markdown || "").replace(/\r\n?/g, "\n").trim();
  if (!text) {
    return [];
  }

  const blocks = [];
  for (const block of text.split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) {
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, runs: parseInlineRuns(heading[2]), typography });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr", typography });
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote = trimmed.split("\n").map((line) => line.replace(/^>\s?/, "")).join(" ");
      blocks.push({ type: "blockquote", runs: parseInlineRuns(quote), typography });
      continue;
    }

    const lines = trimmed.split("\n");
    const unordered = lines.every((line) => /^\s*[-*+]\s+/.test(line));
    const ordered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
    const checklist = lines.every((line) => /^\s*[-*+]\s+\[[ xX]\]\s+/.test(line));
    if (unordered || ordered || checklist) {
      blocks.push({
        type: checklist ? "checklist" : ordered ? "ol" : "ul",
        items: lines.map((line) => parseInlineRuns(line.replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, "").replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+[.)]\s+/, ""))),
        typography
      });
      continue;
    }

    blocks.push({ type: "paragraph", runs: parseInlineRuns(normalizeBlockText(trimmed)), typography });
  }
  return blocks;
}

function htmlToBlocks(html, typography) {
  if (typeof DOMParser === "undefined") {
    return markdownToBlocks(html, typography);
  }

  try {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const blocks = [];
    const visit = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalizeBlockText(node.textContent || "");
        if (text) {
          blocks.push({ type: "paragraph", runs: parseInlineRuns(text), typography });
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const element = node;
      const tag = element.tagName.toLowerCase();
      if (element.classList && (element.classList.contains("noveler-page") || element.classList.contains("noveler-pagination-marker"))) {
        for (const child of Array.from(element.childNodes)) {
          visit(child);
        }
        return;
      }
      if (/^h[1-6]$/.test(tag)) {
        blocks.push({ type: "heading", level: Number(tag.charAt(1)), runs: nodeToInlineRuns(element), typography });
      } else if (tag === "p") {
        blocks.push({ type: "paragraph", runs: nodeToInlineRuns(element), typography });
      } else if (tag === "blockquote") {
        blocks.push({ type: "blockquote", runs: nodeToInlineRuns(element), typography });
      } else if (tag === "hr") {
        blocks.push({ type: "hr", typography });
      } else if (tag === "ul" || tag === "ol") {
        blocks.push({
          type: tag,
          items: Array.from(element.children).filter((child) => child.tagName && child.tagName.toLowerCase() === "li").map((child) => nodeToInlineRuns(child)),
          typography
        });
      } else if (tag === "div" && element.classList && element.classList.contains("noveler-page-break")) {
        blocks.push({ type: "page-break", typography });
      } else if (tag === "div" && element.classList && element.classList.contains("noveler-scene-break")) {
        blocks.push({ type: "scene-break", runs: nodeToInlineRuns(element), typography });
      } else if (["div", "section", "article", "body"].includes(tag)) {
        for (const child of Array.from(element.childNodes)) {
          visit(child);
        }
      } else {
        const text = normalizeBlockText(element.textContent || "");
        if (text) {
          blocks.push({ type: "paragraph", runs: nodeToInlineRuns(element), typography });
        }
      }
    };
    for (const child of Array.from(doc.body.childNodes)) {
      visit(child);
    }
    return blocks;
  } catch (error) {
    console.warn("[Noveler StoryLine Bridge] Could not parse scene HTML for export.", error);
    return markdownToBlocks(html, typography);
  }
}

function contentToBlocks(content, typography) {
  const text = String(content || "");
  if (/<\/?(p|h[1-6]|div|blockquote|ul|ol|li|hr|br)\b/i.test(text)) {
    return htmlToBlocks(text, typography);
  }
  return markdownToBlocks(text, typography);
}

function runsToHtml(runs) {
  return (runs || []).map((run) => {
    if (run.type === "break") {
      return "<br/>";
    }
    let html = escapeHtml(run.text || "");
    const style = run.style || {};
    if (style.code) {
      html = `<code>${html}</code>`;
    }
    if (style.bold) {
      html = `<strong>${html}</strong>`;
    }
    if (style.italic) {
      html = `<em>${html}</em>`;
    }
    if (style.underline) {
      html = `<u>${html}</u>`;
    }
    if (style.strike) {
      html = `<s>${html}</s>`;
    }
    if (style.verticalAlign === "superscript") {
      html = `<sup>${html}</sup>`;
    } else if (style.verticalAlign === "subscript") {
      html = `<sub>${html}</sub>`;
    }
    return html;
  }).join("");
}

function runsPlainText(runs) {
  return (runs || []).map((run) => run.type === "text" ? run.text || "" : " ").join("");
}

function normalizeTitleText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function stripLeadingSceneTitleBlock(blocks, title) {
  const expected = normalizeTitleText(title);
  if (!expected || !blocks.length) {
    return blocks;
  }
  const first = blocks[0];
  if (!["heading", "paragraph"].includes(first.type)) {
    return blocks;
  }
  return normalizeTitleText(runsPlainText(first.runs)) === expected ? blocks.slice(1) : blocks;
}

function headingCss(level, typography) {
  const computedFontSize = (Number(typography.fontSize) || NOVELER_DEFAULT_TYPOGRAPHY.fontSize)
    * ((Number(typography.fontScale) || 100) / 100);
  const multipliers = [2, 1.5, 1.17, 1, 0.83, 0.67];
  const size = computedFontSize * (multipliers[Math.min(5, Math.max(0, level - 1))] || 1);
  return [
    typographyCss(Object.assign({}, typography, { fontSize: size, fontScale: 100, firstLineIndent: 0, hangingIndent: 0 })),
    "margin:1.4em 0 0.5em",
    "line-height:1.2",
    "text-indent:0"
  ].join(";");
}

function styleAttr(value) {
  return escapeHtml(value);
}

function blockToHtml(block) {
  const typography = block.typography || NOVELER_DEFAULT_TYPOGRAPHY;
  if (block.type === "scene-title") {
    const fontSize = (Number(typography.fontSize) || NOVELER_DEFAULT_TYPOGRAPHY.fontSize)
      * ((Number(typography.fontScale) || 100) / 100)
      * 1.35;
    const sceneTitleTypography = Object.assign({}, typography, {
      fontSize,
      fontScale: 100,
      fontWeight: "700",
      alignment: "center",
      firstLineIndent: 0,
      hangingIndent: 0
    });
    return `<h2 style="${styleAttr(`${typographyCss(sceneTitleTypography)};margin:1.7em 0 1em;line-height:1.2;text-indent:0`)}">${runsToHtml(block.runs)}</h2>`;
  }
  if (block.type === "heading") {
    const level = Math.min(6, Math.max(1, Number(block.level) || 1));
    return `<h${level} style="${styleAttr(headingCss(level, typography))}">${runsToHtml(block.runs)}</h${level}>`;
  }
  if (block.type === "page-break") {
    return '<div style="break-before:page;page-break-before:always;height:0"></div>';
  }
  if (block.type === "hr") {
    return '<hr style="margin:2em 0;border:0;border-top:1px solid #888"/>';
  }
  if (block.type === "blockquote") {
    return `<blockquote style="${styleAttr(`${typographyCss(typography)};margin:0;padding-left:1.2em;border-left:3px solid #888;text-indent:0`)}">${runsToHtml(block.runs)}</blockquote>`;
  }
  if (block.type === "scene-break") {
    return `<div style="${styleAttr(`${typographyCss(Object.assign({}, typography, { alignment: "center" }))};margin:2em 0;letter-spacing:0.12em;text-indent:0`)}">${runsToHtml(block.runs)}</div>`;
  }
  if (block.type === "ul" || block.type === "ol" || block.type === "checklist") {
    const tag = block.type === "ol" ? "ol" : "ul";
    const listStyle = block.type === "checklist" ? "list-style:none;" : "";
    const items = (block.items || []).map((item) => `<li style="margin:0.2em 0;text-indent:0">${runsToHtml(item)}</li>`).join("");
    return `<${tag} style="${styleAttr(`${typographyCss(typography)};margin-top:0;margin-bottom:0;padding-left:2em;${listStyle}`)}">${items}</${tag}>`;
  }
  return `<p style="${styleAttr(`${typographyCss(typography)};${paragraphCss(typography)}`)}">${runsToHtml(block.runs)}</p>`;
}

function buildHtmlDocument(title, bodyHtml, layout, typography, forEpub, language = "en") {
  const pageWidth = pxToCm(layout.pageWidth || NOVELER_DEFAULT_LAYOUT.pageWidth);
  const pageHeight = pxToCm(layout.pageHeight || NOVELER_DEFAULT_LAYOUT.pageHeight);
  const marginTop = pxToCm(layout.marginTop || NOVELER_DEFAULT_LAYOUT.marginTop);
  const marginRight = pxToCm(layout.marginRight || NOVELER_DEFAULT_LAYOUT.marginRight);
  const marginBottom = pxToCm(layout.marginBottom || NOVELER_DEFAULT_LAYOUT.marginBottom);
  const marginLeft = pxToCm(layout.marginLeft || NOVELER_DEFAULT_LAYOUT.marginLeft);
  const baseCss = typographyCss(typography);
  const documentLanguage = normalizeEpubLanguage(language);
  const htmlAttrs = forEpub
    ? ` xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeHtml(documentLanguage)}" lang="${escapeHtml(documentLanguage)}"`
    : ' lang="en"';
  const doctype = forEpub ? '<!DOCTYPE html>' : '<!DOCTYPE html>';
  const linkedCss = forEpub ? '  <link rel="stylesheet" type="text/css" href="../styles.css"/>\n' : "";
  return `${doctype}
<html${htmlAttrs}>
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title)}</title>
${linkedCss}  <style>
    @page { size: ${pageWidth.toFixed(2)}cm ${pageHeight.toFixed(2)}cm; margin: ${marginTop.toFixed(2)}cm ${marginRight.toFixed(2)}cm ${marginBottom.toFixed(2)}cm ${marginLeft.toFixed(2)}cm; }
    html, body { margin: 0; padding: 0; }
    body { ${baseCss}; color: #111; }
    p { margin-top: 0; margin-bottom: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #888; padding: 4px 8px; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function headingBlock(text, level, typography) {
  return { type: "heading", level, runs: parseInlineRuns(text), typography };
}

function sceneTitleBlock(text, typography) {
  return {
    type: "scene-title",
    runs: parseInlineRuns(text),
    typography: Object.assign({}, typography, {
      fontWeight: "700",
      alignment: "center",
      firstLineIndent: 0,
      hangingIndent: 0
    })
  };
}

function runsToDocxXml(runs, typography) {
  const fontFamily = primaryFontName(resolveFontFamilyFromTypography(typography));
  const computedFontSize = (Number(typography.fontSize) || NOVELER_DEFAULT_TYPOGRAPHY.fontSize)
    * ((Number(typography.fontScale) || 100) / 100);
  const sizeHalfPoints = Math.max(2, Math.round(computedFontSize * 2));
  const spacing = Math.round((Number(typography.letterSpacing) || 0) * 15);
  const baseBold = Number(typography.fontWeight) >= 600;

  return (runs || []).map((run) => {
    if (run.type === "break") {
      return "<w:r><w:br/></w:r>";
    }
    const style = run.style || {};
    const properties = [
      `<w:rFonts w:ascii="${escapeXmlAttr(fontFamily)}" w:hAnsi="${escapeXmlAttr(fontFamily)}" w:cs="${escapeXmlAttr(fontFamily)}"/>`,
      `<w:sz w:val="${sizeHalfPoints}"/>`,
      `<w:szCs w:val="${sizeHalfPoints}"/>`
    ];
    if (baseBold || style.bold) {
      properties.push("<w:b/>");
    }
    if (typography.italic || style.italic) {
      properties.push("<w:i/>");
    }
    if (typography.smallCaps) {
      properties.push("<w:smallCaps/>");
    }
    if (style.underline) {
      properties.push('<w:u w:val="single"/>');
    }
    if (style.strike) {
      properties.push("<w:strike/>");
    }
    if (style.verticalAlign === "superscript") {
      properties.push('<w:vertAlign w:val="superscript"/>');
    } else if (style.verticalAlign === "subscript") {
      properties.push('<w:vertAlign w:val="subscript"/>');
    }
    if (spacing) {
      properties.push(`<w:spacing w:val="${spacing}"/>`);
    }
    if (style.code) {
      properties.push('<w:rStyle w:val="CodeChar"/>');
    }
    return `<w:r><w:rPr>${properties.join("")}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text || "")}</w:t></w:r>`;
  }).join("");
}

function paragraphPropertiesXml(typography, kind) {
  const line = Math.round((Number(typography.lineHeight) || 1.5) * 240);
  const alignmentMap = { left: "left", right: "right", center: "center", justify: "both" };
  const alignment = alignmentMap[typography.alignment] || "left";
  const fontSize = (Number(typography.fontSize) || NOVELER_DEFAULT_TYPOGRAPHY.fontSize)
    * ((Number(typography.fontScale) || 100) / 100);
  const hanging = Math.max(0, Number(typography.hangingIndent) || 0);
  const first = Number(typography.firstLineIndent) || 0;
  const left = Math.round(hanging * fontSize * 20);
  const firstLine = Math.round((first - hanging) * fontSize * 20);
  const properties = [`<w:spacing w:before="0" w:after="0" w:line="${line}" w:lineRule="auto"/>`];
  if (kind !== "heading") {
    properties.push(`<w:jc w:val="${alignment}"/>`);
    if (left || firstLine) {
      const indent = [`w:left="${left}"`];
      if (firstLine >= 0) {
        indent.push(`w:firstLine="${firstLine}"`);
      } else {
        indent.push(`w:hanging="${Math.abs(firstLine)}"`);
      }
      properties.push(`<w:ind ${indent.join(" ")}/>`);
    }
  }
  return properties.join("");
}

function blockToDocxXml(block) {
  const typography = block.typography || NOVELER_DEFAULT_TYPOGRAPHY;
  if (block.type === "scene-title") {
    const sceneTitleTypography = Object.assign({}, typography, {
      fontWeight: "700",
      alignment: "center",
      firstLineIndent: 0,
      hangingIndent: 0
    });
    return `<w:p><w:pPr><w:pStyle w:val="Heading2"/>${paragraphPropertiesXml(sceneTitleTypography, "paragraph")}</w:pPr>${runsToDocxXml(block.runs, sceneTitleTypography)}</w:p>`;
  }
  if (block.type === "heading") {
    const level = Math.min(6, Math.max(1, Number(block.level) || 1));
    return `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/>${paragraphPropertiesXml(typography, "heading")}</w:pPr>${runsToDocxXml(block.runs, typography)}</w:p>`;
  }
  if (block.type === "page-break") {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
  if (block.type === "hr") {
    return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="888888"/></w:pBdr></w:pPr></w:p>';
  }
  if (block.type === "blockquote") {
    return `<w:p><w:pPr>${paragraphPropertiesXml(Object.assign({}, typography, { firstLineIndent: 0, hangingIndent: 0 }), "paragraph")}<w:ind w:left="720"/></w:pPr>${runsToDocxXml(block.runs, typography)}</w:p>`;
  }
  if (block.type === "scene-break") {
    return `<w:p><w:pPr>${paragraphPropertiesXml(Object.assign({}, typography, { alignment: "center", firstLineIndent: 0, hangingIndent: 0 }), "paragraph")}</w:pPr>${runsToDocxXml(block.runs, typography)}</w:p>`;
  }
  if (block.type === "ul" || block.type === "ol" || block.type === "checklist") {
    return (block.items || []).map((item, index) => {
      const marker = block.type === "ol" ? `${index + 1}. ` : block.type === "checklist" ? "[ ] " : "- ";
      return `<w:p><w:pPr>${paragraphPropertiesXml(Object.assign({}, typography, { firstLineIndent: 0, hangingIndent: 0 }), "paragraph")}<w:ind w:left="720" w:hanging="360"/></w:pPr>${runsToDocxXml(parseInlineRuns(marker), typography)}${runsToDocxXml(item, typography)}</w:p>`;
    }).join("");
  }
  return `<w:p><w:pPr>${paragraphPropertiesXml(typography, "paragraph")}</w:pPr>${runsToDocxXml(block.runs, typography)}</w:p>`;
}

function createDocxPackage(title, blocks, layout, baseTypography) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${blocks.map(blockToDocxXml).join("")}
    <w:sectPr>
      <w:pgSz w:w="${pxToTwips(layout.pageWidth || NOVELER_DEFAULT_LAYOUT.pageWidth)}" w:h="${pxToTwips(layout.pageHeight || NOVELER_DEFAULT_LAYOUT.pageHeight)}"/>
      <w:pgMar w:top="${pxToTwips(layout.marginTop || NOVELER_DEFAULT_LAYOUT.marginTop)}" w:right="${pxToTwips(layout.marginRight || NOVELER_DEFAULT_LAYOUT.marginRight)}" w:bottom="${pxToTwips(layout.marginBottom || NOVELER_DEFAULT_LAYOUT.marginBottom)}" w:left="${pxToTwips(layout.marginLeft || NOVELER_DEFAULT_LAYOUT.marginLeft)}" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const font = escapeXmlAttr(primaryFontName(resolveFontFamilyFromTypography(baseTypography)));
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Character"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/></w:rPr></w:style>
  ${[1, 2, 3, 4, 5, 6].map((level) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="${Math.max(20, Math.round((baseTypography.fontSize || 18) * (2.4 - level * 0.2)))}"/></w:rPr></w:style>`).join("")}
</w:styles>`;

  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
    { name: "word/_rels/document.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>' },
    { name: "word/styles.xml", data: stylesXml },
    { name: "word/document.xml", data: documentXml },
    { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(title)}</dc:title></cp:coreProperties>` }
  ]);
}

function createEpubPackage(title, bodyHtml, layout, baseTypography, language) {
  const epubLanguage = normalizeEpubLanguage(language);
  const identifier = `urn:uuid:${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const xhtml = buildHtmlDocument(title, bodyHtml, layout, baseTypography, true, epubLanguage);
  const css = `body { ${typographyCss(baseTypography)}; } p { margin-top: 0; margin-bottom: 0; }`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${escapeXml(epubLanguage)}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="manuscript" href="text/manuscript.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="manuscript"/>
  </spine>
</package>`;
  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeHtml(epubLanguage)}" lang="${escapeHtml(epubLanguage)}">
<head><title>${escapeHtml(title)}</title></head>
<body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>${escapeHtml(title)}</h1><ol><li><a href="text/manuscript.xhtml">Manuscript</a></li></ol></nav></body>
</html>`;

  return createZip([
    { name: "mimetype", data: "application/epub+zip" },
    { name: "META-INF/container.xml", data: '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>' },
    { name: "OEBPS/content.opf", data: opf },
    { name: "OEBPS/nav.xhtml", data: nav },
    { name: "OEBPS/styles.css", data: css },
    { name: "OEBPS/text/manuscript.xhtml", data: xhtml }
  ]);
}

class NovelerStoryLineBridgePlugin {
  constructor(host) {
    this.host = host;
    this.app = host.app;
    this.manifest = host.manifest;
  }

  addCommand(command) {
    return this.host.addCommand(command);
  }

  registerDomEvent(...args) {
    return this.host.registerDomEvent(...args);
  }

  registerEvent(eventRef) {
    return this.host.registerEvent(eventRef);
  }

  register(callback) {
    return this.host.register(callback);
  }

  async onload() {
    await this.loadSettings();

    this.lastScenePath = "";
    this.lastStoryLineInteractionAt = 0;
    this.redirectingLeaves = new WeakSet();
    this.patchedLeaves = new Map();
    this.enhancedExportSelects = new WeakSet();
    this.enhancedExportButtons = new WeakSet();
    this.exportOptionStateByModal = new WeakMap();

    this.registerApi();
    this.registerExportCommands();
    this.installHandlers();
    this.installExportModalEnhancer();
  }

  onunload() {
    if (this.exportModalObserver) {
      this.exportModalObserver.disconnect();
      this.exportModalObserver = null;
    }
    this.restorePatchedLeaves();
    this.restoreOpenLinkTextPatch();
    this.restoreGetLeafPatch();
    if (window.NovelerStoryLineBridge && window.NovelerStoryLineBridge.plugin === this) {
      delete window.NovelerStoryLineBridge;
    }
  }

  async loadSettings() {
    this.settings = mergeSettings(await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.registerApi();
    this.enhanceStoryLineExportModals();
  }

  registerApi() {
    window.NovelerStoryLineBridge = {
      plugin: this,
      isEnabled: () => this.isEnabled(),
      getStoryLineRoot: () => this.getStoryLineRoot(),
      isStoryLineScenePath: (path) => this.isStoryLineScenePath(path),
      getActiveScenePath: () => this.getActiveScenePath(),
      openSceneInNoveler: (path, options = {}) => this.openSceneInNoveler(path, options),
      exportManuscript: (format, options = {}) => this.exportNovelerFormattedManuscript(format, options)
    };
  }

  isEnabled() {
    return !!this.settings.enabled;
  }

  getStoryLineRoot() {
    const storyLine = this.getStoryLinePlugin();
    const root = storyLine && storyLine.settings && storyLine.settings.storyLineRoot;
    return normalizeVaultPath(root || this.settings.storyLineRoot || DEFAULT_SETTINGS.storyLineRoot);
  }

  getStoryLinePlugin() {
    const plugins = this.app.plugins;
    if (!plugins) {
      return null;
    }
    if (plugins.plugins && plugins.plugins.storyline) {
      return plugins.plugins.storyline;
    }
    if (typeof plugins.getPlugin === "function") {
      return plugins.getPlugin("storyline");
    }
    return null;
  }

  getNovelerApi() {
    if (window.Noveler && typeof window.Noveler.openScene === "function") {
      return window.Noveler;
    }
    const plugins = this.app.plugins;
    const noveler = plugins && plugins.plugins && plugins.plugins.noveler;
    if (noveler && typeof noveler.openScene === "function") {
      return noveler;
    }
    return null;
  }

  isStoryLineScenePath(path) {
    const vaultPath = normalizeVaultPath(path);
    if (!vaultPath || !/\.md$/i.test(vaultPath)) {
      return false;
    }

    const root = this.getStoryLineRoot();
    const parts = vaultPath.split("/").filter(Boolean);
    const rootParts = root.split("/").filter(Boolean);
    if (parts.length < rootParts.length + 3) {
      return false;
    }

    for (let index = 0; index < rootParts.length; index += 1) {
      if (parts[index].toLowerCase() !== rootParts[index].toLowerCase()) {
        return false;
      }
    }

    const scenesIndex = parts.findIndex((part, index) => index >= rootParts.length && part.toLowerCase() === "scenes");
    if (scenesIndex < 0) {
      return false;
    }

    const relativeSceneParts = parts.slice(scenesIndex + 1);
    return relativeSceneParts.length >= 1 && relativeSceneParts.every(Boolean);
  }

  registerExportCommands() {
    this.addCommand({
      id: "export-storyline-manuscript-epub",
      name: "StoryLine Bridge: Export manuscript to ePub",
      callback: () => this.exportNovelerFormattedManuscript("epub")
    });
    this.addCommand({
      id: "export-storyline-manuscript-docx",
      name: "StoryLine Bridge: Export manuscript to DOCX with Noveler formatting",
      callback: () => this.exportNovelerFormattedManuscript("docx")
    });
    this.addCommand({
      id: "export-storyline-manuscript-pdf",
      name: "StoryLine Bridge: Export manuscript to PDF with Noveler formatting",
      callback: () => this.exportNovelerFormattedManuscript("pdf")
    });
  }

  installExportModalEnhancer() {
    this.registerDomEvent(document, "click", (event) => this.onStoryLineExportButtonClick(event), { capture: true });

    this.exportModalObserver = new MutationObserver(() => this.enhanceStoryLineExportModals());
    this.exportModalObserver.observe(document.body, { childList: true, subtree: true });
    this.register(() => {
      if (this.exportModalObserver) {
        this.exportModalObserver.disconnect();
        this.exportModalObserver = null;
      }
    });

    if (typeof this.app.workspace.onLayoutReady === "function") {
      this.app.workspace.onLayoutReady(() => this.enhanceStoryLineExportModals());
    } else {
      window.setTimeout(() => this.enhanceStoryLineExportModals(), 0);
    }
  }

  enhanceStoryLineExportModals() {
    if (!this.isEnabled()) {
      return;
    }
    for (const modal of Array.from(document.querySelectorAll(".storyline-export-modal"))) {
      const parts = this.getExportModalParts(modal);
      if (!parts || !parts.formatSelect) {
        continue;
      }
      this.syncStoryLineEpubExportOption(parts.formatSelect);
      if (!this.enhancedExportSelects.has(parts.formatSelect)) {
        parts.formatSelect.addEventListener("change", () => {
          if (parts.formatSelect.value === "epub" && parts.contentSelect && parts.contentSelect.value !== "manuscript") {
            parts.contentSelect.value = "manuscript";
            parts.contentSelect.dispatchEvent(new Event("change", { bubbles: true }));
          }
          window.setTimeout(() => this.syncBridgeExportOptions(modal), 0);
        });
        if (parts.contentSelect) {
          parts.contentSelect.addEventListener("change", () => {
            window.setTimeout(() => this.syncBridgeExportOptions(modal), 0);
          });
        }
        this.enhancedExportSelects.add(parts.formatSelect);
      }
      this.enhanceExportButton(modal);
      this.syncBridgeExportOptions(modal);
    }
  }

  syncStoryLineEpubExportOption(formatSelect) {
    if (!formatSelect) {
      return;
    }
    const epubOption = Array.from(formatSelect.options).find((option) => option.value === "epub");
    if (this.settings.enableEpubExport === false) {
      const wasSelected = formatSelect.value === "epub";
      if (epubOption) {
        epubOption.remove();
      }
      if (wasSelected) {
        const fallbackOption = Array.from(formatSelect.options).find((option) => option.value === "docx") || formatSelect.options[0];
        if (fallbackOption) {
          formatSelect.value = fallbackOption.value;
          formatSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      return;
    }
    if (!epubOption) {
      const option = document.createElement("option");
      option.value = "epub";
      option.text = this.host.t("ePub (.epub)");
      const pdfOption = Array.from(formatSelect.options).find((item) => item.value === "pdf");
      formatSelect.add(option, pdfOption ? pdfOption.index + 1 : undefined);
    } else {
      epubOption.text = this.host.t("ePub (.epub)");
    }
  }

  enhanceExportButton(modal) {
    const button = this.getExportModalButton(modal);
    if (!button || this.enhancedExportButtons.has(button)) {
      return;
    }
    button.addEventListener("click", (event) => this.onStoryLineExportButtonClick(event), true);
    this.enhancedExportButtons.add(button);
  }

  getExportModalButton(modal) {
    return Array.from(modal.querySelectorAll("button")).find((button) => {
      const label = getElementText(button).toLowerCase();
      return label === "export" || label === "exporting...";
    });
  }

  getExportOptionState(modal) {
    const current = this.exportOptionStateByModal.get(modal) || {};
    const merged = Object.assign({}, DEFAULT_EXPORT_OPTIONS, current);
    this.exportOptionStateByModal.set(modal, merged);
    return merged;
  }

  setExportOptionState(modal, key, value) {
    const state = this.getExportOptionState(modal);
    state[key] = value;
    this.exportOptionStateByModal.set(modal, state);
  }

  syncBridgeExportOptions(modal) {
    const parts = this.getExportModalParts(modal);
    if (!parts || !parts.formatSelect) {
      return;
    }
    const existing = modal.querySelector(".noveler-bridge-export-options");
    const shouldShow = (!parts.contentSelect || parts.contentSelect.value === "manuscript")
      && EXPORT_FORMATS.has(parts.formatSelect.value)
      && (parts.formatSelect.value !== "epub" || this.settings.enableEpubExport !== false);
    if (!shouldShow) {
      if (existing) {
        existing.remove();
      }
      return;
    }
    if (existing) {
      return;
    }

    const optionsEl = modal.querySelector(".storyline-export-options");
    if (!optionsEl) {
      return;
    }
    const state = this.getExportOptionState(modal);
    const container = optionsEl.createDiv({ cls: "noveler-bridge-export-options" });
    container.createDiv({ cls: "noveler-bridge-export-options-title", text: "Noveler export headings" });
    createCheckboxControl(container, "Show Book Title", state.showBookTitle, (value) => this.setExportOptionState(modal, "showBookTitle", value));
    createCheckboxControl(container, "Show Act", state.showAct, (value) => this.setExportOptionState(modal, "showAct", value));
    createCheckboxControl(container, "Show Chapter", state.showChapter, (value) => this.setExportOptionState(modal, "showChapter", value));
  }

  getExportModalParts(modal) {
    if (!modal) {
      return null;
    }
    const selects = Array.from(modal.querySelectorAll("select"));
    const formatSelect = selects.find((select) => {
      const values = Array.from(select.options).map((option) => option.value);
      return values.includes("md") && values.includes("docx") && values.includes("pdf");
    });
    const contentSelect = selects.find((select) => {
      const values = Array.from(select.options).map((option) => option.value);
      return values.includes("manuscript") && values.includes("outline");
    });
    return { modal, formatSelect, contentSelect };
  }

  getExportModalCheckbox(modal, label, fallback = false) {
    const normalized = String(label || "").toLowerCase();
    const setting = Array.from(modal.querySelectorAll(".setting-item")).find((element) => {
      const name = element.querySelector(".setting-item-name");
      return String((name && name.textContent) || element.textContent || "").toLowerCase().includes(normalized);
    });
    return readObsidianToggleState(setting, fallback);
  }

  readStoryLineExportModalOptions(modal) {
    const parts = this.getExportModalParts(modal);
    const format = parts && parts.formatSelect ? parts.formatSelect.value : "";
    const scope = parts && parts.contentSelect ? parts.contentSelect.value : "manuscript";
    const state = this.getExportOptionState(modal);
    return {
      format,
      scope,
      showBookTitle: state.showBookTitle,
      showAct: state.showAct,
      showChapter: state.showChapter,
      includeInactiveScenes: this.getExportModalCheckbox(modal, "Include inactive scenes", DEFAULT_EXPORT_OPTIONS.includeInactiveScenes),
      includeSceneTitles: this.getExportModalCheckbox(modal, "Include scene titles", DEFAULT_EXPORT_OPTIONS.includeSceneTitles),
      numberScenesOnExport: this.getExportModalCheckbox(modal, "Number scenes", DEFAULT_EXPORT_OPTIONS.numberScenesOnExport),
      includeCorkboardNotes: this.getExportModalCheckbox(modal, "Include corkboard notes", DEFAULT_EXPORT_OPTIONS.includeCorkboardNotes)
    };
  }

  onStoryLineExportButtonClick(event) {
    if (!this.isEnabled()) {
      return;
    }
    const target = event.target;
    if (!target || typeof target.closest !== "function") {
      return;
    }
    const modal = target.closest(".storyline-export-modal");
    if (!modal) {
      return;
    }
    const button = target.closest("button");
    if (!button || getElementText(button).toLowerCase() !== "export") {
      return;
    }

    const options = this.readStoryLineExportModalOptions(modal);
    if (options.format === "epub") {
      options.scope = "manuscript";
    }
    if (!EXPORT_FORMATS.has(options.format) || options.scope !== "manuscript") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }

    button.disabled = true;
    button.textContent = "Exporting...";
    this.exportNovelerFormattedManuscript(options.format, options)
      .then((path) => {
        if (path) {
          this.closeExportModal(modal);
        } else {
          button.disabled = false;
          button.textContent = "Export";
        }
      })
      .catch((error) => {
        console.error("[Noveler StoryLine Bridge] Export failed.", error);
        new Notice(`Export failed: ${error.message || String(error)}`);
        button.disabled = false;
        button.textContent = "Export";
      });
  }

  closeExportModal(modal) {
    const root = modal && modal.closest(".modal");
    const closeButton = root && root.querySelector(".modal-close-button");
    if (closeButton) {
      closeButton.click();
    } else if (root) {
      root.remove();
    }
  }

  getNovelerPlugin() {
    if (window.Noveler && window.Noveler.plugin) {
      return window.Noveler.plugin;
    }
    const plugins = this.app.plugins;
    if (plugins && plugins.plugins && plugins.plugins.noveler) {
      return plugins.plugins.noveler;
    }
    if (plugins && typeof plugins.getPlugin === "function") {
      return plugins.getPlugin("noveler");
    }
    return null;
  }

  getNovelerSettings() {
    const noveler = this.getNovelerPlugin();
    return noveler && noveler.settings ? noveler.settings : null;
  }

  getNovelerLayout() {
    const settings = this.getNovelerSettings();
    return Object.assign(clone(NOVELER_DEFAULT_LAYOUT), settings && settings.layout ? settings.layout : {});
  }

  getEpubLanguage() {
    const settings = this.getNovelerSettings();
    return normalizeEpubLanguage(settings && settings.export && settings.export.epubLanguage);
  }

  getNovelerBaseTypography() {
    const noveler = this.getNovelerPlugin();
    const settings = this.getNovelerSettings();
    const globalTypography = noveler && noveler.globalTypography ? noveler.globalTypography : null;
    return mergeTypography(globalTypography || (settings && settings.typography), {});
  }

  getSceneTypography(path, frontmatter) {
    const settings = this.getNovelerSettings();
    const base = this.getNovelerBaseTypography();
    const vaultPath = normalizeVaultPath(path);
    const stored = settings && settings.sceneSettings && settings.sceneSettings[vaultPath];
    if (stored && stored.typography) {
      return mergeTypography(base, pick(stored.typography, NOVELER_SCENE_TYPOGRAPHY_KEYS));
    }
    const parsed = parseFrontmatterData(frontmatter);
    const noveler = parsed.noveler && typeof parsed.noveler === "object" ? parsed.noveler : {};
    return mergeTypography(base, pick(noveler.typography || {}, NOVELER_SCENE_TYPOGRAPHY_KEYS));
  }

  getStoryLineProject() {
    const storyLine = this.getStoryLinePlugin();
    const sceneManager = storyLine && storyLine.sceneManager;
    return sceneManager && sceneManager.activeProject ? sceneManager.activeProject : null;
  }

  getSortedStoryLineScenes(options = {}) {
    const storyLine = this.getStoryLinePlugin();
    const sceneManager = storyLine && storyLine.sceneManager;
    if (!sceneManager) {
      return [];
    }
    let scenes = [];
    if (sceneManager.queryService && typeof sceneManager.queryService.getFilteredScenes === "function") {
      scenes = sceneManager.queryService.getFilteredScenes(
        { activeState: options.includeInactiveScenes ? "all" : "active" },
        { field: "sequence", direction: "asc" }
      ) || [];
    } else if (typeof sceneManager.getAllScenes === "function") {
      scenes = sceneManager.getAllScenes() || [];
      if (!options.includeInactiveScenes) {
        scenes = scenes.filter((scene) => !scene.inactive);
      }
    }
    if (!options.includeCorkboardNotes) {
      scenes = scenes.filter((scene) => !this.isCorkboardNoteScene(scene));
    }
    return [...scenes].sort((left, right) => {
      const act = compareStoryValue(left.act, right.act);
      if (act !== 0) {
        return act;
      }
      const chapter = compareStoryValue(left.chapter, right.chapter);
      if (chapter !== 0) {
        return chapter;
      }
      return compareStoryValue(left.sequence ?? 9999, right.sequence ?? 9999);
    });
  }

  isCorkboardNoteScene(scene) {
    const value = scene && scene.corkboardNote;
    if (value === true) {
      return true;
    }
    if (typeof value === "string") {
      return value.trim().toLowerCase() === "true";
    }
    return typeof value === "number" && value === 1;
  }

  async loadSceneForExport(scene) {
    const path = normalizeVaultPath(scene && (scene.filePath || scene.path || scene.file));
    let frontmatter = "";
    let body = scene && scene.body ? String(scene.body) : "";
    let title = scene && scene.title ? String(scene.title) : "";

    if (path) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const split = splitMarkdownFrontmatter(content);
        frontmatter = split.frontmatter;
        body = split.body;
        title = parseSimpleFrontmatterValue(frontmatter, "title")
          || parseSimpleFrontmatterValue(frontmatter, "name")
          || title
          || file.basename;
      }
    }

    return {
      scene,
      path,
      title: title || basenameNoExt(path),
      body,
      frontmatter,
      typography: this.getSceneTypography(path, frontmatter)
    };
  }

  async buildFormattedManuscript(project, scenes, options = {}) {
    const exportOptions = Object.assign({}, DEFAULT_EXPORT_OPTIONS, options);
    const storyLine = this.getStoryLinePlugin();
    const sceneManager = storyLine && storyLine.sceneManager;
    const baseTypography = this.getNovelerBaseTypography();
    const blocks = [];
    if (exportOptions.showBookTitle) {
      blocks.push(headingBlock(project.title || "Manuscript", 1, baseTypography));
    }
    let currentAct;
    let currentChapter;
    let sceneNumber = 0;

    for (const scene of scenes) {
      const loaded = await this.loadSceneForExport(scene);
      sceneNumber += 1;

      if (exportOptions.showAct && scene.act !== undefined && scene.act !== currentAct) {
        currentAct = scene.act;
        currentChapter = undefined;
        blocks.push(headingBlock(formatActName(scene.act, sceneManager), 2, baseTypography));
      } else if (scene.act !== undefined && scene.act !== currentAct) {
        currentAct = scene.act;
        currentChapter = undefined;
      }
      if (exportOptions.showChapter && scene.chapter !== undefined && scene.chapter !== currentChapter) {
        currentChapter = scene.chapter;
        blocks.push(headingBlock(formatChapterName(scene.chapter, sceneManager), 3, baseTypography));
      } else if (scene.chapter !== undefined && scene.chapter !== currentChapter) {
        currentChapter = scene.chapter;
      }
      if (exportOptions.numberScenesOnExport) {
        blocks.push(headingBlock(String(sceneNumber), 4, loaded.typography));
      } else if (exportOptions.includeSceneTitles === true) {
        blocks.push(sceneTitleBlock(loaded.title || "Untitled Scene", loaded.typography));
      }

      const sceneBlocks = stripLeadingSceneTitleBlock(contentToBlocks(loaded.body, loaded.typography), loaded.title);
      if (sceneBlocks.length) {
        blocks.push(...sceneBlocks);
      } else {
        blocks.push({ type: "paragraph", runs: parseInlineRuns("No content yet."), typography: loaded.typography });
      }
    }

    const bodyHtml = blocks.map(blockToHtml).join("\n");
    return { blocks, bodyHtml, baseTypography };
  }

  async exportNovelerFormattedManuscript(format, options = {}) {
    const normalizedFormat = String(format || "").toLowerCase();
    if (!EXPORT_FORMATS.has(normalizedFormat)) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    if (!this.isEnabled()) {
      new Notice("StoryLine is not available. Install and enable StoryLine, then try the export again.");
      return "";
    }
    if (!this.getNovelerSettings()) {
      new Notice("Enable Noveler before exporting with Noveler formatting.");
      return "";
    }

    const project = this.getStoryLineProject();
    if (!project) {
      new Notice("No active StoryLine project.");
      return "";
    }
    const scenes = this.getSortedStoryLineScenes(options);
    if (!scenes.length) {
      new Notice("No StoryLine scenes to export.");
      return "";
    }

    const layout = this.getNovelerLayout();
    const model = await this.buildFormattedManuscript(project, scenes, options);
    const title = project.title || "Manuscript";
    const label = normalizedFormat === "epub" ? "ePub" : normalizedFormat.toUpperCase();
    new Notice(`Exporting ${label} with Noveler formatting...`);

    let bytes;
    let extension = normalizedFormat;
    if (normalizedFormat === "epub") {
      bytes = createEpubPackage(title, model.bodyHtml, layout, model.baseTypography, this.getEpubLanguage());
    } else if (normalizedFormat === "docx") {
      bytes = createDocxPackage(title, model.blocks, layout, model.baseTypography);
    } else {
      const html = buildHtmlDocument(title, model.bodyHtml, layout, model.baseTypography, false);
      bytes = await this.tryPrintToPdf(html, layout);
      if (!bytes) {
        new Notice("PDF export requires the Obsidian desktop app.");
        return "";
      }
    }

    const fileName = `${safeFileName(title)} - Manuscript (${this.timestamp()}).${extension}`;
    const path = await this.writeBinaryExport(project, fileName, bytes);
    new Notice(`Exported to ${fileName}`, 5000);
    return path;
  }

  timestamp() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  async ensureExportFolder(project) {
    const sceneFolder = normalizeVaultPath(project && project.sceneFolder);
    const base = sceneFolder.replace(/\/Scenes\/?$/i, "") || this.getStoryLineRoot();
    const exportFolder = normalizeVaultPath(`${base}/Exports`);
    const parts = exportFolder.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!await this.app.vault.adapter.exists(current)) {
        await this.app.vault.createFolder(current);
      }
    }
    return exportFolder;
  }

  async writeBinaryExport(project, fileName, bytes) {
    const exportFolder = await this.ensureExportFolder(project);
    const path = normalizeVaultPath(`${exportFolder}/${fileName}`);
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      if (typeof this.app.vault.modifyBinary === "function") {
        await this.app.vault.modifyBinary(existing, buffer);
      } else {
        await this.app.vault.adapter.writeBinary(path, buffer);
      }
      return path;
    }
    if (existing) {
      throw new Error(`${path} is not a file`);
    }
    if (typeof this.app.vault.createBinary === "function") {
      await this.app.vault.createBinary(path, buffer);
    } else {
      await this.app.vault.adapter.writeBinary(path, buffer);
    }
    return path;
  }

  async tryPrintToPdf(html, layout) {
    if (typeof window.require !== "function") {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const doc = getActiveDocument();
        const webview = doc.createElement("webview");
        Object.assign(webview.style, {
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "1px",
          height: "1px"
        });
        webview.setAttribute("nodeintegration", "false");
        webview.setAttribute("webpreferences", "contextIsolation=true");
        webview.setAttribute("src", `data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        const cleanup = () => {
          try {
            webview.remove();
          } catch (error) {
            // Ignore cleanup errors from detached webviews.
          }
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          resolve(null);
        }, 15000);
        webview.addEventListener("dom-ready", async () => {
          try {
            await new Promise((done) => window.setTimeout(done, 500));
            const data = await webview.printToPDF({
              printBackground: true,
              preferCSSPageSize: true,
              displayHeaderFooter: false,
              pageSize: {
                width: Math.round(pxToIn(layout.pageWidth || NOVELER_DEFAULT_LAYOUT.pageWidth) * 25400),
                height: Math.round(pxToIn(layout.pageHeight || NOVELER_DEFAULT_LAYOUT.pageHeight) * 25400)
              }
            });
            window.clearTimeout(timeout);
            cleanup();
            resolve(new Uint8Array(data));
          } catch (error) {
            console.error("[Noveler StoryLine Bridge] printToPDF failed.", error);
            window.clearTimeout(timeout);
            cleanup();
            resolve(null);
          }
        });
        webview.addEventListener("did-fail-load", () => {
          window.clearTimeout(timeout);
          cleanup();
          resolve(null);
        });
        doc.body.appendChild(webview);
      } catch (error) {
        console.error("[Noveler StoryLine Bridge] webview PDF export failed.", error);
        resolve(null);
      }
    });
  }

  installHandlers() {
    this.registerDomEvent(document, "click", (event) => this.onStoryLineClick(event), { capture: true });
    this.registerDomEvent(document, "dblclick", (event) => this.onStoryLineDoubleClick(event), { capture: true });
    this.registerDomEvent(document, "contextmenu", (event) => this.rememberSceneFromEvent(event), { capture: true });

    this.registerEvent(this.app.workspace.on("storyline:scene-focus", (path) => {
      this.rememberScenePath(path);
    }));
    this.registerEvent(this.app.workspace.on("storyline:manuscript-focus", (path) => {
      this.rememberScenePath(path);
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.patchLeafOpenFile(leaf);
      this.redirectManuscriptLeaf(leaf);
    }));
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.patchOpenLeaves();
      this.redirectOpenManuscriptLeaves();
    }));
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      this.redirectRecentStoryLineFileOpen(file);
    }));

    this.installGetLeafPatch();
    this.installOpenLinkTextPatch();
    if (typeof this.app.workspace.onLayoutReady === "function") {
      this.app.workspace.onLayoutReady(() => {
        this.patchOpenLeaves();
        this.redirectOpenManuscriptLeaves();
      });
    } else {
      window.setTimeout(() => {
        this.patchOpenLeaves();
        this.redirectOpenManuscriptLeaves();
      }, 0);
    }
  }

  installGetLeafPatch() {
    const workspace = this.app.workspace;
    if (!workspace || workspace.__novelerStoryLineBridgeGetLeafPatched) {
      return;
    }

    const originalGetLeaf = workspace.getLeaf.bind(workspace);
    this.originalGetLeaf = originalGetLeaf;
    workspace.__novelerStoryLineBridgeGetLeafPatched = true;
    this.getLeafWrapper = (...args) => {
      const leaf = originalGetLeaf(...args);
      this.patchLeafOpenFile(leaf);
      return leaf;
    };
    workspace.getLeaf = this.getLeafWrapper;

    this.register(() => this.restoreGetLeafPatch());
  }

  restoreGetLeafPatch() {
    const workspace = this.app.workspace;
    if (workspace && this.originalGetLeaf && workspace.__novelerStoryLineBridgeGetLeafPatched) {
      if (workspace.getLeaf === this.getLeafWrapper) {
        workspace.getLeaf = this.originalGetLeaf;
        delete workspace.__novelerStoryLineBridgeGetLeafPatched;
      }
    }
    this.originalGetLeaf = null;
    this.getLeafWrapper = null;
  }

  installOpenLinkTextPatch() {
    const workspace = this.app.workspace;
    if (!workspace || typeof workspace.openLinkText !== "function" || workspace.__novelerStoryLineBridgeOpenLinkTextPatched) {
      return;
    }

    const originalOpenLinkText = workspace.openLinkText.bind(workspace);
    this.originalOpenLinkText = originalOpenLinkText;
    workspace.__novelerStoryLineBridgeOpenLinkTextPatched = true;
    this.openLinkTextWrapper = async (linktext, sourcePath, newLeaf, openState) => {
      const noveler = typeof window !== "undefined" ? window.Noveler : null;
      if (noveler && typeof noveler.isAnnotationLink === "function" && noveler.isAnnotationLink(linktext)) {
        const handled = await noveler.openAnnotationLink(linktext, sourcePath);
        if (handled) {
          return;
        }
      }
      const scenePath = this.resolveLinkTextToScenePath(linktext, sourcePath);
      if (scenePath && this.isEnabled() && this.settings.replaceStoryLineSceneOpens) {
        await this.openSceneInNoveler(scenePath, {
          source: "storyline-open-link",
          targetLeaf: this.app.workspace.activeLeaf,
          replaceLeaf: true
        });
        return;
      }
      return originalOpenLinkText(linktext, sourcePath, newLeaf, openState);
    };
    workspace.openLinkText = this.openLinkTextWrapper;

    this.register(() => this.restoreOpenLinkTextPatch());
  }

  restoreOpenLinkTextPatch() {
    const workspace = this.app.workspace;
    if (workspace && this.originalOpenLinkText && workspace.__novelerStoryLineBridgeOpenLinkTextPatched) {
      if (workspace.openLinkText === this.openLinkTextWrapper) {
        workspace.openLinkText = this.originalOpenLinkText;
        delete workspace.__novelerStoryLineBridgeOpenLinkTextPatched;
      }
    }
    this.originalOpenLinkText = null;
    this.openLinkTextWrapper = null;
  }

  resolveLinkTextToScenePath(linktext, sourcePath) {
    const raw = normalizeVaultPath(linktext);
    if (this.isStoryLineScenePath(raw)) {
      return raw;
    }

    const linkedFile = this.app.metadataCache
      && typeof this.app.metadataCache.getFirstLinkpathDest === "function"
      ? this.app.metadataCache.getFirstLinkpathDest(String(linktext || ""), sourcePath || "")
      : null;
    if (linkedFile instanceof TFile && this.isStoryLineScenePath(linkedFile.path)) {
      return linkedFile.path;
    }

    const directFile = this.app.vault.getAbstractFileByPath(raw);
    if (directFile instanceof TFile && this.isStoryLineScenePath(directFile.path)) {
      return directFile.path;
    }

    return "";
  }

  patchOpenLeaves() {
    const workspace = this.app.workspace;
    if (!workspace) {
      return;
    }

    if (typeof workspace.iterateAllLeaves === "function") {
      workspace.iterateAllLeaves((leaf) => this.patchLeafOpenFile(leaf));
      return;
    }

    const leaves = [];
    if (workspace.activeLeaf) {
      leaves.push(workspace.activeLeaf);
    }
    for (const type of [NOVELER_VIEW_TYPE, STORYLINE_MANUSCRIPT_VIEW_TYPE, "markdown"]) {
      try {
        leaves.push(...(workspace.getLeavesOfType(type) || []));
      } catch (error) {
        // Some Obsidian versions throw for unknown view types.
      }
    }
    for (const leaf of leaves) {
      this.patchLeafOpenFile(leaf);
    }
  }

  patchLeafOpenFile(leaf) {
    if (!leaf || this.patchedLeaves.has(leaf) || typeof leaf.openFile !== "function") {
      return leaf;
    }

    const originalOpenFile = leaf.openFile.bind(leaf);
    this.patchedLeaves.set(leaf, leaf.openFile);
    leaf.openFile = async (file, openState) => {
      if (this.shouldRedirectOpenFile(file)) {
        await this.openSceneInNoveler(file.path, {
          source: "storyline-open-file",
          targetLeaf: leaf,
          replaceLeaf: true
        });
        return;
      }
      return originalOpenFile(file, openState);
    };
    return leaf;
  }

  restorePatchedLeaves() {
    for (const [leaf, originalOpenFile] of this.patchedLeaves.entries()) {
      if (leaf && originalOpenFile) {
        leaf.openFile = originalOpenFile;
      }
    }
    this.patchedLeaves.clear();
  }

  shouldRedirectOpenFile(file) {
    if (!this.isEnabled() || !this.settings.replaceStoryLineSceneOpens || !(file instanceof TFile)) {
      return false;
    }
    return this.isStoryLineScenePath(file.path);
  }

  getActiveViewType() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    if (!view || typeof view.getViewType !== "function") {
      return "";
    }
    return String(view.getViewType() || "");
  }

  onStoryLineClick(event) {
    if (!this.isEnabled()) {
      return;
    }

    this.rememberSceneFromEvent(event);

    if (!this.settings.replaceManuscriptView || !this.isManuscriptTabEvent(event)) {
      return;
    }

    const scenePath = this.getScenePathFromEvent(event) || this.getActiveScenePath();
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    this.openSceneInNoveler(scenePath, {
      source: "storyline-manuscript-tab",
      targetLeaf: this.app.workspace.activeLeaf,
      replaceLeaf: true
    });
  }

  onStoryLineDoubleClick(event) {
    if (!this.isEnabled() || !this.settings.replaceStoryLineSceneOpens) {
      return;
    }

    const scenePath = this.getScenePathFromEvent(event);
    if (!scenePath) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    this.rememberScenePath(scenePath);
    this.openSceneInNoveler(scenePath, {
      source: "storyline-double-click"
    });
  }

  isManuscriptTabEvent(event) {
    const target = event.target;
    if (!target || typeof target.closest !== "function") {
      return false;
    }

    const tab = target.closest(".story-line-view-tab, .sl-view-tab, button, [role='tab'], [data-view], [data-type]");
    if (!tab) {
      return false;
    }

    const label = getElementText(tab).toLowerCase();
    if (label !== "manuscript") {
      return false;
    }

    return this.isInsideStoryLineSurface(tab);
  }

  isInsideStoryLineSurface(element) {
    let current = element;
    while (current) {
      const classes = getClassList(current);
      if (classes.some((className) => className.startsWith("story-line-") || className.startsWith("sl-"))) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  rememberSceneFromEvent(event) {
    const scenePath = this.getScenePathFromEvent(event);
    if (scenePath) {
      this.rememberScenePath(scenePath);
    } else if (this.isInsideStoryLineSurface(event.target)) {
      this.lastStoryLineInteractionAt = Date.now();
    }
  }

  getScenePathFromEvent(event) {
    const target = event && event.target;
    const dataEl = closestWithDataPath(target);
    if (!dataEl) {
      return "";
    }

    const path = dataEl.getAttribute("data-path")
      || dataEl.getAttribute("data-file-path")
      || dataEl.getAttribute("data-scene-path")
      || dataEl.getAttribute("data-href")
      || "";
    return this.isStoryLineScenePath(path) ? normalizeVaultPath(path) : "";
  }

  rememberScenePath(path) {
    const scenePath = normalizeVaultPath(path);
    this.lastStoryLineInteractionAt = Date.now();
    if (this.isStoryLineScenePath(scenePath)) {
      this.lastScenePath = scenePath;
    }
  }

  getActiveScenePath() {
    if (this.isStoryLineScenePath(this.lastScenePath)) {
      return this.lastScenePath;
    }

    const selectedFromDom = this.getSelectedScenePathFromDom();
    if (selectedFromDom) {
      return selectedFromDom;
    }

    const selectedFromStoryLine = this.getSelectedScenePathFromStoryLine();
    if (selectedFromStoryLine) {
      return selectedFromStoryLine;
    }

    const activeFile = this.app.workspace.getActiveFile && this.app.workspace.getActiveFile();
    return activeFile && this.isStoryLineScenePath(activeFile.path) ? activeFile.path : "";
  }

  getSelectedScenePathFromDom() {
    const selectors = [
      ".scene-card.selected[data-path]",
      ".scene-card.is-selected[data-path]",
      ".timeline-entry.selected[data-path]",
      ".story-line-timeline-item.selected[data-path]",
      "[data-path].selected",
      "[data-scene-path].selected"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const path = element && (element.getAttribute("data-path") || element.getAttribute("data-scene-path"));
      if (this.isStoryLineScenePath(path)) {
        return normalizeVaultPath(path);
      }
    }
    return "";
  }

  getSelectedScenePathFromStoryLine() {
    const storyLine = this.getStoryLinePlugin();
    const sceneManager = storyLine && storyLine.sceneManager;
    const candidates = [
      sceneManager && sceneManager.selectedScene,
      storyLine && storyLine.selectedScene,
      storyLine && storyLine.currentScene,
      storyLine && storyLine.activeScene
    ];

    if (this.app.workspace && typeof this.app.workspace.iterateAllLeaves === "function") {
      this.app.workspace.iterateAllLeaves((leaf) => {
        const view = leaf && leaf.view;
        if (!view) {
          return;
        }
        candidates.push(
          view.selectedScene,
          view.currentScene,
          view.activeScene,
          view.focusedScenePath,
          view.currentScenePath
        );
        if (view.selectedScenes && typeof view.selectedScenes.values === "function") {
          for (const selectedPath of view.selectedScenes.values()) {
            candidates.push(selectedPath);
          }
        }
        if (view.inspectorComponent && typeof view.inspectorComponent.getCurrentScene === "function") {
          candidates.push(view.inspectorComponent.getCurrentScene());
        }
      });
    }

    for (const candidate of candidates) {
      const path = typeof candidate === "string" ? candidate : candidate && (candidate.filePath || candidate.path);
      if (this.isStoryLineScenePath(path)) {
        return normalizeVaultPath(path);
      }
    }

    return "";
  }

  redirectOpenManuscriptLeaves() {
    if (!this.isEnabled() || !this.settings.replaceManuscriptView) {
      return;
    }
    for (const leaf of this.app.workspace.getLeavesOfType(STORYLINE_MANUSCRIPT_VIEW_TYPE) || []) {
      this.redirectManuscriptLeaf(leaf);
    }
  }

  async redirectManuscriptLeaf(leaf) {
    if (!this.isEnabled() || !this.settings.replaceManuscriptView || !leaf || this.redirectingLeaves.has(leaf)) {
      return;
    }
    const view = leaf.view;
    const type = view && typeof view.getViewType === "function" ? view.getViewType() : "";
    if (type !== STORYLINE_MANUSCRIPT_VIEW_TYPE) {
      return;
    }

    this.redirectingLeaves.add(leaf);
    try {
      await this.openSceneInNoveler(this.getActiveScenePath(), {
        source: "storyline-manuscript-view",
        targetLeaf: leaf,
        replaceLeaf: true
      });
    } finally {
      this.redirectingLeaves.delete(leaf);
    }
  }

  async redirectRecentStoryLineFileOpen(file) {
    if (!this.shouldRedirectOpenFile(file)) {
      return;
    }

    const sourceLeaf = this.app.workspace.activeLeaf;
    await this.openSceneInNoveler(file.path, {
      source: "storyline-file-open",
      targetLeaf: sourceLeaf,
      replaceLeaf: true
    });

    const novelerLeaf = (this.app.workspace.getLeavesOfType(NOVELER_VIEW_TYPE) || []).find((leaf) => {
      const view = leaf && leaf.view;
      return view && normalizeVaultPath(view.currentDocumentPath) === normalizeVaultPath(file.path);
    });
    if (
      novelerLeaf
      && sourceLeaf
      && sourceLeaf !== novelerLeaf
      && typeof sourceLeaf.detach === "function"
      && this.getLeafViewType(sourceLeaf) === "markdown"
      && this.getLeafFilePath(sourceLeaf) === normalizeVaultPath(file.path)
    ) {
      sourceLeaf.detach();
    }
  }

  getLeafViewType(leaf) {
    const view = leaf && leaf.view;
    return view && typeof view.getViewType === "function" ? String(view.getViewType() || "") : "";
  }

  getLeafFilePath(leaf) {
    const view = leaf && leaf.view;
    if (view && view.file instanceof TFile) {
      return normalizeVaultPath(view.file.path);
    }
    const viewState = leaf && typeof leaf.getViewState === "function" ? leaf.getViewState() : null;
    const state = viewState && viewState.state;
    return normalizeVaultPath(state && (state.file || state.path));
  }

  async openSceneInNoveler(path, options = {}) {
    const scenePath = normalizeVaultPath(path || this.getActiveScenePath());
    if (scenePath && !this.isStoryLineScenePath(scenePath)) {
      new Notice("Noveler bridge only opens Markdown files inside a project's Scenes folder.");
      return;
    }

    const noveler = this.getNovelerApi();
    if (!noveler && !(options.targetLeaf && options.replaceLeaf)) {
      new Notice("Noveler is not available for this StoryLine scene.");
      return;
    }

    const state = {
      path: scenePath,
      source: options.source || "storyline"
    };

    if (noveler && typeof noveler.openScene === "function") {
      await noveler.openScene(scenePath, Object.assign({}, options, state));
      return;
    }

    const existingLeaf = this.app.workspace.getLeavesOfType(NOVELER_VIEW_TYPE)[0];
    if (existingLeaf) {
      await existingLeaf.setViewState({ type: NOVELER_VIEW_TYPE, active: true, state });
      this.app.workspace.revealLeaf(existingLeaf);
      return;
    }

    if (options.targetLeaf && options.replaceLeaf) {
      try {
        await options.targetLeaf.setViewState({
          type: NOVELER_VIEW_TYPE,
          active: true,
          state
        });
        this.app.workspace.revealLeaf(options.targetLeaf);
        return;
      } catch (error) {
        console.error("[Noveler StoryLine Bridge] Could not replace leaf with Noveler.", error);
      }
    }

    try {
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: NOVELER_VIEW_TYPE,
        active: true,
        state
      });
      this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      console.error("[Noveler StoryLine Bridge] Could not open Noveler.", error);
      new Notice("Noveler is not available for this StoryLine scene.");
    }
  }
}

module.exports = NovelerStoryLineBridgePlugin;

},
"./antidote-bridge": function(module, exports, require) {
const { Notice, setIcon } = require("obsidian");
const { execFileSync, execSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const NOVELER_VIEW_TYPE = "noveler-manuscript-writer";
const NOTICE_CONNECT_FAILED = "Unable to communicate with Connectix Agent (Antidote).";
const NOTICE_ENABLE_NOVELER = "Open a document in Noveler before using Antidote Connect.";

class AntidoteTextZone {
  constructor(text, selectionStart, selectionEnd, id) {
    this.text = String(text || "");
    this.selectionStart = Number(selectionStart) || 0;
    this.selectionEnd = Number(selectionEnd) || 0;
    if (this.selectionEnd < this.selectionStart) {
      [this.selectionStart, this.selectionEnd] = [this.selectionEnd, this.selectionStart];
    }
    this.id = String(id || "0");
  }

  toJsonAPI() {
    return {
      texte: this.text,
      positionSelectionDebut: this.selectionStart,
      positionSelectionFin: this.selectionEnd,
      idZone: this.id,
      zoneEstEnFocus: true
    };
  }
}

class NovelerAntidoteDocument {
  constructor(documentAdapter) {
    this.documentAdapter = documentAdapter;
  }

  getLineBreak() {
    return this.documentAdapter.getLineBreak ? this.documentAdapter.getLineBreak() : "\n";
  }

  getTitle() {
    return this.documentAdapter.getTitle ? this.documentAdapter.getTitle() : "Noveler";
  }

  getPath() {
    return this.documentAdapter.getPath ? this.documentAdapter.getPath() : "";
  }

  getType() {
    return this.documentAdapter.getType ? this.documentAdapter.getType() : "markdown";
  }

  allowsLineBreaks() {
    return true;
  }

  keepsNonBreakingSpaces() {
    return true;
  }

  hasThinSpace() {
    return false;
  }

  async getTextZones() {
    const zones = this.documentAdapter.getZones ? await this.documentAdapter.getZones() : [];
    return zones.map((zone, index) => new AntidoteTextZone(
      zone.text,
      zone.selectionStart,
      zone.selectionEnd,
      zone.id || String(index)
    ));
  }

  canReplace(id, start, end, context) {
    return this.documentAdapter.canReplace
      ? !!this.documentAdapter.canReplace(start, end, context, id)
      : false;
  }

  async replace(id, start, end, replacement) {
    if (!this.documentAdapter.replaceRange) {
      return false;
    }
    return !!(await this.documentAdapter.replaceRange(start, end, replacement, id));
  }

  selectRange(id, start, end) {
    if (this.documentAdapter.selectRange) {
      this.documentAdapter.selectRange(start, end, id);
    }
  }

  focus() {
    if (this.documentAdapter.focus) {
      this.documentAdapter.focus();
    }
  }

  isAvailable() {
    return this.documentAdapter.isAvailable ? !!this.documentAdapter.isAvailable() : false;
  }
}

class AntidoteConnectixSession {
  constructor(document) {
    this.document = document;
    this.prefs = {};
    this.ws = null;
    this.agentProcess = null;
    this.packetParts = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized && this.ws && this.ws.readyState === 1) {
      return true;
    }
    const agentPath = await this.getAgentConsolePath();
    if (!agentPath || !fs.existsSync(agentPath)) {
      throw new Error("Connectix Agent not found");
    }
    this.prefs = await this.readAgentPreferences(agentPath);
    await this.openWebSocket();
    this.initialized = true;
    return true;
  }

  close() {
    this.initialized = false;
    if (this.ws && typeof this.ws.close === "function") {
      this.ws.close();
    }
    this.ws = null;
    if (this.agentProcess && !this.agentProcess.killed) {
      this.agentProcess.kill();
    }
    this.agentProcess = null;
  }

  launchCorrector() {
    this.sendConnectixMessage({ message: "LanceOutil", outilApi: "Correcteur" });
  }

  launchDictionary() {
    this.sendConnectixMessage({ message: "LanceOutil", outilApi: "Dictionnaires" });
  }

  launchGuide() {
    this.sendConnectixMessage({ message: "LanceOutil", outilApi: "Guides" });
  }

  async getAgentConsolePath() {
    if (process.platform === "win32") {
      const output = execSync('REG QUERY "HKEY_LOCAL_MACHINE\\SOFTWARE\\Druide informatique inc.\\Connectix" /v DossierConnectix', { windowsHide: true }).toString();
      const line = output.split(/\r?\n/).find((item) => item.includes("DossierConnectix")) || "";
      const parts = line.trim().split(/\s{2,}/);
      const folder = parts[parts.length - 1] || "";
      return folder ? path.join(folder, "AgentConnectixConsole.exe") : "";
    }
    if (process.platform === "darwin") {
      const plist = path.join(os.homedir(), "Library/Preferences/com.druide.Connectix.plist");
      const appPath = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :DossierApplication", plist]).toString().trim();
      return appPath ? path.join(appPath, "Contents/SharedSupport/AgentConnectixConsole") : "";
    }
    if (process.platform === "linux") {
      return "/usr/local/bin/AgentConnectixConsole";
    }
    return "";
  }

  readAgentPreferences(agentPath) {
    return new Promise((resolve, reject) => {
      let buffer = "";
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Timed out while reading Connectix Agent preferences"));
        }
      }, 10000);

      this.agentProcess = spawn(agentPath, ["--api"], { windowsHide: true });
      this.agentProcess.stdout.on("data", (chunk) => {
        if (settled) {
          return;
        }
        buffer += chunk.toString("utf8");
        const jsonStart = buffer.indexOf("{");
        if (jsonStart < 0) {
          return;
        }
        try {
          const prefs = JSON.parse(buffer.slice(jsonStart));
          settled = true;
          window.clearTimeout(timeout);
          resolve(prefs);
        } catch (error) {
          // The preferences JSON may arrive in more than one stdout chunk.
        }
      });
      this.agentProcess.on("error", (error) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(error);
        }
      });
      this.agentProcess.stdin.write("API");
    });
  }

  openWebSocket() {
    return new Promise((resolve, reject) => {
      const WebSocketConstructor = typeof WebSocket !== "undefined" ? WebSocket : null;
      if (!WebSocketConstructor) {
        reject(new Error("WebSocket is unavailable in this Obsidian runtime"));
        return;
      }
      this.ws = new WebSocketConstructor(`ws://127.0.0.1:${this.prefs.port}`);
      this.ws.addEventListener("message", (event) => this.receivePacket(event.data));
      this.ws.addEventListener("close", () => {
        this.initialized = false;
      });
      this.ws.addEventListener("open", () => resolve(true));
      this.ws.addEventListener("error", (event) => {
        this.initialized = false;
        reject(event.error || new Error("Connectix WebSocket failed"));
      }, { once: true });
    });
  }

  receivePacket(raw) {
    const text = typeof raw === "string" ? raw : String(raw || "");
    if (!text) {
      return;
    }
    let packet;
    try {
      packet = JSON.parse(text);
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Invalid Connectix packet.", error);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(packet, "idPaquet")) {
      const total = Number(packet.totalPaquet) || 1;
      const index = Math.max(0, (Number(packet.idPaquet) || 1) - 1);
      if (this.packetParts.length < total) {
        this.packetParts = new Array(total);
      }
      this.packetParts[index] = packet.donnees;
      if (this.hasAllPacketParts(total)) {
        const joined = this.packetParts.join("");
        this.packetParts = [];
        try {
          this.handleConnectixMessage(JSON.parse(joined)).catch((error) => console.error(error));
        } catch (error) {
          console.error("[Noveler Antidote Bridge] Invalid Connectix message.", error);
        }
      }
      return;
    }

    this.handleConnectixMessage(packet).catch((error) => console.error(error));
  }

  hasAllPacketParts(total) {
    for (let index = 0; index < total; index += 1) {
      if (this.packetParts[index] === undefined || this.packetParts[index] === "") {
        return false;
      }
    }
    return true;
  }

  async handleConnectixMessage(message) {
    const response = { idMessage: message.idMessage };
    if (message.message === "init") {
      response.titreDocument = this.document.getTitle();
      response.retourChariot = this.document.getLineBreak();
      response.filtreActif = this.document.getType();
      response.permetRetourChariot = this.document.allowsLineBreaks();
      response.permetEspaceInsecable = this.document.keepsNonBreakingSpaces();
      response.permetEspaceFin = this.document.hasThinSpace();
      response.remplaceSansSelection = true;
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "cheminDocument") {
      response.donnee = !this.document.getPath();
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "donneZonesTexte") {
      const zones = await this.document.getTextZones();
      response.donnees = zones.map((zone) => zone.toJsonAPI());
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "docEstDisponible") {
      response.donnees = this.document.isAvailable();
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "editionPossible") {
      const data = message.donnees || {};
      response.donnees = this.document.canReplace(
        data.idZone,
        data.positionDebut,
        data.positionFin,
        data.contexte
      );
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "remplace") {
      const data = message.donnees || {};
      await this.document.replace(
        data.idZone,
        data.positionRemplacementDebut,
        data.positionRemplacementFin,
        data.nouvelleChaine
      );
      this.document.focus();
      response.donnees = true;
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "selectionne") {
      const data = message.donnees || {};
      this.document.selectRange(data.idZone, data.positionDebut, data.positionFin);
      return;
    }
    if (message.message === "retourneAuDocument") {
      this.document.focus();
    }
  }

  sendConnectixResponse(response) {
    this.sendConnectixMessage(response);
  }

  sendConnectixMessage(message) {
    if (!this.ws || this.ws.readyState !== 1) {
      return;
    }
    this.ws.send(JSON.stringify({
      idPaquet: 0,
      totalPaquet: 1,
      donnees: JSON.stringify(message)
    }));
  }
}

class NovelerAntidoteBridgePlugin {
  constructor(host) {
    this.host = host;
    this.app = host.app;
    this.manifest = host.manifest;
  }

  addCommand(command) {
    return this.host.addCommand(command);
  }

  addStatusBarItem() {
    return this.host.addStatusBarItem();
  }

  registerDomEvent(...args) {
    return this.host.registerDomEvent(...args);
  }

  registerEvent(eventRef) {
    return this.host.registerEvent(eventRef);
  }

  async onload() {
    this.session = null;
    this.registerApi();
    this.createStatusBarItems();
    this.addCommand({
      id: "noveler-antidote-corrector",
      name: "Noveler Antidote: Correct selection",
      callback: () => this.runCorrector(false)
    });
    this.addCommand({
      id: "noveler-antidote-corrector-all",
      name: "Noveler Antidote: Correct whole document",
      callback: () => this.runCorrector(true)
    });
    this.addCommand({
      id: "noveler-antidote-dictionary",
      name: "Noveler Antidote: Open dictionary",
      callback: () => this.runDictionary()
    });
    this.addCommand({
      id: "noveler-antidote-guide",
      name: "Noveler Antidote: Open guide",
      callback: () => this.runGuide()
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.showOrHideIcons()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.showOrHideIcons()));
    this.registerDomEvent(window, "noveler-settings-changed", () => this.showOrHideIcons());
    if (typeof this.app.workspace.onLayoutReady === "function") {
      this.app.workspace.onLayoutReady(() => this.showOrHideIcons());
    } else {
      window.setTimeout(() => this.showOrHideIcons(), 0);
    }
  }

  onunload() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    if (window.NovelerAntidoteBridge && window.NovelerAntidoteBridge.plugin === this) {
      delete window.NovelerAntidoteBridge;
    }
  }

  registerApi() {
    window.NovelerAntidoteBridge = {
      plugin: this,
      isEnabled: () => this.isEnabled(),
      correct: () => this.runCorrector(false),
      correctAll: () => this.runCorrector(true),
      dictionary: () => this.runDictionary(),
      guide: () => this.runGuide()
    };
  }

  createStatusBarItems() {
    this.correctAllStatusBar = this.createStatusIcon("check-circle", "Antidote: Correct whole Noveler document", () => this.runCorrector(true));
    this.correctStatusBar = this.createStatusIcon("check", "Antidote: Correct Noveler selection", () => this.runCorrector(false));
    this.dictionaryStatusBar = this.createStatusIcon("book", "Antidote: Dictionary", () => this.runDictionary());
    this.guideStatusBar = this.createStatusIcon("book-open", "Antidote: Guide", () => this.runGuide());
    this.showOrHideIcons();
  }

  createStatusIcon(icon, label, onClick) {
    const item = this.addStatusBarItem();
    item.addClass("mod-clickable", "noveler-antidote-status");
    item.createSpan({ attr: { "aria-label-position": "top", "aria-label": label } }, (span) => setIcon(span, icon));
    item.onClickEvent(onClick);
    return item;
  }

  showOrHideIcons() {
    const visible = this.isEnabled() && this.isNovelerActive();
    for (const item of [this.correctAllStatusBar, this.correctStatusBar, this.dictionaryStatusBar, this.guideStatusBar]) {
      if (!item) {
        continue;
      }
      if (visible) {
        item.removeClass("hide");
      } else {
        item.addClass("hide");
      }
    }
  }

  isNovelerActive() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return !!(view && typeof view.getViewType === "function" && view.getViewType() === NOVELER_VIEW_TYPE);
  }

  getNovelerApi() {
    return typeof window !== "undefined" && window.Noveler ? window.Noveler : null;
  }

  isEnabled() {
    const noveler = this.getNovelerApi();
    return !!(noveler && typeof noveler.isAntidoteConnectEnabled === "function" && noveler.isAntidoteConnectEnabled());
  }

  createDocument(checkWholeDocument) {
    const noveler = this.getNovelerApi();
    if (!noveler || typeof noveler.createAntidoteDocument !== "function" || !this.isEnabled()) {
      return null;
    }
    const adapter = noveler.createAntidoteDocument({ checkWholeDocument });
    return adapter ? new NovelerAntidoteDocument(adapter) : null;
  }

  async runCorrector(checkWholeDocument) {
    const document = this.createDocument(checkWholeDocument);
    if (!document) {
      new Notice(NOTICE_ENABLE_NOVELER);
      return;
    }
    try {
      await this.startSession(document);
      this.session.launchCorrector();
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Could not launch corrector.", error);
      new Notice(NOTICE_CONNECT_FAILED);
    }
  }

  async runDictionary() {
    const document = this.createDocument(false);
    if (!document) {
      new Notice(NOTICE_ENABLE_NOVELER);
      return;
    }
    try {
      await this.startSession(document);
      this.session.launchDictionary();
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Could not launch dictionary.", error);
      new Notice(NOTICE_CONNECT_FAILED);
    }
  }

  async runGuide() {
    const document = this.createDocument(false);
    if (!document) {
      new Notice(NOTICE_ENABLE_NOVELER);
      return;
    }
    try {
      await this.startSession(document);
      this.session.launchGuide();
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Could not launch guide.", error);
      new Notice(NOTICE_CONNECT_FAILED);
    }
  }

  async startSession(document) {
    if (this.session) {
      this.session.close();
    }
    this.session = new AntidoteConnectixSession(document);
    await this.session.initialize();
  }
}

module.exports = NovelerAntidoteBridgePlugin;

},
"./entry": function(module, exports, require) {
const NovelerPlugin = require("./noveler");
const StoryLineBridgePlugin = require("./storyline-bridge");
const AntidoteBridgePlugin = require("./antidote-bridge");

const STORYLINE_DEFAULTS = {
  enabled: true,
  storyLineRoot: "StoryLine",
  replaceStoryLineSceneOpens: true,
  replaceManuscriptView: true,
  enableEpubExport: true,
  visualLinks: true,
  visualLinkCategories: {
    character: true,
    location: true,
    item: true
  },
  visualLinkColors: {
    character: "#8b5cf6",
    location: "#2f9e73",
    item: "#d97706"
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class NovelerStoryLineExpansionPlugin extends NovelerPlugin {
  async onload() {
    await super.onload();
    this.ensureStoryLineSettings();
    await this.migrateLegacyStoryLineSettings();
    this.ensureStoryLineSettings();

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
    this.settings.storyLineBridge.enabled = true;
    this.settings.storyLineBridge.enableEpubExport = true;
    this.settings.integrations = Object.assign({}, this.settings.integrations, {
      antidoteConnect: true,
      antidoteKeepFocus: true
    });
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

}
};
const __novelerCache = Object.create(null);
function __novelerRequire(id) {
  const factory = __novelerModules[id];
  if (!factory) {
    return __novelerNativeRequire(id);
  }
  if (__novelerCache[id]) {
    return __novelerCache[id].exports;
  }
  const bundledModule = { exports: {} };
  __novelerCache[id] = bundledModule;
  factory(bundledModule, bundledModule.exports, __novelerRequire);
  return bundledModule.exports;
}
module.exports = __novelerRequire("./entry");
