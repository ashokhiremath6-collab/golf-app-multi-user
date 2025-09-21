// Preview Mode Utilities
// Handles detection and utilities for preview mode functionality

export function isPreviewMode(): boolean {
  return process.env.PREVIEW_MODE === 'true';
}

export function redactPII(obj: any): any {
  if (!obj) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactPII(item));
  }
  
  if (typeof obj === 'object') {
    const redacted = { ...obj };
    
    // Redact email fields
    if (redacted.email && typeof redacted.email === 'string') {
      const emailParts = redacted.email.split('@');
      if (emailParts.length === 2) {
        const [username, domain] = emailParts;
        redacted.email = `${username.substring(0, 2)}***@${domain}`;
      }
    }
    
    // Recursively redact nested objects
    Object.keys(redacted).forEach(key => {
      if (typeof redacted[key] === 'object') {
        redacted[key] = redactPII(redacted[key]);
      }
    });
    
    return redacted;
  }
  
  return obj;
}

export function createPreviewResponse(data: any) {
  if (isPreviewMode()) {
    return redactPII(data);
  }
  return data;
}