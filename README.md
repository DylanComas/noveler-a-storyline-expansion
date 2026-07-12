# Noveler: A StoryLine Expansion

**Noveler: A StoryLine Expansion**, by **Dylan Comas**, is a desktop Obsidian plugin for writers who want a focused manuscript editor inside their vault while still working with StoryLine projects.

It bundles the Noveler manuscript writer, StoryLine scene routing, formatted exports, and Antidote Connect support into one plugin. Instead of switching between separate bridge plugins and editor views, Noveler gives you a dedicated writing surface with page layout controls, focus writing, formatting tools, StoryLine integration, and export workflows built around long-form fiction.

#SCREENSHOT: Obsidian showing Noveler open on a manuscript, with the top toolbar, page editor, status bar, and word count visible#

## Support Noveler

If Noveler helps your writing workflow, you can support development through PayPal:

[Support Noveler on PayPal](https://www.paypal.com/paypalme/YOUR_PAYPAL_USERNAME)

> Maintainer note: replace `YOUR_PAYPAL_USERNAME` with the real PayPal.me username or replace the URL with your PayPal donation link before publishing this README.

## Quick Start

1. Install the plugin folder as `.obsidian/plugins/noveler-a-storyline-expansion/` inside your Obsidian vault.
2. Enable **Community plugins** in Obsidian if they are not already enabled.
3. Enable **Noveler: A StoryLine Expansion** from Obsidian's community plugin list.
4. Click the **Open Noveler** ribbon icon or run **Open Noveler manuscript writer** from the command palette.
5. Start writing in the Noveler editor, then save with `Ctrl/Cmd + S`.
6. Optional: enable the StoryLine bridge in Noveler settings if you want StoryLine scenes and manuscript exports to route through Noveler.
7. Optional: enable Antidote Connect in Noveler settings if you use Antidote Connectix.

#SCREENSHOT: Obsidian Settings showing Noveler enabled in the Community plugins panel#

## Functionalities

### Dedicated Manuscript Editor

Noveler opens as its own Obsidian view type, separate from the standard Markdown editor. The editor is designed around manuscript writing, so the first screen is the writing workspace rather than a generic note view.

It includes a top formatting toolbar, a manuscript body, a status bar, live word and character counts, and commands that can be run from Obsidian's command palette. The default manuscript file is `Noveler Manuscript.md`, and exported Markdown is written to `Noveler Export.md` unless you change the paths in settings.

#SCREENSHOT: Noveler editor showing a manuscript page with text, title, toolbar controls, and the live word count in the status bar#

Use this view when you want:

- A writing-first editor inside Obsidian.
- Persistent manuscript settings stored with the plugin.
- A cleaner drafting experience than a normal Markdown note.
- A command palette workflow for formatting, saving, exporting, and switching modes.

### Page Mode

Page mode presents the manuscript as a visual page with configurable paper size, margins, zoom, header/footer sizing, and rulers. It is useful when you want the editor to feel closer to a printable manuscript or book layout.

#SCREENSHOT: Page mode showing a white manuscript page, horizontal and vertical rulers, margin guides, page title/header area, and footer/page label#

Page mode supports:

- US Letter, A4, softcover book, pocket book, and custom page sizing.
- Configurable top, right, bottom, and left margins.
- Imperial or metric ruler units.
- Page zoom presets from compact views to large drafting views.
- Header and footer text sizing.
- Visual margin zones and ruler feedback.

This mode is especially useful when checking line length, page density, chapter headings, scene breaks, and the overall shape of a manuscript before exporting.

### Focus Mode

Focus mode strips the editor down for drafting. It can center the active writing area, use typewriter behavior, and dim text outside the current line or paragraph.

#SCREENSHOT: Focus mode showing a centered manuscript column with surrounding text dimmed and the active writing line highlighted#

Focus mode includes:

- Typewriter mode to keep the current line centered while writing.
- Current-line or current-paragraph focus scope.
- Optional dimming for unfocused text.
- A separate default zoom from Page mode.
- A cleaner workspace for drafting sessions.

Use Focus mode when you are generating prose and want fewer layout distractions. Use Page mode when you are reviewing manuscript structure, page flow, or export appearance.

### Formatting Toolbar

Noveler includes a responsive top toolbar for common writing and formatting actions. The toolbar adapts to narrower panes and keeps core controls available without requiring repeated command palette use.

#SCREENSHOT: Close-up of the Noveler top toolbar showing font controls, style buttons, text color picker, paragraph styles, alignment, and list buttons#

Toolbar controls include:

- Font preset selection: serif, sans-serif, or monospace.
- Font family selection, including available system fonts and fallback fonts.
- Font size and font scale controls.
- Bold, italic, underline, and strikethrough.
- Text color picker with reusable swatches.
- Paragraph style selection for normal text, dialogue, block quote, scene breaks, and centered ornaments.
- Heading controls for manuscript structure.
- Alignment controls: left, center, right, and justify.
- Line spacing presets, including single, 1.15, 1.5, and double.
- Bulleted and numbered lists.

Noveler also provides a floating formatting toolbar and context menu actions for selected text, so small edits can happen close to the selection.

#SCREENSHOT: Floating toolbar above selected text with bold, italic, underline, strikethrough, quote, and heading actions#

### Manuscript Typography

Noveler exposes typography controls that matter for long-form writing, not just inline styling. You can tune the body text, headings, paragraph spacing, indentation, and scene-specific style behavior.

#SCREENSHOT: Noveler settings showing typography, heading style rows, font size, weight, italic, and alignment controls#

Typography features include:

- Body font preset and custom font family.
- Font size, scale, weight, italic, small caps, kerning, and letter spacing.
- Line height and line spacing presets.
- Paragraph spacing before and after.
- First-line indent and hanging indent.
- Independent heading styles for Heading 1 through Heading 6.
- Heading font, size, weight, italic state, and alignment controls.

When editing StoryLine Markdown scenes, Noveler can preserve scene-specific typography in frontmatter or in stored plugin settings. That lets a scene keep its visual writing style without forcing every manuscript scene to look identical.

### Paragraph Styles And Manuscript Elements

Noveler includes commands and toolbar actions for manuscript-specific blocks:

#SCREENSHOT: A manuscript page showing normal paragraphs, dialogue styling, a block quote, a centered scene break ornament, and a checklist#

Supported manuscript elements include:

- Normal paragraphs.
- Dialogue paragraphs.
- Block quotes.
- Scene breaks.
- Centered ornaments.
- Horizontal rules.
- Headings from level 1 to level 6.
- Bulleted lists.
- Numbered lists.
- Checklists.
- Inline bold, italic, underline, strikethrough, superscript, and subscript.

The editor converts between editable HTML and saved Markdown where appropriate, while preserving frontmatter for Markdown scenes.

### Smart Writing Automation

Noveler can automate common manuscript cleanup while you type or save.

#SCREENSHOT: Noveler settings showing Smart quotes, Smart dashes, Auto-capitalization, Smart indenting, Remove double spaces, and Normalize line breaks toggles#

Automation options include:

- Smart quotes while typing.
- Smart dashes while typing.
- Auto-capitalization after sentence-ending punctuation.
- Smart indenting that carries paragraph style classes across new paragraphs.
- Removing double spaces on save.
- Normalizing excessive line breaks on save.
- Manual commands for removing double spaces, normalizing line breaks, and smartening punctuation.

These tools help keep a manuscript clean without sending text outside Obsidian or requiring a separate formatting pass after every session.

### File Opening, Importing, And Frontmatter Preservation

Noveler can open and import supported writing files directly into the manuscript editor.

#SCREENSHOT: A Markdown or HTML file being dragged into the Noveler editor, with the drop overlay visible#

File workflow features include:

- Drag-and-drop opening for Markdown, text, and HTML files.
- Import folder support using `Noveler Imports` by default.
- Safe imported filenames.
- Markdown frontmatter preservation.
- Scene title detection from frontmatter `title` or `name`, with filename fallback.
- Markdown scene support when editing StoryLine scene files.

When Noveler opens a Markdown scene, it splits frontmatter from body content, edits the body in the manuscript editor, and merges the frontmatter back during save.

### StoryLine Bridge

The StoryLine bridge routes StoryLine manuscript work through Noveler while keeping StoryLine as the project-management plugin.

#SCREENSHOT: Noveler settings showing StoryLine bridge enabled, StoryLine root folder, Replace StoryLine scene opens, Replace StoryLine Manuscript tab, and Show EPUB export#

Bridge settings include:

- Enable or disable StoryLine bridge behavior.
- Configure the StoryLine root folder, defaulting to `StoryLine`.
- Replace StoryLine scene opens with Noveler.
- Replace the StoryLine Manuscript tab with Noveler.
- Add ePub export support to StoryLine's export options.

When enabled, StoryLine scene clicks, scene opens, manuscript tab navigation, and compatible scene paths can be redirected into Noveler. The bridge only opens Markdown scene files under the configured StoryLine root with a valid StoryLine scene folder path.

#SCREENSHOT: StoryLine project view with a scene selected and the same scene opened inside Noveler#

This keeps StoryLine responsible for planning, acts, chapters, scene ordering, and project structure, while Noveler handles the writing surface and formatted manuscript output.

### Formatted Exports

Noveler supports direct Markdown export from the standalone manuscript editor and formatted StoryLine manuscript exports through the StoryLine bridge.

#SCREENSHOT: StoryLine export modal showing DOCX, PDF, and ePub options plus Noveler export heading checkboxes#

Export options include:

- **Markdown export** from the active Noveler manuscript.
- **DOCX export** from StoryLine manuscripts with Noveler formatting.
- **PDF export** from StoryLine manuscripts with Noveler formatting.
- **ePub export** from StoryLine manuscripts when enabled.
- Optional book title heading.
- Optional act headings.
- Optional chapter headings.
- Scene title inclusion.
- Scene numbering.
- Corkboard note inclusion.
- Inactive scene inclusion.

Formatted StoryLine exports are written into an `Exports` folder inside the StoryLine project area. DOCX and ePub packages are generated directly by the plugin. PDF export uses Obsidian desktop's print-to-PDF capability and requires the desktop app.

#SCREENSHOT: A vault file explorer showing the StoryLine project Exports folder with generated DOCX, PDF, and EPUB files#

### Antidote Connect Support

Noveler includes an Antidote Connect bridge for users who write with Druide Antidote and Connectix.

#SCREENSHOT: Noveler active in Obsidian with Antidote status bar icons visible for correct document, correct selection, dictionary, and guide#

Antidote features include:

- Correct the selected Noveler text.
- Correct the whole active Noveler document.
- Open Antidote dictionaries.
- Open Antidote guides.
- Keep Noveler focused on the selected Antidote correction.
- Return replacements from Antidote into the active Noveler document.

Available commands include:

- **Noveler Antidote: Correct selection**
- **Noveler Antidote: Correct whole document**
- **Noveler Antidote: Open dictionary**
- **Noveler Antidote: Open guide**

Antidote Connect must be enabled in Noveler settings, and Antidote Connectix must be installed and available on the desktop system.

### Settings And Legacy Migration

Noveler stores its settings in the plugin folder and can migrate from earlier Noveler-related plugin setups.

#SCREENSHOT: The plugin folder showing Noveler Settings.json next to manifest.json, main.js, and styles.css#

On first load, Noveler can import an existing settings file from:

```text
.obsidian/plugins/noveler/Noveler Settings.json
```

The bundled StoryLine bridge can also migrate settings from the former StoryLine bridge data file:

```text
.obsidian/plugins/noveler-storyline-bridge/data.json
```

After migration, future settings are saved inside the `noveler-a-storyline-expansion` plugin folder. The older bridge plugins are not required and should not be enabled alongside this bundle.

## Key Features

- **Unified Obsidian plugin**: Noveler, StoryLine bridge behavior, formatted exports, and Antidote Connect support live in one bundle.
- **Dedicated manuscript writer**: A writing-first editor view built for long-form prose rather than general notes.
- **Page mode**: Visual manuscript pages with page size, zoom, margins, rulers, headers, and footers.
- **Focus mode**: A distraction-reduced drafting view with typewriter behavior and current-line or current-paragraph focus.
- **Rich formatting toolbar**: Fast access to fonts, text styling, colors, paragraph styles, headings, alignment, spacing, lists, and manuscript elements.
- **Scene-aware editing**: StoryLine Markdown scenes can open in Noveler while preserving frontmatter and scene-specific typography settings.
- **StoryLine manuscript routing**: Scene opens and the StoryLine Manuscript tab can be replaced by Noveler.
- **Formatted DOCX/PDF/ePub export**: StoryLine manuscripts can export with Noveler layout and typography.
- **Markdown export**: Standalone Noveler manuscripts can export back to Markdown.
- **Antidote Connect integration**: Correct selections, correct full documents, open dictionaries, and open guides from Noveler.
- **Smart writing cleanup**: Smart quotes, smart dashes, auto-capitalization, smart indenting, double-space cleanup, and line-break normalization.
- **Drag-and-drop import**: Markdown, text, and HTML files can be opened or imported into Noveler.
- **Desktop-focused**: Built for Obsidian desktop, with desktop-only integrations such as PDF export and Antidote Connect.

## How To Install

### Manual Installation From A Release

1. Download the release files for **Noveler: A StoryLine Expansion**.
2. In your vault, create this folder if it does not already exist:

```text
.obsidian/plugins/noveler-a-storyline-expansion/
```

3. Copy these files into that folder:

```text
manifest.json
main.js
styles.css
```

4. Restart Obsidian or reload community plugins.
5. Open **Settings -> Community plugins**.
6. Enable **Noveler: A StoryLine Expansion**.
7. Run **Open Noveler manuscript writer** from the command palette or click the Noveler ribbon icon.

### Installation From Source

Clone or copy this repository into your vault's plugin folder:

```bash
cd path/to/your-vault/.obsidian/plugins
git clone https://github.com/YOUR_GITHUB_USERNAME/noveler-a-storyline-expansion.git
cd noveler-a-storyline-expansion
npm run build
```

Then enable **Noveler: A StoryLine Expansion** in Obsidian.

### Recommended Obsidian Setup

- Use Obsidian desktop version `1.5.0` or newer.
- Keep the plugin folder named `noveler-a-storyline-expansion`.
- Do not enable older separate Noveler bridge plugins alongside this bundle.
- If you use StoryLine, keep StoryLine installed and configure the StoryLine root folder in Noveler settings.
- If you use Antidote, enable Antidote Connect in Noveler settings and make sure Connectix is installed.

## Development

Obsidian loads the generated, self-contained `main.js`. The other JavaScript files are module sources used by the build script.

Build the bundled plugin:

```bash
npm run build
```

Run syntax checks, rebuild `main.js`, and run the lifecycle smoke test:

```bash
npm run check
```

## Licensing

Noveler: A StoryLine Expansion is licensed under the **MIT License**.

Copyright (c) 2026 Dylan Comas.

See [LICENSE](LICENSE) for the full license text.
