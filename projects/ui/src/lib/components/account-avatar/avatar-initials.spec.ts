import {describe, expect, it} from 'vitest';

import {avatarInitials} from './avatar-initials';

describe('avatarInitials', () => {
  it.each([
    ['DT', 'DT'],
    ['dt', 'DT'],
    ['D', 'D'],
    ['Denys', 'D'],
    ['Denys Taran', 'DT'],
    ['Denys Ivanovych Taran', 'DI'],
    ['  Denys   Taran  ', 'DT'],
    ['', '?'],
    ['   ', '?'],
  ])('should reduce "%s" to "%s"', (label, expected) => {
    expect(avatarInitials(label)).toBe(expected);
  });
});
