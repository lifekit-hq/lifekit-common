/**
 * Source text helpers for the design drift check: line lookup, comment masking, string and
 * template-literal extraction for TypeScript, and a forgiving CSS declaration parser.
 * Everything keeps line numbers exact so findings point at the offending line.
 */

/** Blanks block and line comments (newlines kept) so offsets and line numbers survive. */
export function maskComments(text, {lineComments = true} = {}) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null;
      i++;
    } else if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (lineComments && c === '/' && next === '/' && text[i - 1] !== ':') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else {
      if (c === '"' || c === "'" || c === '`') quote = c;
      out += c;
      i++;
    }
  }
  return out;
}

export function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

const EXPRESSION = 'var(--ts-expression)';

/**
 * The bodies of every string and template literal in TypeScript source, with the 1-based line
 * and the offset of the opening quote each starts at. A `${…}` interpolation becomes a
 * `var(--ts-expression)` placeholder (it is a value the scan cannot see, so it is never a literal).
 * Ordinary quotes end at the newline.
 */
export function extractStrings(source) {
  const text = maskComments(source);
  const strings = [];
  let i = 0;
  let line = 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\n') line++;
    if (c !== '"' && c !== "'" && c !== '`') {
      i++;
      continue;
    }
    const startLine = line;
    let body = '';
    let j = i + 1;
    let closed = false;
    while (j < text.length) {
      const d = text[j];
      if (d === '\\') {
        body += text[j + 1] ?? '';
        j += 2;
        continue;
      }
      if (d === c) {
        closed = true;
        break;
      }
      if (d === '\n') {
        if (c !== '`') break;
        line++;
      }
      if (c === '`' && d === '$' && text[j + 1] === '{') {
        let depth = 1;
        let k = j + 2;
        let breaks = '';
        while (k < text.length && depth) {
          if (text[k] === '{') depth++;
          else if (text[k] === '}') depth--;
          else if (text[k] === '\n') {
            breaks += '\n';
            line++;
          }
          k++;
        }
        body += EXPRESSION + breaks;
        j = k;
        continue;
      }
      body += d;
      j++;
    }
    if (closed) strings.push({text: body, line: startLine, start: i});
    i = closed ? j + 1 : j;
  }
  return strings;
}

const DECLARATION = /^([a-z-][\w-]*)\s*:\s*([\s\S]+)$/i;

/**
 * Declarations in CSS, SCSS or a string that holds CSS: `{selector, atRules, prop, value, line}`.
 * `selector` is the innermost style rule's selector (`''` outside one) and `atRules` the enclosing
 * at-rule preludes. Custom properties and SCSS variables are definitions and are not returned.
 */
export function parseDeclarations(source, {firstLine = 1, lineComments = false} = {}) {
  const text = maskComments(source, {lineComments});
  const declarations = [];
  const blocks = [];
  let statement = '';
  let statementLine = firstLine;
  let line = firstLine;
  let parens = 0;
  let quote = null;

  const flush = isDeclaration => {
    const trimmed = statement.trim();
    const match = isDeclaration && DECLARATION.exec(trimmed);
    if (match && !match[1].startsWith('--')) {
      declarations.push({
        selector: [...blocks].reverse().find(b => !b.at)?.prelude ?? '',
        atRules: blocks.filter(b => b.at).map(b => b.prelude),
        prop: match[1].toLowerCase(),
        value: match[2].trim(),
        line: statementLine,
      });
    }
    statement = '';
  };

  for (const c of text) {
    if (!statement.trim() && c !== '\n' && c !== ' ' && c !== '\t' && c !== '\r')
      statementLine = line;
    if (c === '\n') line++;
    if (quote) {
      statement += c;
      if (c === quote || c === '\n') quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      statement += c;
    } else if (c === '(') {
      parens++;
      statement += c;
    } else if (c === ')') {
      parens = Math.max(0, parens - 1);
      statement += c;
    } else if (parens > 0) {
      statement += c;
    } else if (c === '{') {
      const prelude = statement.trim();
      blocks.push({prelude, at: prelude.startsWith('@')});
      statement = '';
    } else if (c === ';') {
      flush(true);
    } else if (c === '}') {
      flush(true);
      blocks.pop();
    } else {
      statement += c;
    }
  }
  flush(true);
  return declarations;
}
