# Noveler - A StoryLine Expansion

**Noveler - A StoryLine Expansion**, by **Dylan Comas**, is a desktop Obsidian plugin for writers who want a focused manuscript editor inside their vault while still working with StoryLine projects.

It bundles the Noveler manuscript writer, StoryLine scene routing, formatted exports, and Antidote Connect support into one plugin. Instead of switching between separate bridge plugins and editor views, Noveler gives you a dedicated writing surface with page layout controls, focus writing, formatting tools, StoryLine integration, and export workflows built around long-form fiction.

<img width="2560" height="1392" alt="image" src="https://github.com/user-attachments/assets/93dc8528-733a-4e96-abe3-538de8115ce0" />

## Support Noveler

If Noveler helps your writing workflow, you can support development through PayPal:

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/paypalme/yesterdaytotomorrow)

---

## Quick Start

1. Install the plugin folder as `.obsidian/plugins/noveler-a-storyline-expansion/` inside your Obsidian vault.
2. Enable **Community plugins** in Obsidian if they are not already enabled.
3. Enable **Noveler - A StoryLine Expansion** from Obsidian's community plugin list.
4. Click the **Open Noveler** ribbon icon or run **Open Noveler manuscript writer** from the command palette.
5. Start writing in the Noveler editor, then save with `Ctrl/Cmd + S`.
6. Install and enable StoryLine to route its scenes and manuscript exports through Noveler.
7. Optional: install and enable Antidote Grammar Checker Integration if you use Antidote Connectix.

<img width="1106" height="1013" alt="image" src="https://github.com/user-attachments/assets/2480bae4-3698-4afb-b801-7234b681cbec" />
---

## Functionalities

### Dedicated Manuscript Editor

Noveler opens as its own Obsidian view type, separate from the standard Markdown editor. The editor is designed around manuscript writing, so the first screen is the writing workspace rather than a generic note view.

It includes a top formatting toolbar, a manuscript body, a status bar, live word and character counts, and commands that can be run from Obsidian's command palette.

### Page Mode

Page mode presents the manuscript as a visual page with configurable paper size, margins, zoom, header/footer sizing, and rulers. It is useful when you want the editor to feel closer to a printable manuscript or book layout.

<img width="1830" height="1385" alt="image" src="https://github.com/user-attachments/assets/646693eb-942b-4564-90a7-af5d1e3a5afa" />

Page mode supports:

- US Letter, A4, softcover book, pocket book, and custom page sizing.
- Configurable top, right, bottom, and left margins.
- Imperial or metric ruler units.
- Page zoom presets from compact views to large drafting views.
- Header and footer text sizing.
- Visual margin zones and ruler feedback.
- Persistent manual page breaks with `Ctrl/Cmd + Enter`.

This mode is especially useful when checking line length, page density, chapter headings, scene breaks, and the overall shape of a manuscript before exporting.

### Focus Mode

Focus mode strips the editor down for drafting. It can center the active writing area, use typewriter behavior, and dim text outside the current line or paragraph.

<img width="2517" height="1394" alt="image" src="https://github.com/user-attachments/assets/69f11746-d0b9-4762-8c93-38489455a802" />

Focus mode includes:

- Typewriter mode to keep the current line centered while writing.
- Current-line or current-paragraph focus scope.
- Optional dimming for unfocused text.
- A separate default zoom from Page mode.
- A cleaner workspace for drafting sessions.

Use Focus mode when you are generating prose and want fewer layout distractions. Use Page mode when you are reviewing manuscript structure, page flow, or export appearance.

### Formatting Toolbar

Noveler includes a responsive top toolbar for common writing and formatting actions. The toolbar adapts to narrower panes and keeps core controls available without requiring repeated command palette use.

<img width="986" height="47" alt="image" src="https://github.com/user-attachments/assets/b8eb90d3-93ea-4c9c-97a3-ab489e6cfdc6" />

Toolbar controls include:

- Font family selection, including available system fonts and fallback fonts.
- Font size controls.
- Bold, italic, underline, and strikethrough.
- Text color picker with reusable swatches.
- Heading controls for manuscript structure.
- Alignment controls: left, center, right, and justify.
- Line spacing presets, including single, 1.15, 1.5, and double.
- Bulleted and numbered lists.

### Manuscript Typography

Noveler exposes typography controls that matter for long-form writing, not just inline styling. You can tune the body text, headings, paragraph spacing, indentation, and scene-specific style behavior.

<img width="1108" height="1014" alt="image" src="https://github.com/user-attachments/assets/0449300b-c06e-4e5b-a236-970f3c204c43" />

