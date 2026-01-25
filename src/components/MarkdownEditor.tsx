import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { imageWidgetPlugin, imageWidgetTheme } from './imageWidget'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onEditorReady?: (view: EditorView) => void
  onCursorChange?: (pos: number) => void
}

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e1e',
    color: '#a8a8a8',
  },
  '.cm-content': {
    caretColor: '#ffffff',
    padding: '16px',
  },
  '.cm-cursor': {
    borderLeftColor: '#ffffff',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#264f78 !important',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    color: '#858585',
    border: 'none',
    paddingLeft: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d3a',
    color: '#d4d4d4',
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d3a',
    color: '#ffffff !important',
  },
  '.cm-activeLine *': {
    color: '#ffffff !important',
  },
  // Markdown syntax highlighting
  '.cm-header': {
    color: '#569cd6',
    fontWeight: 'bold',
  },
  '.cm-strong': {
    color: '#ce9178',
    fontWeight: 'bold',
  },
  '.cm-emphasis': {
    color: '#dcdcaa',
    fontStyle: 'italic',
  },
  '.cm-strikethrough': {
    textDecoration: 'line-through',
  },
  '.cm-link': {
    color: '#4ec9b0',
  },
  '.cm-url': {
    color: '#6a9955',
  },
  '.cm-atom': {
    color: '#b5cea8',
  },
})

export function MarkdownEditor({ value, onChange, onEditorReady, onCursorChange }: MarkdownEditorProps) {
  // Create cursor tracking extension
  const cursorTracker = EditorView.updateListener.of((update) => {
    if (update.selectionSet && onCursorChange) {
      const pos = update.state.selection.main.head
      onCursorChange(pos)
    }
  })

  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.lineWrapping,
        darkTheme,
        cursorTracker,
        imageWidgetPlugin,
        imageWidgetTheme,
      ]}
      onChange={onChange}
      onCreateEditor={(view) => onEditorReady?.(view)}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: true,
        autocompletion: false,
      }}
    />
  )
}
