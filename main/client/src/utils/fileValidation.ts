const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export function validateImageFile(file: File): string | null {
  const name = (file.name || '').toLowerCase()
  const type = (file.type || '').toLowerCase()

  const hasAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!hasAllowedExtension) {
    return 'Only JPG and PNG image files are allowed.'
  }

  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return 'Invalid file type. Please upload a valid JPG or PNG image.'
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 5 MB or smaller.'
  }

  return null
}
