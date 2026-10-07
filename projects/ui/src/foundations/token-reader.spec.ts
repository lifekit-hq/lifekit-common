import {listColorTokens, readTypeStep, resolveColor} from './token-reader';

describe('token-reader', () => {
  let style: HTMLStyleElement;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `
      :root, [data-theme='light'] { --color-test-a: #102030; --color-test-b: var(--color-test-a); --not-a-color: 1px; }
      [data-theme='dark'] { --color-test-a: #f0e0d0; }
      @media (min-width: 1px) { :root { --color-test-media: #ffffff; } }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => style.remove());

  it('discovers colour custom properties, including inside media rules, and ignores the rest', () => {
    const names = listColorTokens();
    expect(names).toEqual(
      expect.arrayContaining(['--color-test-a', '--color-test-b', '--color-test-media'])
    );
    expect(names).not.toContain('--not-a-color');
    expect(new Set(names).size).toBe(names.length);
  });

  it('skips sheets whose rules cannot be read', () => {
    const unreadable = {
      get cssRules(): CSSRuleList {
        throw new DOMException('blocked', 'SecurityError');
      },
    } as unknown as CSSStyleSheet;
    expect(listColorTokens([unreadable] as unknown as StyleSheetList)).toEqual([]);
  });

  it('resolves a token per theme regardless of the document theme', () => {
    expect(resolveColor('--color-test-a', 'light')).toEqual({r: 0x10, g: 0x20, b: 0x30});
    expect(resolveColor('--color-test-a', 'dark')).toEqual({r: 0xf0, g: 0xe0, b: 0xd0});
  });

  it('resolves plain CSS colours and leaves no probe behind', () => {
    const before = document.body.children.length;
    expect(resolveColor('rgb(1, 2, 3)', 'light')).toEqual({r: 1, g: 2, b: 3});
    expect(document.body.children.length).toBe(before);
  });

  it('throws for a token no stylesheet defines instead of resolving the inherited colour', () => {
    expect(() => resolveColor('--color-test-missing', 'light')).toThrow(/--color-test-missing/);
  });

  it('throws for a value that is not a CSS colour, leaving no probe behind', () => {
    const before = document.body.children.length;
    expect(() => resolveColor('not-a-colour', 'light')).toThrow(/not-a-colour/);
    expect(document.body.children.length).toBe(before);
  });

  it('reads computed type metrics', () => {
    const el = document.createElement('p');
    el.style.cssText = 'font-size: 20px; line-height: 25px; font-family: serif';
    document.body.appendChild(el);
    expect(readTypeStep(el)).toEqual({fontSize: '20px', lineHeight: '25px', fontFamily: 'serif'});
    el.remove();
  });
});
