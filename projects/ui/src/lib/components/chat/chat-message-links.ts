/** A run of plain text, rendered verbatim. */
export interface ChatTextSegment {
  kind: 'text';
  text: string;
}

/**
 * A safe link. `internal` targets are in-app paths (routed, no reload); the rest are `https://`
 * URLs (new tab, `noopener noreferrer`).
 */
export interface ChatLinkSegment {
  kind: 'link';
  label: string;
  href: string;
  internal: boolean;
}

export type ChatSegment = ChatTextSegment | ChatLinkSegment;

// Markdown `[label](target)` first so a bare URL inside one is not matched twice; then a bare
// `https://` URL. Both stay on one line, so a stray `[` can never swallow a paragraph.
const LINK_PATTERN = /\[([^\]\n]+)\]\(([^()\s]+)\)|https:\/\/[^\s<>"]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?'"*_\]]$/;
// Anything but printable ASCII / non-ASCII text (so no whitespace or control characters), or a backslash.
const UNSAFE_CHARACTER = /[^\u0021-\u007e\u00a1-\uffff]|\\/;

/** In-app path: one leading `/`, not protocol-relative (`//host`), no backslash tricks (`/\host`). */
function isInternalPath(target: string): boolean {
  return target.startsWith('/') && !target.startsWith('//') && !UNSAFE_CHARACTER.test(target);
}

/** Absolute `https://` URL with a host and no embedded credentials (`https://bank.com@evil.com`). */
function isHttpsUrl(target: string): boolean {
  if (UNSAFE_CHARACTER.test(target)) {
    return false;
  }
  try {
    const url = new URL(target);
    return (
      url.protocol === 'https:' && url.hostname !== '' && url.username === '' && url.password === ''
    );
  } catch {
    return false;
  }
}

function toLink(label: string, target: string): ChatLinkSegment | null {
  if (label.trim() === '') {
    return null;
  }
  if (isInternalPath(target)) {
    return {kind: 'link', label, href: target, internal: true};
  }
  if (isHttpsUrl(target)) {
    return {kind: 'link', label, href: target, internal: false};
  }
  return null;
}

function count(value: string, char: string): number {
  return value.split(char).length - 1;
}

/** Sentence punctuation and unbalanced closing parens are not part of a bare URL. */
function trimBareUrl(url: string): string {
  let end = url;
  for (;;) {
    if (TRAILING_PUNCTUATION.test(end)) {
      end = end.slice(0, -1);
    } else if (end.endsWith(')') && count(end, ')') > count(end, '(')) {
      end = end.slice(0, -1);
    } else {
      return end;
    }
  }
}

function pushText(segments: ChatSegment[], text: string): void {
  if (text === '') {
    return;
  }
  const last = segments[segments.length - 1];
  if (last?.kind === 'text') {
    last.text += text;
  } else {
    segments.push({kind: 'text', text});
  }
}

/**
 * Splits message text into plain-text and safe-link segments. Only in-app paths and `https://`
 * URLs become links; any other target (`javascript:`, `data:`, `http:`, `//host`, `mailto:`)
 * stays as the original text. The output is data, never markup — the caller builds the nodes.
 */
export function parseChatLinks(text: string): ChatSegment[] {
  const segments: ChatSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const [raw, label, target] = match;
    const start = match.index;
    pushText(segments, text.slice(cursor, start));

    let consumed = raw;
    let link: ChatLinkSegment | null;
    if (target === undefined) {
      consumed = trimBareUrl(raw);
      link = toLink(consumed, consumed);
    } else {
      link = toLink(label, target);
    }

    if (link) {
      segments.push(link);
    } else {
      pushText(segments, consumed);
    }
    cursor = start + consumed.length;
  }

  pushText(segments, text.slice(cursor));
  return segments;
}