Typography features include:

- Body font preset and custom font family.
- Font size, scale, weight, italic, small caps, kerning, and letter spacing.
- Line height and line spacing presets.
- Paragraph spacing before and after.
- First-line indent and hanging indent.
- Independent heading styles for Heading 1 through Heading 6.
- Heading font, size, weight, italic state, and alignment controls.

When editing StoryLine Markdown scenes, Noveler can preserve scene-specific typography in frontmatter or in stored plugin settings. That lets a scene keep its visual writing style without forcing every manuscript scene to look identical.

### Smart Writing Automation

Noveler can automate common manuscript cleanup while you type or save.

<img width="1113" height="1014" alt="image" src="https://github.com/user-attachments/assets/9aee7c51-9a7c-4e81-952c-d67b1acdcac3" />

Automation options include:

- Smart quotes while typing.
- Smart dashes while typing.
- Auto-capitalization after sentence-ending punctuation.
- Smart indenting that carries paragraph style classes across new paragraphs.
- Removing double spaces on save.
- Normalizing excessive line breaks on save.

These tools help keep a manuscript clean without sending text outside Obsidian or requiring a separate formatting pass after every session.

### StoryLine Integration

The StoryLine bridge routes StoryLine manuscript work through Noveler while keeping StoryLine as the project-management plugin.

<img width="2169" height="1389" alt="image" src="https://github.com/user-attachments/assets/46d6f479-9eba-4247-ad92-b32d46c261c2" />

Bridge settings include:

- Enable or disable StoryLine bridge behavior.
- Configure the StoryLine root folder, defaulting to `StoryLine`.
- Replace StoryLine scene opens with Noveler.
- Replace the StoryLine Manuscript tab with Noveler.
- Add ePub export support to StoryLine's export options.
- Choose the publication language written into ePub metadata.

When enabled, StoryLine scene clicks, scene opens, manuscript tab navigation, and compatible scene paths can be redirected into Noveler. Noveler reuses one dedicated editor tab rather than opening duplicate Noveler tabs. The bridge opens Markdown scene files directly inside a project's `Scenes` folder or in nested organization folders such as `Scenes/Act`.

Noveler can display visual-only links for StoryLine Characters, Locations, and Items directly in manuscript text. Each category has its own configurable color and bottom-bar visibility toggle. Links recognize entry names and supported nickname or alias fields, including custom Item fields named `NICKNAME / ALIAS`. Clicking a link opens the corresponding StoryLine entry without adding link markup to the Markdown scene or its exports.

<img width="847" height="1205" alt="image" src="https://github.com/user-attachments/assets/ba125cff-a06d-4185-bdc2-c37999d6411b" />

When text is selected in Noveler, the right-click menu provides searchable Character, Location, and Item submenus. Each submenu lists existing Codex entries and includes a creation action. New entries use a confirmation dialog so the StoryLine Name field and generated Markdown filename use the intended full entry name rather than necessarily using the selected text. Choosing an existing Character or Location adds the selection to its newline-separated Nickname / Alias field when it is not already present, then opens the entry for editing. StoryLine views and Noveler's colored links refresh automatically after Codex changes.

<img width="1053" height="514" alt="image" src="https://github.com/user-attachments/assets/beb0a020-9107-408f-9f42-5168501f5a9e" />

This keeps StoryLine responsible for planning, acts, chapters, scene ordering, and project structure, while Noveler handles the writing surface and formatted manuscript output.

### Formatted Exports

Noveler supports direct Markdown export from the standalone manuscript editor and formatted StoryLine manuscript exports through the StoryLine bridge.

<img width="422" height="842" alt="image" src="https://github.com/user-attachments/assets/b018d03c-2481-44d3-9ea8-477f9a658c00" />

Export options include:

- **Markdown export** from the active Noveler manuscript.
- **DOCX export** from StoryLine manuscripts with Noveler formatting.
- **PDF export** from StoryLine manuscripts with Noveler formatting.
- **ePub export** from StoryLine manuscripts when enabled.
- Configurable ePub publication language metadata.
- Optional book title heading.
- Optional act headings.
- Optional chapter headings.
- Scene title inclusion.
- Scene numbering.
- Corkboard note inclusion.
- Inactive scene inclusion.

Formatted StoryLine exports are written into an `Exports` folder inside the StoryLine project area. DOCX and ePub packages are generated directly by the plugin. PDF export uses Obsidian desktop's print-to-PDF capability and requires the desktop app.

### Antidote Connect Support

## ⚠️ REQUIRES: [Antidote Grammar Checker Integration, by Heziode](https://github.com/heziode/obsidian-antidote)

