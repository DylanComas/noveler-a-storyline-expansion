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
  fontPreset: "serif",
  customFontFamily: "",
  fontSize: 18,
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
  enabled: false,
  storyLineRoot: "StoryLine",
  replaceStoryLineSceneOpens: true,
  replaceManuscriptView: true,
  enableEpubExport: true
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
  return String(fontFamily || "Georgia")
    .split(",")[0]
    .replace(/['"]/g, "")
    .trim() || "Georgia";
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

function buildHtmlDocument(title, bodyHtml, layout, typography, forEpub) {
  const pageWidth = pxToCm(layout.pageWidth || NOVELER_DEFAULT_LAYOUT.pageWidth);
  const pageHeight = pxToCm(layout.pageHeight || NOVELER_DEFAULT_LAYOUT.pageHeight);
  const marginTop = pxToCm(layout.marginTop || NOVELER_DEFAULT_LAYOUT.marginTop);
  const marginRight = pxToCm(layout.marginRight || NOVELER_DEFAULT_LAYOUT.marginRight);
  const marginBottom = pxToCm(layout.marginBottom || NOVELER_DEFAULT_LAYOUT.marginBottom);
  const marginLeft = pxToCm(layout.marginLeft || NOVELER_DEFAULT_LAYOUT.marginLeft);
  const baseCss = typographyCss(typography);
  const htmlAttrs = forEpub ? ' xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en"' : ' lang="en"';
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

function createEpubPackage(title, bodyHtml, layout, baseTypography) {
  const identifier = `urn:uuid:${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const xhtml = buildHtmlDocument(title, bodyHtml, layout, baseTypography, true);
  const css = `body { ${typographyCss(baseTypography)}; } p { margin-top: 0; margin-bottom: 0; }`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
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
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
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
    return relativeSceneParts.length >= 2 && relativeSceneParts.every(Boolean);
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
      option.text = "ePub (.epub)";
      const pdfOption = Array.from(formatSelect.options).find((item) => item.value === "pdf");
      formatSelect.add(option, pdfOption ? pdfOption.index + 1 : undefined);
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
      new Notice("Enable the Noveler StoryLine bridge before exporting with Noveler formatting.");
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
      bytes = createEpubPackage(title, model.bodyHtml, layout, model.baseTypography);
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

    const leaf = this.app.workspace.activeLeaf;
    await this.openSceneInNoveler(file.path, {
      source: "storyline-file-open",
      targetLeaf: leaf,
      replaceLeaf: true
    });
  }

  async openSceneInNoveler(path, options = {}) {
    const scenePath = normalizeVaultPath(path || this.getActiveScenePath());
    if (scenePath && !this.isStoryLineScenePath(scenePath)) {
      new Notice("Noveler bridge only opens Markdown files under the configured StoryLine root with a Scenes/Act folder path.");
      return;
    }

    const noveler = this.getNovelerApi();
    if (!noveler && !(options.targetLeaf && options.replaceLeaf)) {
      new Notice("Enable Noveler before using the StoryLine bridge.");
      return;
    }

    const state = {
      path: scenePath,
      source: options.source || "storyline"
    };

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

    if (noveler && typeof noveler.openScene === "function") {
      await noveler.openScene(scenePath, state);
      return;
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
      new Notice("Enable Noveler before using the StoryLine bridge.");
    }
  }
}

module.exports = NovelerStoryLineBridgePlugin;
