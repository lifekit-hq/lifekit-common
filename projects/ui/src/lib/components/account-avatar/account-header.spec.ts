import {describe, expect, it} from 'vitest';

import {accountHeader} from './account-header';

describe('accountHeader', () => {
  it('should title with the name and put the email beneath it', () => {
    expect(
      accountHeader({name: ' Ada Lovelace ', email: 'ada@example.com ', pictureUrl: '/a.png'}, 'AL')
    ).toEqual({
      title: 'Ada Lovelace',
      subtitle: 'ada@example.com',
      pictureUrl: '/a.png',
      avatarLabel: 'AL',
    });
  });

  it('should title with the email, and no subtitle, when there is no name', () => {
    const header = accountHeader({email: 'ada@example.com'});
    expect(header?.title).toBe('ada@example.com');
    expect(header?.subtitle).toBeUndefined();
  });

  it('should take the avatar text from the title when the label is blank', () => {
    expect(accountHeader({name: 'Ada Lovelace'}, '  ')?.avatarLabel).toBe('Ada Lovelace');
  });

  it('should have no header without a name or an email', () => {
    expect(accountHeader(undefined, 'AL')).toBeUndefined();
    expect(accountHeader({pictureUrl: '/a.png'}, 'AL')).toBeUndefined();
    expect(accountHeader({name: ' ', email: ' '})).toBeUndefined();
  });
});
