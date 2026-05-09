// Character set: 0-9 a-z A-Z  (62 characters, this ordering is fixed)
// 62^7 = 3,521,614,606,208 (~3.5 trillion) unique codes — well within JS safe integer range.
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = 62;
const CODE_LENGTH = 7;

/**
 * Encode a non-negative integer to a 7-character Base62 string.
 * Values outside [0, 62^7 - 1] will produce codes longer than 7 chars.
 */
export function encode(n: number): string {
  if (n < 0) throw new RangeError('encode: input must be non-negative');
  if (n === 0) return '0'.padStart(CODE_LENGTH, '0');

  let result = '';
  let num = n;
  while (num > 0) {
    result = CHARS[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result.padStart(CODE_LENGTH, '0');
}

/**
 * Decode a Base62 string back to a number.
 * Throws on characters outside the character set.
 */
export function decode(s: string): number {
  let result = 0;
  for (const ch of s) {
    const idx = CHARS.indexOf(ch);
    if (idx === -1) throw new RangeError(`decode: invalid character '${ch}'`);
    result = result * BASE + idx;
  }
  return result;
}
