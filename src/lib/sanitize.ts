export const MAX_TITLE_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_TAG_LENGTH = 50;
export const MAX_TAGS = 20;

export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

export function sanitizeTitle(title: string | undefined | null): string {
  let sanitized = sanitizeInput(title);
  
  // Enforce max length
  if (sanitized.length > MAX_TITLE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TITLE_LENGTH);
  }
  
  return sanitized;
}

export function sanitizeDescription(description: string | undefined | null): string {
  let sanitized = sanitizeInput(description);
  
  // Enforce max length
  if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
    sanitized = sanitized.slice(0, MAX_DESCRIPTION_LENGTH);
  }
  
  return sanitized;
}

export function sanitizeTag(tag: string): string {
  let sanitized = sanitizeInput(tag);
  
  // Remove special characters except hyphens and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_]/g, '');
  
  // Enforce max length
  if (sanitized.length > MAX_TAG_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TAG_LENGTH);
  }
  
  // Lowercase for consistency
  return sanitized.toLowerCase();
}

export function sanitizeTags(tags: string[]): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  
  const sanitized = tags
    .map(tag => sanitizeTag(tag))
    .filter(tag => tag.length > 0)
    .slice(0, MAX_TAGS);
  
  // Remove duplicates
  return [...new Set(sanitized)];
}