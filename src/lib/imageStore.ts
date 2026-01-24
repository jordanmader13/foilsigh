/**
 * IndexedDB-based image storage for presentations.
 * Stores images as blobs with content-hash keys for deduplication.
 */

const DB_NAME = 'foilsigh-images'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface StoredImage {
  id: string
  blob: Blob
  mimeType: string
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null
let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  // If we have a valid connection, use it
  if (dbInstance && dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result

      // Handle connection closing (e.g., after database deletion)
      dbInstance.onclose = () => {
        dbInstance = null
        dbPromise = null
      }

      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })

  return dbPromise
}

/**
 * Generate a hash-based ID for an image blob
 */
async function generateImageId(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `img-${hashHex.slice(0, 16)}`
}

/**
 * Store an image and return its ID for referencing in markdown
 */
export async function storeImage(dataUrl: string): Promise<string> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    const id = await generateImageId(blob)
    console.log('Generated image ID:', id, 'blob size:', blob.size)

    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const image: StoredImage = {
        id,
        blob,
        mimeType: blob.type,
        createdAt: Date.now(),
      }

      const request = store.put(image)

      request.onerror = () => {
        console.error('Failed to store image:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log('Successfully stored image:', id)
        resolve(id)
      }

      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error)
      }
    })
  } catch (err) {
    console.error('storeImage error:', err)
    throw err
  }
}

/**
 * Retrieve an image by ID and return as data URL
 */
export async function getImage(id: string): Promise<string | null> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onerror = () => {
        console.error('Failed to get image:', id, request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const image = request.result as StoredImage | undefined
        if (!image) {
          console.log('Image not found:', id)
          resolve(null)
          return
        }

        console.log('Found image:', id, 'blob size:', image.blob.size)

        // Convert blob back to data URL
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => {
          console.error('FileReader error:', reader.error)
          reject(reader.error)
        }
        reader.readAsDataURL(image.blob)
      }
    })
  } catch (err) {
    console.error('getImage error:', err)
    throw err
  }
}

/**
 * Get all stored image IDs
 */
export async function getAllImageIds(): Promise<string[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as string[])
  })
}

/**
 * Delete an image by ID
 */
export async function deleteImage(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clean up unused images (not referenced in markdown)
 */
export async function cleanupUnusedImages(markdown: string): Promise<number> {
  const allIds = await getAllImageIds()
  let deletedCount = 0

  for (const id of allIds) {
    if (!markdown.includes(id)) {
      await deleteImage(id)
      deletedCount++
    }
  }

  return deletedCount
}

/**
 * Get total storage used by images
 */
export async function getStorageSize(): Promise<number> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const images = request.result as StoredImage[]
      const totalSize = images.reduce((sum, img) => sum + img.blob.size, 0)
      resolve(totalSize)
    }
  })
}

/**
 * Export markdown with all images inlined as base64 data URLs
 */
export async function exportWithInlinedImages(markdown: string): Promise<string> {
  const imageRefRegex = /!\[([^\]]*)\]\((img-[a-f0-9]+)\)/g
  const htmlImageRefRegex = /src="(img-[a-f0-9]+)"/g

  let result = markdown

  // Find all image references
  const mdMatches = [...markdown.matchAll(imageRefRegex)]
  const htmlMatches = [...markdown.matchAll(htmlImageRefRegex)]

  // Replace markdown image references
  for (const match of mdMatches) {
    const [fullMatch, alt, id] = match
    const dataUrl = await getImage(id)
    if (dataUrl) {
      result = result.replace(fullMatch, `![${alt}](${dataUrl})`)
    }
  }

  // Replace HTML image references
  for (const match of htmlMatches) {
    const [fullMatch, id] = match
    const dataUrl = await getImage(id)
    if (dataUrl) {
      result = result.replace(fullMatch, `src="${dataUrl}"`)
    }
  }

  return result
}
