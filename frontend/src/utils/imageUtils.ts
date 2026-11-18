/**
 * Resolves attendance and document URLs.
 * - If already a base64 data URI (data:image/...) or full HTTP/HTTPS URL, returns directly.
 * - If a relative path (e.g. /uploads/...), prepends the backend base URL in production on Vercel.
 */
export function resolvePhotoUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  const backendBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (!backendBase) {
    return trimmed;
  }
  return `${backendBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
