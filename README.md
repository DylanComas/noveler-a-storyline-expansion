# Noveler: A StoryLine Expansion

One Obsidian plugin containing the Noveler manuscript editor, StoryLine integration, formatted DOCX/PDF/EPUB exports, and Antidote Connect support.

## Installation

Install this folder as:

`.obsidian/plugins/noveler-a-storyline-expansion/`

Enable **Noveler: A StoryLine Expansion** in Obsidian. The former Noveler bridge plugins are not required and should not be enabled alongside this bundle.

On first load, the expansion imports an existing `.obsidian/plugins/noveler/Noveler Settings.json` file when present. Future saves are written inside this plugin's own folder.

StoryLine remains a separate project-management plugin. When the StoryLine bridge is enabled in Noveler settings, scene opens and the StoryLine Manuscript view route into Noveler.

## Development check

```bash
npm run build
npm run check
```

Obsidian loads the generated, self-contained `main.js`. The other JavaScript files are module sources used by the build script.
