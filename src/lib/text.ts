/** Capitalise only the first letter (CSS `capitalize` would also change "de", "con"...). */
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
