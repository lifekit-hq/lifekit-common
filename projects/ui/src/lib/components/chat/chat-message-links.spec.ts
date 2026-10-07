import {describe, expect, it} from 'vitest';

import {type ChatSegment, parseChatLinks} from './chat-message-links';

const text = (value: string): ChatSegment => ({kind: 'text', text: value});
const external = (href: string, label = href): ChatSegment => ({
  kind: 'link',
  label,
  href,
  internal: false,
});
const internal = (href: string, label: string): ChatSegment => ({
  kind: 'link',
  label,
  href,
  internal: true,
});

describe('parseChatLinks', () => {
  it('should return a single text segment when there are no links', () => {
    expect(parseChatLinks('Your net worth is $1.8M.')).toEqual([text('Your net worth is $1.8M.')]);
  });

  it('should return no segments for empty text', () => {
    expect(parseChatLinks('')).toEqual([]);
  });

  describe('safe links', () => {
    it('should link a bare https URL', () => {
      expect(parseChatLinks('See https://example.com/a?b=1#c now')).toEqual([
        text('See '),
        external('https://example.com/a?b=1#c'),
        text(' now'),
      ]);
    });

    it('should keep sentence punctuation out of a bare URL', () => {
      expect(parseChatLinks('Read https://example.com/x, then https://example.com/y.')).toEqual([
        text('Read '),
        external('https://example.com/x'),
        text(', then '),
        external('https://example.com/y'),
        text('.'),
      ]);
    });

    it('should drop an unbalanced closing paren but keep a balanced one', () => {
      expect(parseChatLinks('(see https://example.com/a)')).toEqual([
        text('(see '),
        external('https://example.com/a'),
        text(')'),
      ]);
      expect(parseChatLinks('https://en.wikipedia.org/wiki/Foo_(bar)')).toEqual([
        external('https://en.wikipedia.org/wiki/Foo_(bar)'),
      ]);
    });

    it('should link a markdown https link with its label', () => {
      expect(parseChatLinks('Open [the filing](https://example.com/f).')).toEqual([
        text('Open '),
        external('https://example.com/f', 'the filing (example.com)'),
        text('.'),
      ]);
    });

    it('should show the real host after a label that names another site', () => {
      expect(parseChatLinks('[https://schwab.com/login](https://evil.example/x)')).toEqual([
        external('https://evil.example/x', 'https://schwab.com/login (evil.example)'),
      ]);
    });

    it('should render a markdown link whose label is the same URL as a bare link', () => {
      expect(parseChatLinks('[https://example.com/a](https://example.com/a)')).toEqual([
        external('https://example.com/a'),
      ]);
    });

    it('should keep balanced parens in a markdown target', () => {
      expect(parseChatLinks('[Foo](https://en.wikipedia.org/wiki/Foo_(bar)) next')).toEqual([
        external('https://en.wikipedia.org/wiki/Foo_(bar)', 'Foo (en.wikipedia.org)'),
        text(' next'),
      ]);
    });

    it('should link a markdown in-app path as internal', () => {
      expect(parseChatLinks('Go to [AAPL](/holdings/AAPL?tab=lots#top)')).toEqual([
        text('Go to '),
        internal('/holdings/AAPL?tab=lots#top', 'AAPL'),
      ]);
    });

    it('should not double-match a bare URL used as a markdown label', () => {
      expect(parseChatLinks('[https://a.com](https://a.com)')).toEqual([
        external('https://a.com', 'https://a.com'),
      ]);
    });
  });

  describe('rejected targets', () => {
    it.each([
      ['javascript', '[x](javascript:alert(1))'],
      ['data', '[x](data:text/html;base64,AAAA)'],
      ['http', '[x](http://example.com)'],
      ['protocol-relative', '[x](//evil.com/a)'],
      ['backslash host', '[x](/\\evil.com)'],
      ['mailto', '[x](mailto:a@b.com)'],
      ['bare relative', '[x](holdings/AAPL)'],
      ['credentials', '[x](https://bank.com@evil.com)'],
      ['https without host', '[x](https://)'],
      ['malformed percent-encoding', '[AAPL](/%)'],
      ['in-app path with parens', '[Foo](/holdings/Foo_(bar))'],
    ])('should leave a %s markdown target as plain text', (_name, input) => {
      expect(parseChatLinks(input)).toEqual([text(input)]);
    });

    it('should leave a bare http URL and a bare path as plain text', () => {
      const input = 'http://example.com and /holdings/AAPL and javascript:alert(1)';
      expect(parseChatLinks(input)).toEqual([text(input)]);
    });

    it('should reject a bare https URL with embedded credentials', () => {
      expect(parseChatLinks('go https://bank.com@evil.com/x ok')).toEqual([
        text('go https://bank.com@evil.com/x ok'),
      ]);
    });

    it('should leave a blank markdown label as plain text', () => {
      expect(parseChatLinks('[ ](/a)')).toEqual([text('[ ](/a)')]);
    });
  });

  describe('mixed input', () => {
    it('should link the safe parts and keep the rejected parts verbatim', () => {
      expect(
        parseChatLinks('[bad](javascript:x) then [AAPL](/holdings/AAPL) and https://example.com.')
      ).toEqual([
        text('[bad](javascript:x) then '),
        internal('/holdings/AAPL', 'AAPL'),
        text(' and '),
        external('https://example.com'),
        text('.'),
      ]);
    });

    it('should never turn markup in the message into anything but text', () => {
      const input = '<img src=x onerror=alert(1)> <a href="javascript:x">y</a>';
      expect(parseChatLinks(input)).toEqual([text(input)]);
    });

    it('should not match a markdown link across lines', () => {
      const input = '[one\ntwo](/a)';
      expect(parseChatLinks(input)).toEqual([text(input)]);
    });
  });
});
