import { randomBytes } from "crypto";

export function generateSecurePassword(length = 12): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const all = uppercase + lowercase + numbers;
  const bytes = randomBytes(length);

  const chars = [
    uppercase[bytes[0] % uppercase.length],
    lowercase[bytes[1] % lowercase.length],
    numbers[bytes[2] % numbers.length],
  ];

  for (let i = 3; i < length; i++) {
    chars.push(all[bytes[i] % all.length]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i % bytes.length] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export type { ResponsibleCredentials } from "./responsible-auth";
