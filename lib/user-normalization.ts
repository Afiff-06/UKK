export function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizeNullableText(value?: string | null) {
  if (value == null) return null;

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function sanitizeRequiredText(value: string) {
  return normalizeWhitespace(value);
}

export function normalizeName(value: string) {
  return sanitizeRequiredText(value).toLowerCase();
}

export function normalizeUsername(value: string) {
  return sanitizeRequiredText(value).toLowerCase();
}

function encodeUsernameForInternalEmail(value: string) {
  return Array.from(value)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

export function buildInternalUserEmail(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const encodedUsername = encodeUsernameForInternalEmail(normalizedUsername || "user");

  return `u-${encodedUsername}@users.example.com`;
}

export function normalizeDigitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneNumber(value: string) {
  return normalizeDigitsOnly(value);
}

export function sanitizeOptionalDigits(value?: string | null) {
  if (value == null) return null;

  const normalized = normalizeDigitsOnly(value);
  return normalized.length > 0 ? normalized : null;
}

export function sanitizeEmail(value?: string | null) {
  const normalized = sanitizeNullableText(value);
  return normalized ? normalized.toLowerCase() : null;
}
