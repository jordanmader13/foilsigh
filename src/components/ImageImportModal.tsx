import { useState, useRef, useCallback } from 'react'
import { storeImage } from '../lib/imageStore'

type SizePreset = 'full' | 'half' | 'thumbnail'
type Alignment = 'left' | 'center' | 'right'

interface ImageImportModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (html: string) => void
}

const sizeStyles: Record<SizePreset, string> = {
  full: 'max-width: 90%; max-height: 500px',
  half: 'max-width: 50%; max-height: 400px',
  thumbnail: 'max-width: 200px; max-height: 200px',
}

const alignmentStyles: Record<Alignment, string> = {
  left: 'margin-right: auto; margin-left: 0',
  center: 'margin-left: auto; margin-right: auto',
  right: 'margin-left: auto; margin-right: 0',
}

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.8

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    img.onload = () => {
      let { width, height } = img

      // Scale down if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_DIMENSION
          width = MAX_DIMENSION
        } else {
          width = (width / height) * MAX_DIMENSION
          height = MAX_DIMENSION
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      // Use JPEG for photos (smaller), PNG for images with transparency
      const isPng = file.type === 'image/png'
      const mimeType = isPng ? 'image/png' : 'image/jpeg'
      const quality = isPng ? undefined : JPEG_QUALITY

      const dataUrl = canvas.toDataURL(mimeType, quality)
      URL.revokeObjectURL(img.src)
      resolve(dataUrl)
    }

    img.src = URL.createObjectURL(file)
  })
}

export function ImageImportModal({ isOpen, onClose, onInsert }: ImageImportModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [base64Data, setBase64Data] = useState<string | null>(null)
  const [size, setSize] = useState<SizePreset>('full')
  const [alignment, setAlignment] = useState<Alignment>('center')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview URL for display
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // Compress and convert to base64
    const base64 = await compressImage(file)
    setBase64Data(base64)
  }, [])

  const handleClose = useCallback(() => {
    // Cleanup
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setBase64Data(null)
    setSize('full')
    setAlignment('center')
    onClose()
  }, [previewUrl, onClose])

  const handleInsert = useCallback(async () => {
    if (!base64Data) return

    try {
      // Store image in IndexedDB and get its ID
      const imageId = await storeImage(base64Data)
      console.log('Stored image with ID:', imageId)

      const style = `${sizeStyles[size]}; height: auto; object-fit: contain; display: block; ${alignmentStyles[alignment]}`
      const html = `<img src="${imageId}" alt="image" style="${style}" />`

      onInsert(html)
      handleClose()
    } catch (err) {
      console.error('Failed to store image:', err)
    }
  }, [base64Data, size, alignment, onInsert, handleClose])

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Image</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div className={`image-preview-area ${previewUrl ? 'has-image' : ''}`}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" />
          ) : (
            <button className="file-input-button" onClick={triggerFileInput}>
              Choose Image
            </button>
          )}
        </div>

        {previewUrl && (
          <button
            className="file-input-button"
            onClick={triggerFileInput}
            style={{ marginBottom: '20px', width: '100%' }}
          >
            Choose Different Image
          </button>
        )}

        <div className="modal-controls">
          <div className="control-group">
            <label>Size</label>
            <select value={size} onChange={(e) => setSize(e.target.value as SizePreset)}>
              <option value="full">Full Width</option>
              <option value="half">Half Width</option>
              <option value="thumbnail">Thumbnail (200px)</option>
            </select>
          </div>

          <div className="control-group">
            <label>Alignment</label>
            <div className="alignment-buttons">
              <button
                className={alignment === 'left' ? 'active' : ''}
                onClick={() => setAlignment('left')}
              >
                Left
              </button>
              <button
                className={alignment === 'center' ? 'active' : ''}
                onClick={() => setAlignment('center')}
              >
                Center
              </button>
              <button
                className={alignment === 'right' ? 'active' : ''}
                onClick={() => setAlignment('right')}
              >
                Right
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={handleInsert}
            disabled={!base64Data}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
