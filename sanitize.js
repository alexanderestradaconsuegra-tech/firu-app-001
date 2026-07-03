/* FIRU · Input sanitization and validation utilities */

export function sanitizeText(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254);
}

export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const s = url.trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return s.slice(0, 2048);
  } catch {
    return '';
  }
}

export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  return phone.trim().replace(/[^\d\s+\-().]/g, '').slice(0, 25);
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function validateFileUpload(file, opts = {}) {
  const {
    maxSizeMB   = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  } = opts;
  if (!file) return { ok: false, msg: 'No se seleccionó archivo.' };
  if (!allowedTypes.includes(file.type))
    return { ok: false, msg: 'Tipo de archivo no permitido. Usa JPG, PNG o WebP.' };
  if (file.size > maxSizeMB * 1024 * 1024)
    return { ok: false, msg: `La imagen supera el límite de ${maxSizeMB} MB.` };
  return { ok: true };
}
