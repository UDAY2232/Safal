/**
 * Resolves attendance, consignment dispatch, and document URLs.
 * - If already a base64 data URI (data:image/...) or blob URI, returns directly.
 * - If /uploads/..., routes to /api/uploads/ so Nginx proxies it to the Express backend.
 */
export function resolvePhotoUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Ensure upload paths hit /api/uploads which is guaranteed to be proxied by Nginx
  let normalized = trimmed;
  if (normalized.startsWith('/uploads/')) {
    normalized = `/api${normalized}`;
  } else if (normalized.startsWith('uploads/')) {
    normalized = `/api/${normalized}`;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized.replace(/\/uploads\//g, '/api/uploads/');
  }

  const backendBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (!backendBase) {
    return normalized;
  }
  return `${backendBase}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

/**
 * Downloads the actual document or photo blob safely without downloading SPA fallback HTML.
 */
export async function downloadProofFile(url: string, defaultFilename = 'safal-proof-document.jpg'): Promise<void> {
  try {
    const targetUrl = resolvePhotoUrl(url);
    const response = await fetch(targetUrl);
    if (!response.ok) {
      window.open(targetUrl, '_blank');
      return;
    }
    const blob = await response.blob();
    if (blob.type.includes('text/html') && !targetUrl.endsWith('.html')) {
      // Server returned HTML index fallback instead of real file
      alert('The requested proof document is currently not found on the server.');
      return;
    }
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;

    let ext = '.jpg';
    if (blob.type.includes('pdf')) ext = '.pdf';
    else if (blob.type.includes('png')) ext = '.png';

    const cleanName = defaultFilename.includes('.') ? defaultFilename : `${defaultFilename}${ext}`;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(resolvePhotoUrl(url), '_blank');
  }
}

/**
 * Compresses/resizes any image file on the client before upload to prevent HTTP 413 (Request Entity Too Large).
 * Reduces 5MB-15MB phone camera photos or desktop PNG screenshots to a crisp, high-quality ~150-350KB JPEG in milliseconds.
 */
export async function compressImageFile(file: File, maxDimension = 1440, quality = 0.80): Promise<File> {
  // Pass through PDFs and non-images directly
  if (!file || !file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File(
              [blob],
              `${cleanName}.jpg`,
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }
            );
            console.log(`[SAFAL Compressor] ${file.name}: ${(file.size / 1024).toFixed(1)} KB ➔ ${(blob.size / 1024).toFixed(1)} KB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
