import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import { Range } from '@codemirror/state'

// Widget that displays a collapsed image placeholder
class ImageWidget extends WidgetType {
  constructor(readonly imageId: string) {
    super()
  }

  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-image-widget'
    span.textContent = `[Image: ${this.imageId.slice(0, 12)}...]`
    span.title = 'Click to expand'
    return span
  }

  eq(other: ImageWidget) {
    return other.imageId === this.imageId
  }

  ignoreEvent() {
    return false
  }
}

// Find all image tags and create decorations
function getImageDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const doc = view.state.doc

  // Match <img src="img-xxxx" ... /> tags
  const imgRegex = /<img\s+src="(img-[a-f0-9]+)"[^>]*\/?>/g

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text
    let match

    while ((match = imgRegex.exec(text)) !== null) {
      const from = line.from + match.index
      const to = line.from + match.index + match[0].length
      const imageId = match[1]

      // Check if cursor is within this image tag
      const selection = view.state.selection.main
      const cursorInImage = selection.from >= from && selection.to <= to

      // Only collapse if cursor is not in the image
      if (!cursorInImage) {
        decorations.push(
          Decoration.replace({
            widget: new ImageWidget(imageId),
          }).range(from, to)
        )
      }
    }
  }

  return Decoration.set(decorations, true)
}

// Plugin that manages image decorations
export const imageWidgetPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = getImageDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = getImageDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

// Theme for the image widget
export const imageWidgetTheme = EditorView.theme({
  '.cm-image-widget': {
    display: 'inline-block',
    padding: '2px 8px',
    margin: '0 2px',
    background: '#3c3c3c',
    border: '1px solid #4c4c4c',
    borderRadius: '4px',
    color: '#9cdcfe',
    fontSize: '12px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    verticalAlign: 'middle',
  },
  '.cm-image-widget:hover': {
    background: '#4c4c4c',
    borderColor: '#0e639c',
  },
})
