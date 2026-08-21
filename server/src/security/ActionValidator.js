import { sanitizeString } from '../../../shared/schemas/validation.js';

const MAX_ACTION_SIZE = 2048;

// Server-side action validation — never trust the client
export class ActionValidator {
  validate(raw) {
    if (typeof raw === 'string') {
      if (raw.length > MAX_ACTION_SIZE) return { valid: false, error: 'Message too large' };
      try {
        raw = JSON.parse(raw);
      } catch {
        return { valid: false, error: 'Invalid JSON' };
      }
    }

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return { valid: false, error: 'Expected object' };
    }

    if (typeof raw.type !== 'string' || raw.type.length === 0 || raw.type.length > 50) {
      return { valid: false, error: 'Invalid message type' };
    }

    // Sanitize string fields recursively (shallow)
    const cleaned = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string') {
        cleaned[k] = sanitizeString(v, 500);
      } else {
        cleaned[k] = v;
      }
    }

    return { valid: true, data: cleaned };
  }
}
