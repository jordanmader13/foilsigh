# Foilsigh

A modern, browser-based presentation editor with live preview. Create beautiful slides using Markdown with support for images, diagrams, and themes.

> *Foilsigh* (pronounced "fwil-shee") is Irish for "reveal" - fitting for a Reveal.js-powered presentation tool.

## Features

- **Live Preview** - See your slides render in real-time as you type
- **Markdown Editing** - Write slides in familiar Markdown syntax with syntax highlighting
- **Image Support** - Import images with automatic compression and smart storage
- **Mermaid Diagrams** - Create flowcharts, sequence diagrams, mind maps, and more with live preview
- **Theming** - 12 built-in Reveal.js themes plus custom color controls
- **Fragment Animations** - Bullet points and images reveal one at a time
- **Auto-Save** - Work persists in your browser automatically
- **Export** - Download your presentation as a portable Markdown file

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 in your browser.

## Usage

### Slides

Separate slides with `---`:

```markdown
# First Slide

Some content here

---

# Second Slide

More content
```

### Images

Click **Add Image** to import images. They're automatically:
- Compressed to max 1920px
- Stored efficiently in IndexedDB
- Sized and aligned via presets

### Diagrams

Click **Add Diagram** to create Mermaid diagrams with live preview:

- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- ER diagrams
- Pie charts
- Gantt charts
- Mind maps

### Themes

Click **Theme** to:
- Choose from 12 Reveal.js themes (Black, White, Dracula, etc.)
- Customize primary, secondary, and tertiary colors

### Keyboard Navigation

In the preview pane:
- **Arrow keys** - Navigate slides and reveal fragments
- **Space** - Next slide/fragment
- **Escape** - Overview mode

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **CodeMirror 6** - Editor
- **Reveal.js** - Presentation framework
- **Mermaid** - Diagram rendering
- **IndexedDB** - Image storage

## Architecture

```
src/
├── components/
│   ├── MarkdownEditor.tsx   # CodeMirror editor with custom folding
│   ├── RevealPreview.tsx    # Live Reveal.js preview
│   ├── ImageImportModal.tsx # Image picker with compression
│   ├── DiagramModal.tsx     # Mermaid editor with live preview
│   └── ThemeSettings.tsx    # Theme and color customization
├── lib/
│   └── imageStore.ts        # IndexedDB image storage
├── App.tsx                  # Main app shell
└── App.css                  # Styles
```

## Storage

- **localStorage** - Markdown text and theme settings
- **IndexedDB** - Images (stored as blobs, referenced by content hash)

Data stays in your browser. Export to save a portable `.md` file with images inlined.

## License

MIT
