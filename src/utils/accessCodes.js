// Pre-generated 50 access codes (8-char alphanumeric with GF- prefix)
export const VALID_CODES = [
  "GF-7XK2P9", "GF-Q3M8ZT", "GF-PA4L9C", "GF-V2D7RM", "GF-K9B4YX",
  "GF-6JQ2NH", "GF-T5L8RW", "GF-Z1S9KE", "GF-DC7P3A", "GF-UB5N6J",
  "GF-H4W9TY", "GF-R3E8QP", "GF-X6M2LC", "GF-M7A1VZ", "GF-J8Q5KB",
  "GF-N2L6YD", "GF-P4S7XH", "GF-Y9C3BT", "GF-W5F8RA", "GF-E6Z1MQ",
  "GF-L3P9UW", "GF-C7D5HX", "GF-B8K2FJ", "GF-A4V6ZR", "GF-Q9N1WS",
  "GF-U5H7KM", "GF-S6R3YE", "GF-T8X4PA", "GF-Z2L9HD", "GF-R5M7VQ",
  "GF-K1C8JP", "GF-P6B4NA", "GF-V9S2LE", "GF-M3T7XC", "GF-H5Q1RD",
  "GF-D8W6KZ", "GF-X4P9SU", "GF-J2L7HF", "GF-N6A3VB", "GF-Y5R8MQ",
  "GF-E9Z2KT", "GF-U1C6PX", "GF-L8H4DS", "GF-B3V7WR", "GF-C5N9YQ",
  "GF-A2M6JG", "GF-Q4T8LK", "GF-W7F1ZE", "GF-S9P3DX", "GF-Z6R5VA"
];

const OWNER_CODE = (import.meta.env.VITE_OWNER_CODE || "").trim().toUpperCase();

export function isValidCode(code = "") {
  const normalized = code.trim().toUpperCase();
  if (OWNER_CODE && normalized === OWNER_CODE) return true;
  return VALID_CODES.includes(normalized);
}

// In dev, log codes for easy copy/paste
if (import.meta.env.DEV) {
  console.log("[GoldFlip] Valid access codes:", VALID_CODES.join(", "));
}
