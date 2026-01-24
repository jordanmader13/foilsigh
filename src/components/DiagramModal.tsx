import { useState, useCallback, useRef, useEffect } from 'react'
import mermaid from 'mermaid'

// Initialize mermaid for the modal preview
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
})

interface DiagramModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (code: string) => void
}

const DIAGRAM_TEMPLATES = [
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Basic flow diagram with decisions',
    template: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
  },
  {
    id: 'sequence',
    name: 'Sequence Diagram',
    description: 'Show interactions between components',
    template: `sequenceDiagram
    participant User
    participant System
    participant Database
    User->>System: Request
    System->>Database: Query
    Database-->>System: Results
    System-->>User: Response`,
  },
  {
    id: 'class',
    name: 'Class Diagram',
    description: 'Object-oriented class structure',
    template: `classDiagram
    class Animal {
        +String name
        +makeSound()
    }
    class Dog {
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  },
  {
    id: 'state',
    name: 'State Diagram',
    description: 'State machine transitions',
    template: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Start
    Processing --> Success: Complete
    Processing --> Error: Fail
    Success --> [*]
    Error --> Idle: Retry`,
  },
  {
    id: 'er',
    name: 'ER Diagram',
    description: 'Entity relationship diagram',
    template: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ITEM : contains
    USER {
        int id
        string name
        string email
    }
    ORDER {
        int id
        date created
    }`,
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Simple pie chart',
    template: `pie title Distribution
    "Category A" : 40
    "Category B" : 30
    "Category C" : 20
    "Category D" : 10`,
  },
  {
    id: 'gantt',
    name: 'Gantt Chart',
    description: 'Project timeline',
    template: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: 2024-01-01, 7d
    Task 2: 2024-01-08, 5d
    section Phase 2
    Task 3: 2024-01-13, 10d`,
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Hierarchical idea map',
    template: `mindmap
  root((Main Topic))
    Branch 1
      Leaf 1a
      Leaf 1b
    Branch 2
      Leaf 2a
      Leaf 2b
    Branch 3`,
  },
]

export function DiagramModal({ isOpen, onClose, onInsert }: DiagramModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(DIAGRAM_TEMPLATES[0])
  const [code, setCode] = useState(DIAGRAM_TEMPLATES[0].template)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)

  // Render preview when code changes
  useEffect(() => {
    if (!isOpen || !previewRef.current) return

    const render = async () => {
      const currentRenderId = ++renderIdRef.current

      try {
        // Clear previous content
        if (previewRef.current) {
          previewRef.current.innerHTML = ''
        }

        // Small delay for debouncing rapid typing
        await new Promise(resolve => setTimeout(resolve, 300))

        // Check if this render is still current
        if (currentRenderId !== renderIdRef.current) return
        if (!previewRef.current) return

        const { svg } = await mermaid.render(`mermaid-preview-${currentRenderId}`, code)

        if (currentRenderId === renderIdRef.current && previewRef.current) {
          previewRef.current.innerHTML = svg
          setError(null)
        }
      } catch (e) {
        if (currentRenderId === renderIdRef.current) {
          setError((e as Error).message || 'Invalid diagram syntax')
        }
      }
    }

    render()
  }, [code, isOpen])

  const handleTemplateSelect = useCallback((template: typeof DIAGRAM_TEMPLATES[0]) => {
    setSelectedTemplate(template)
    setCode(template.template)
    setError(null)
  }, [])

  const handleInsert = useCallback(() => {
    const mermaidBlock = '```mermaid\n' + code + '\n```'
    onInsert(mermaidBlock)
    onClose()
  }, [code, onInsert, onClose])

  const handleClose = useCallback(() => {
    // Reset to first template
    setSelectedTemplate(DIAGRAM_TEMPLATES[0])
    setCode(DIAGRAM_TEMPLATES[0].template)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content diagram-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Diagram</h2>

        <div className="diagram-templates">
          <label>Template</label>
          <div className="template-grid">
            {DIAGRAM_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className={`template-button ${selectedTemplate.id === template.id ? 'active' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <span className="template-name">{template.name}</span>
                <span className="template-desc">{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="diagram-editor-container">
          <div className="diagram-editor">
            <label>Code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="diagram-preview">
            <label>Preview</label>
            <div className="diagram-preview-content" ref={previewRef}>
              {error && <div className="diagram-error">{error}</div>}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={handleClose}>
            Cancel
          </button>
          <button className="primary" onClick={handleInsert}>
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
