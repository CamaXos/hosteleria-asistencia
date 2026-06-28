import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";

const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateUsername(username: string): string | null {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return "El usuario es obligatorio";
  if (normalized.length < 3) return "El usuario debe tener al menos 3 caracteres";
  if (normalized.length > 50) return "El usuario no puede superar 50 caracteres";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Solo letras minúsculas, números y guiones (ej. resp-la-plaza-01)";
  }
  return null;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function toInternalEmail(username: string): string {
  return `${normalizeUsername(username)}${INTERNAL_EMAIL_DOMAIN}`;
}

export function resolveLoginEmail(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed;
  return toInternalEmail(trimmed);
}

export interface ResponsibleCredentials {
  username: string;
  password: string;
}
