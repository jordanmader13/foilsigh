import { useState, useCallback, useMemo, useEffect } from 'react'
import type { EditorView } from '@codemirror/view'
import './App.css'
import { MarkdownEditor } from './components/MarkdownEditor'
import { RevealPreview, markdownToSlides } from './components/RevealPreview'
import { ImageImportModal } from './components/ImageImportModal'
import { ThemeSettings, DEFAULT_THEME_CONFIG, type ThemeConfig } from './components/ThemeSettings'
import { DiagramModal } from './components/DiagramModal'
import { exportWithInlinedImages } from './lib/imageStore'

const DEFAULT_MARKDOWN = `# Welcome to Foilsigh

Your presentation editor

---

## Features

- Live preview
- Markdown editing
- Code highlighting

---

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

---

## Get Started

Start editing to see your changes!
`

const STORAGE_KEYS = {
  markdown: 'foilsigh-markdown',
  theme: 'foilsigh-theme',
}


function loadJsonFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [markdown, setMarkdown] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.markdown)
    if (!stored) return DEFAULT_MARKDOWN
    // Handle case where it was previously JSON-stringified
    if (stored.startsWith('"') && stored.endsWith('"')) {
      try {
        return JSON.parse(stored)
      } catch {
        return stored
      }
    }
    return stored
  })
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() =>
    loadJsonFromStorage(STORAGE_KEYS.theme, DEFAULT_THEME_CONFIG)
  )
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false)
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false)

  // Persist markdown to localStorage (images are stored separately in IndexedDB)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.markdown, markdown)
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }, [markdown])

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(themeConfig))
  }, [themeConfig])

  const handleNew = useCallback(() => {
    if (confirm('Start a new presentation? Current work will be cleared.')) {
      setMarkdown(DEFAULT_MARKDOWN)
      setThemeConfig(DEFAULT_THEME_CONFIG)
    }
  }, [])

  // Calculate which slide the cursor is on by counting --- separators before cursor
  const activeSlide = useMemo(() => {
    const textBeforeCursor = markdown.slice(0, cursorPos)
    const separators = textBeforeCursor.match(/\n---\n/g)
    return separators ? separators.length : 0
  }, [markdown, cursorPos])

  const handleImageInsert = useCallback((html: string) => {
    if (!editorView) return
    const pos = editorView.state.selection.main.head
    editorView.dispatch({
      changes: { from: pos, insert: html + '\n' }
    })
    setIsImageModalOpen(false)
  }, [editorView])

  const handleDiagramInsert = useCallback((code: string) => {
    if (!editorView) return
    const pos = editorView.state.selection.main.head
    editorView.dispatch({
      changes: { from: pos, insert: code + '\n' }
    })
    setIsDiagramModalOpen(false)
  }, [editorView])

  const handleExportMarkdown = useCallback(async () => {
    // Inline images from IndexedDB into the markdown
    const exportedMarkdown = await exportWithInlinedImages(markdown)
    const blob = new Blob([exportedMarkdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'presentation.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [markdown])

  const handleExportHTML = useCallback(async () => {
    // Inline images from IndexedDB into the markdown
    const exportedMarkdown = await exportWithInlinedImages(markdown)
    // Convert to slides HTML
    const slidesHtml = markdownToSlides(exportedMarkdown)

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/${themeConfig.theme}.css">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 {
      color: ${themeConfig.secondaryColor} !important;
    }
    .reveal {
      color: ${themeConfig.tertiaryColor} !important;
    }
    .reveal p, .reveal li {
      color: ${themeConfig.tertiaryColor} !important;
    }
    .reveal a {
      color: ${themeConfig.primaryColor} !important;
    }
    .reveal .progress span {
      background: ${themeConfig.primaryColor} !important;
    }
    .reveal .controls button {
      color: ${themeConfig.primaryColor} !important;
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
${slidesHtml}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      controls: true,
      progress: true,
      center: true,
      transition: 'slide'
    });
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  </script>
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'presentation.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [markdown, themeConfig])

  const handleImportMarkdown = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        setMarkdown(text)
      }
    }
    input.click()
  }, [])

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Foilsigh</h1>
        <button className="secondary" onClick={handleNew}>
          New
        </button>
        <button className="secondary" onClick={handleImportMarkdown}>
          Import
        </button>
        <button className="secondary" onClick={handleExportMarkdown}>
          Export MD
        </button>
        <button className="secondary" onClick={() => setIsImageModalOpen(true)}>
          Add Image
        </button>
        <button className="secondary" onClick={() => setIsDiagramModalOpen(true)}>
          Add Diagram
        </button>
        <button className="secondary" onClick={() => setIsThemeSettingsOpen(true)}>
          Theme
        </button>
        <button onClick={handleExportHTML}>Export HTML</button>
      </header>
      <main className="main-content">
        <div className="editor-pane">
          <div className="editor-header">Markdown</div>
          <div className="editor-container">
            <MarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              onEditorReady={setEditorView}
              onCursorChange={setCursorPos}
            />
          </div>
        </div>
        <div className="preview-pane">
          <div className="preview-header">
            <span>Preview</span>
          </div>
          <div className="preview-container">
            <RevealPreview markdown={markdown} targetSlide={activeSlide} themeConfig={themeConfig} />
          </div>
        </div>
      </main>
      <ImageImportModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={handleImageInsert}
      />
      <ThemeSettings
        config={themeConfig}
        onChange={setThemeConfig}
        isOpen={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
      />
      <DiagramModal
        isOpen={isDiagramModalOpen}
        onClose={() => setIsDiagramModalOpen(false)}
        onInsert={handleDiagramInsert}
      />
    </div>
  )
}

export default App
