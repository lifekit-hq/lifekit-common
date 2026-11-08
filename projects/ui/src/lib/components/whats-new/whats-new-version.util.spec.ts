import {describe, expect, it} from 'vitest';

import {isNewerVersion} from './whats-new-version.util';

describe('isNewerVersion', () => {
  it.each([
    ['1.2.0', '1.1.9', true],
    ['2.0.0', '1.99.99', true],
    ['1.10.0', '1.9.0', true],
    ['1.2.3', '1.2.2', true],
  ])('%s is newer than %s', (a, b, expected) => {
    expect(isNewerVersion(a, b)).toBe(expected);
  });

  it('is false for the same version and for an older one', () => {
    expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isNewerVersion('1.1.0', '1.2.0')).toBe(false);
  });

  it('is never newer when either side is not x.y.z', () => {
    expect(isNewerVersion('1.2.0-beta', '1.1.0')).toBe(false);
    expect(isNewerVersion('1.2.0', 'latest')).toBe(false);
  });
});