Noveler includes an Antidote Connect bridge for users who write with Druide Antidote and Connectix.

<img width="277" height="84" alt="image" src="https://github.com/user-attachments/assets/13e77a12-b1c5-4eb3-b74a-c89e22c9894e" />

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

The Antidote Grammar Checker Integration plugin and Antidote Connectix must be installed and available on the desktop system.

### Interface Language

English is embedded in `main.js`, so Noveler always has a complete offline interface without an additional language file. Non-English translations live in the repository's `.lang` directory and use locale filenames such as `fr-FR.json` with this structure:

```json
{
  "locale": "fr-FR",
  "name": "Francais (France)",
  "strings": {
    "Save settings": "Enregistrer les parametres"
  }
}
```

The language menu is beside the Noveler heading in Settings. Noveler queries the GitHub `.lang` directory to populate this menu automatically and excludes `en-US.json` because English is built in. Available non-English catalogs are downloaded into the installed plugin's `.lang` cache and updated when their GitHub files change. Previously downloaded languages therefore remain available without an internet connection. Added catalogs and updates to the active catalog are detected periodically, and labels, commands, menus, notices, editor controls, and integration UI update without reloading Obsidian.

To add a translation, commit a valid `xx-XX.json` catalog to `.lang` on the repository's `main` branch. It will appear in installed copies automatically. Missing or unavailable translations fall back to the embedded English source text. Keep placeholders such as `{value}` and `{value2}` unchanged in translated values.

Translations should describe each control in its Editor, Settings, or StoryLine context. Keep product names and installed font-family names unchanged.

### Settings And Legacy Migration

Noveler stores its settings in the plugin folder and can migrate from earlier Noveler-related plugin setups.

On first load, Noveler can import an existing settings file from:

```text
.obsidian/plugins/noveler/Noveler Settings.json
```

After migration, future settings are saved inside the `noveler-a-storyline-expansion` plugin folder.
---

## Key Features

- **Unified Obsidian plugin**: Noveler, StoryLine bridge behavior, formatted exports, and Antidote Connect support live in one bundle.
- **Dedicated manuscript writer**: A writing-first editor view built for long-form prose rather than general notes.
- **Page mode**: Visual manuscript pages with page size, zoom, margins, rulers, headers, and footers.
- **Focus mode**: A distraction-reduced drafting view with typewriter behavior and current-line or current-paragraph focus.
- **Rich formatting toolbar**: Fast access to fonts, text styling, colors, paragraph styles, headings, alignment, spacing, lists, and manuscript elements.
- **Scene-aware editing**: StoryLine Markdown scenes can open in Noveler while preserving frontmatter and scene-specific typography settings.
- **StoryLine manuscript routing**: Scene opens and the StoryLine Manuscript tab can be replaced by Noveler.
- **Colored StoryLine entity links**: Visual-only Character, Location, and Item links use configurable colors, aliases, and direct Codex navigation.
- **Selection-to-Codex workflow**: Search existing entries or create new Characters, Locations, and Items from selected manuscript text without leaving Noveler.
- **Formatted DOCX/PDF/ePub export**: StoryLine manuscripts can export with Noveler layout and typography.
- **Markdown export**: Standalone Noveler manuscripts can export back to Markdown.
- **Antidote Connect integration**: Correct selections, correct full documents, open dictionaries, and open guides from Noveler.
- **Smart writing cleanup**: Smart quotes, smart dashes, auto-capitalization, smart indenting, double-space cleanup, and line-break normalization.
- **Desktop-focused**: Built for Obsidian desktop, with desktop-only integrations such as PDF export and Antidote Connect.

---

## How To Install

### Manual Installation From A Release

1. Download the release files for **Noveler - A StoryLine Expansion**.
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
6. Enable **Noveler - A StoryLine Expansion**.
7. Run **Open Noveler manuscript writer** from the command palette or click the Noveler ribbon icon.

### Recommended Obsidian Setup

- Use Obsidian desktop version `1.5.0` or newer.
- Keep the plugin folder named `noveler-a-storyline-expansion`.
- Do not enable older separate Noveler bridge plugins alongside this bundle.
- If you use StoryLine, keep StoryLine installed and configure the StoryLine root folder in Noveler settings.
- If you use Antidote, install and enable Antidote Grammar Checker Integration and make sure Connectix is installed.

---

## Licensing

Noveler - A StoryLine Expansion is licensed under the **MIT License**.

Copyright (c) 2026 Dylan Comas.

See [LICENSE](LICENSE) for the full license text.
