import { useState, useCallback, useMemo, useEffect } from 'react'
import type { EditorView } from '@codemirror/view'
import './App.css'
import { MarkdownEditor } from './components/MarkdownEditor'
import { RevealPreview } from './components/RevealPreview'
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
        <button>Export HTML</button>
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
