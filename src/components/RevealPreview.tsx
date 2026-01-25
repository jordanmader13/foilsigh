import { useEffect, useRef, useMemo, useState } from 'react'
import Reveal from 'reveal.js'
import mermaid from 'mermaid'
import 'reveal.js/dist/reveal.css'
import type { ThemeConfig } from './ThemeSettings'
import { getImage } from '../lib/imageStore'

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
})

// Import all themes - Vite will handle code splitting
const themeModules = import.meta.glob('/node_modules/reveal.js/dist/theme/*.css', { query: '?inline', eager: false })

interface RevealPreviewProps {
  markdown: string
  targetSlide?: number
  themeConfig?: ThemeConfig
}

function markdownToSlides(markdown: string): string {
  // Split by horizontal rule (---) for slides
  const slides = markdown.split(/\n---\n/)

  return slides
    .map((slideContent) => {
      // Convert markdown to basic HTML
      let html = slideContent.trim()

      // Headers
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

      // Mermaid diagrams - with fragment class
      html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
        return `<div class="mermaid fragment">${code.trim()}</div>`
      })

      // Code blocks with syntax highlighting class
      html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        const langClass = lang ? ` class="language-${lang}"` : ''
        return `<pre><code${langClass}>${escapeHtml(code.trim())}</code></pre>`
      })

      // Inline code
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

      // Bold
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

      // Italic
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

      // Unordered lists - handle nested lists with indentation
      html = html.replace(/(?:^[ ]*- .*$\n?)+/gm, (listBlock) => {
        const lines = listBlock.split('\n').filter(line => line.match(/^[ ]*- /))

        const parseList = (items: { indent: number; text: string }[], depth: number = 0): string => {
          let result = '<ul>\n'
          let i = 0

          while (i < items.length) {
            const item = items[i]
            const expectedIndent = depth * 2

            if (item.indent === expectedIndent) {
              // Find nested items (items with greater indent that follow)
              const nestedItems: { indent: number; text: string }[] = []
              let j = i + 1
              while (j < items.length && items[j].indent > expectedIndent) {
                nestedItems.push(items[j])
                j++
              }

              if (nestedItems.length > 0) {
                result += `<li class="fragment">${item.text}\n${parseList(nestedItems, depth + 1)}</li>\n`
              } else {
                result += `<li class="fragment">${item.text}</li>\n`
              }
              i = j
            } else {
              i++
            }
          }

          result += '</ul>'
          return result
        }

        const items = lines.map(line => {
          const match = line.match(/^([ ]*)- (.*)$/)
          return {
            indent: match ? match[1].length : 0,
            text: match ? match[2] : ''
          }
        })

        return parseList(items)
      })

      // Links
      html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')

      // Images (markdown syntax) - with fragment class
      html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img class="fragment" src="$2" alt="$1" />')

      // HTML img tags (from image import) - add fragment class if not already present
      html = html.replace(/<img(?![^>]*class="[^"]*fragment)([^>]*)>/g, '<img class="fragment"$1>')

      // Paragraphs - wrap remaining text blocks
      html = html.replace(/^(?!<[hupoli]|$)(.+)$/gm, '<p>$1</p>')

      return `<section>${html}</section>`
    })
    .join('\n')
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function RevealPreview({ markdown, targetSlide, themeConfig }: RevealPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<Reveal.Api | null>(null)
  const themeStyleRef = useRef<HTMLStyleElement | null>(null)
  const colorStyleRef = useRef<HTMLStyleElement | null>(null)
  const slidesHtml = useMemo(() => markdownToSlides(markdown), [markdown])
  const [resolvedHtml, setResolvedHtml] = useState(slidesHtml)

  // Resolve image IDs to data URLs
  useEffect(() => {
    const resolveImages = async () => {
      let html = slidesHtml

      // Find all unique image ID references (img-xxxx format)
      const imageIdRegex = /img-[a-f0-9]{16}/g
      const imageIds = [...new Set(html.match(imageIdRegex) || [])]

      if (imageIds.length > 0) {
        console.log('Found image IDs to resolve:', imageIds)
      }

      // Fetch all images and build replacement map
      for (const imageId of imageIds) {
        try {
          const dataUrl = await getImage(imageId)
          if (dataUrl) {
            console.log('Resolved image:', imageId)
            // Replace all occurrences of this image ID
            html = html.split(imageId).join(dataUrl)
          } else {
            console.warn('Image not found in IndexedDB:', imageId)
          }
        } catch (err) {
          console.error('Error resolving image:', imageId, err)
        }
      }

      setResolvedHtml(html)
    }

    resolveImages()
  }, [slidesHtml])

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize Reveal.js
    const deck = new Reveal(containerRef.current, {
      embedded: true,
      hash: false,
      history: false,
      controls: true,
      progress: true,
      center: true,
      transition: 'slide',
      width: 960,
      height: 700,
      margin: 0.04,
      minScale: 0.2,
      maxScale: 2.0,
    })

    deck.initialize().then(() => {
      revealRef.current = deck
    })

    return () => {
      if (revealRef.current) {
        revealRef.current.destroy()
        revealRef.current = null
      }
    }
  }, [])

  // Load and apply theme CSS dynamically
  useEffect(() => {
    if (!themeConfig) return

    const themePath = `/node_modules/reveal.js/dist/theme/${themeConfig.theme}.css`
    const loader = themeModules[themePath]

    if (loader) {
      loader().then((module: unknown) => {
        // Remove old theme style
        if (themeStyleRef.current) {
          themeStyleRef.current.remove()
        }

        // Create new style element with theme CSS
        const style = document.createElement('style')
        style.textContent = (module as { default: string }).default
        document.head.appendChild(style)
        themeStyleRef.current = style

        // Force Reveal to re-layout after theme change
        if (revealRef.current) {
          revealRef.current.layout()
        }
      })
    }

    return () => {
      if (themeStyleRef.current) {
        themeStyleRef.current.remove()
        themeStyleRef.current = null
      }
    }
  }, [themeConfig?.theme])

  // Apply custom color overrides
  useEffect(() => {
    if (!themeConfig) return

    // Remove old color overrides
    if (colorStyleRef.current) {
      colorStyleRef.current.remove()
    }

    // Create style element with color overrides
    const style = document.createElement('style')
    style.textContent = `
      .reveal-wrapper .reveal h1,
      .reveal-wrapper .reveal h2,
      .reveal-wrapper .reveal h3,
      .reveal-wrapper .reveal h4 {
        color: ${themeConfig.secondaryColor} !important;
      }
      .reveal-wrapper .reveal {
        color: ${themeConfig.tertiaryColor} !important;
      }
      .reveal-wrapper .reveal p,
      .reveal-wrapper .reveal li {
        color: ${themeConfig.tertiaryColor} !important;
      }
      .reveal-wrapper .reveal a {
        color: ${themeConfig.primaryColor} !important;
      }
      /* Ensure non-active slides are hidden */
      .reveal-wrapper .reveal .slides > section:not(.present) {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      .reveal-wrapper .reveal .slides > section.present {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      /* Show all fragments in preview mode (no step-through) */
      .reveal-wrapper .reveal .fragment {
        opacity: 1 !important;
        visibility: visible !important;
      }
      .reveal-wrapper .reveal .progress span {
        background: ${themeConfig.primaryColor} !important;
      }
      .reveal-wrapper .reveal .controls button {
        color: ${themeConfig.primaryColor} !important;
      }
    `
    document.head.appendChild(style)
    colorStyleRef.current = style

    return () => {
      if (colorStyleRef.current) {
        colorStyleRef.current.remove()
        colorStyleRef.current = null
      }
    }
  }, [themeConfig?.primaryColor, themeConfig?.secondaryColor, themeConfig?.tertiaryColor])

  useEffect(() => {
    if (!revealRef.current) return

    // Update slides content
    const slidesContainer = containerRef.current?.querySelector('.slides')
    if (slidesContainer) {
      slidesContainer.innerHTML = resolvedHtml
      revealRef.current.sync()
      revealRef.current.layout()

      // Re-navigate to current slide after sync (sync resets slide state)
      if (targetSlide !== undefined) {
        const totalSlides = revealRef.current.getTotalSlides()
        const safeIndex = Math.min(targetSlide, totalSlides - 1)
        revealRef.current.slide(safeIndex, 0, 0)
      }

      // Render mermaid diagrams
      const mermaidElements = slidesContainer.querySelectorAll('.mermaid')
      if (mermaidElements.length > 0) {
        // Reset mermaid to re-render
        mermaidElements.forEach((el, i) => {
          el.removeAttribute('data-processed')
          el.id = `mermaid-${Date.now()}-${i}`
        })
        mermaid.run({ nodes: Array.from(mermaidElements) as HTMLElement[] })
      }
    }
  }, [resolvedHtml, targetSlide])

  // Navigate to target slide when cursor position changes
  useEffect(() => {
    if (!revealRef.current || targetSlide === undefined) return

    const currentIndex = revealRef.current.getIndices().h
    if (currentIndex !== targetSlide) {
      const totalSlides = revealRef.current.getTotalSlides()
      const safeIndex = Math.min(targetSlide, totalSlides - 1)
      revealRef.current.slide(safeIndex, 0, 0)
    }
  }, [targetSlide])

  return (
    <div className="reveal-wrapper">
      <div className="reveal" ref={containerRef}>
        <div className="slides" dangerouslySetInnerHTML={{ __html: resolvedHtml }} />
      </div>
    </div>
  )
}
