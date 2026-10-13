const MAX_INITIALS = 2;

/**
 * Reduces a label to the text of an avatar disc. A label of up to two characters without spaces
 * is treated as initials and shown as given, uppercased ('dt' → 'DT', 'Al' → 'AL'); a longer
 * single word shows its first letter ('Denys' → 'D'); several words show the first letters of
 * the first two ('Denys Taran' → 'DT'); an empty label shows '?'.
 */
export function avatarInitials(label: string): string {
  const trimmed = label.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, MAX_INITIALS)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }
  const single = trimmed.length <= MAX_INITIALS ? trimmed : trimmed.charAt(0);
  return single.toUpperCase() || '?';
}
