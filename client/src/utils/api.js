const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const apiUrl = path => base + path;
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
