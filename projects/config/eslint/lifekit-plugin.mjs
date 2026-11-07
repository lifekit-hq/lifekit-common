// lifekit's own ESLint rules for consumer apps (docs/design/guardrails.md, rules X1 and $1; `page-root` is the routed-page rule, issue #235).
// Template rules run on Angular templates (external `.html` and inline templates extracted by
// `angular.processInlineTemplates`); the same rule object also carries TypeScript selectors, and
// each parser only visits the node types it produces.

import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

/** Native `<input type>` values with no `cmn-*` equivalent yet; the rest map to a component. */
const INPUT_TYPES_WITHOUT_COMPONENT = new Set([
  'hidden',
  'file',
  'range',
  'color',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'image',
]);

const INPUT_REPLACEMENTS = {
  checkbox: '<cmn-checkbox> or <cmn-toggle>',
  radio: '<cmn-segmented> or <cmn-selectable-card>',
  search: '<cmn-search-input>',
  submit: '<cmn-button type="submit">',
  reset: '<cmn-button type="reset">',
  button: '<cmn-button>',
};

const ELEMENT_REPLACEMENTS = {
  button: '<cmn-button>',
  select: '<cmn-select>',
  textarea: '<cmn-textarea> inside <cmn-form-field>',
  table: '<cmn-data-table>',
};

function staticAttribute(element, name) {
  return element.attributes.find(attribute => attribute.name === name)?.value;
}

function boundAttribute(element, name) {
  return element.inputs.some(input => input.name === name);
}

function replacementFor(element) {
  const tag = element.name.toLowerCase();
  if (tag !== 'input') {
    return ELEMENT_REPLACEMENTS[tag];
  }
  if (boundAttribute(element, 'type')) {
    return '<cmn-input>';
  }
  const type = (staticAttribute(element, 'type') ?? 'text').toLowerCase();
  if (INPUT_TYPES_WITHOUT_COMPONENT.has(type)) {
    return undefined;
  }
  return INPUT_REPLACEMENTS[type] ?? '<cmn-input> inside <cmn-form-field>';
}

function templateLoc(context, node) {
  return context.sourceCode.parserServices.convertNodeSourceSpanToLoc(node.sourceSpan);
}

const noRawControls = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Use the lifekit component instead of a raw <button>, <input>, <select>, <textarea> or <table> (guardrails X1).',
    },
    schema: [],
    messages: {
      raw: 'Raw <{{tag}}>: use {{replacement}} from @lifekit-hq/ui. If the library cannot cover this case, disable the rule for this line with a reason after "--".',
    },
  },
  create(context) {
    return {
      'Element[name=/^(button|input|select|textarea|table)$/i]'(element) {
        const replacement = replacementFor(element);
        if (replacement) {
          context.report({
            loc: templateLoc(context, element),
            messageId: 'raw',
            data: {tag: element.name.toLowerCase(), replacement},
          });
        }
      },
    };
  },
};

function isCurrencyOptions(node) {
  return (
    node?.type === 'ObjectExpression' &&
    node.properties.some(
      property =>
        property.type === 'Property' &&
        !property.computed &&
        (property.key.name ?? property.key.value) === 'style' &&
        property.value.type === 'Literal' &&
        property.value.value === 'currency'
    )
  );
}

function isIntlNumberFormat(callee) {
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'Intl' &&
    !callee.computed &&
    callee.property.name === 'NumberFormat'
  );
}

const noLocalCurrencyFormat = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Format money through @lifekit-hq/core/format (`formatMoney`) or the `cmnMoney` pipe, not a local Intl.NumberFormat, toLocaleString or `currency` pipe (guardrails $1).',
    },
    schema: [],
    messages: {
      local:
        'Local currency formatting: use `formatMoney` from @lifekit-hq/core/format or the `cmnMoney` pipe from @lifekit-hq/ui.',
    },
  },
  create(context) {
    const report = (node, loc) => context.report({node, loc, messageId: 'local'});
    return {
      'NewExpression, CallExpression'(node) {
        if (isIntlNumberFormat(node.callee) && isCurrencyOptions(node.arguments[1])) {
          report(node);
        }
      },
      'CallExpression[callee.type="MemberExpression"][callee.property.name="toLocaleString"]'(
        node
      ) {
        if (isCurrencyOptions(node.arguments[1])) {
          report(node);
        }
      },
      'BindingPipe[name="currency"]'(node) {
        context.report({loc: templateLoc(context, node), messageId: 'local'});
      },
    };
  },
};

/**
 * The elements a routed page may be rooted on: the page template, and the library's ready-made
 * routed pages (`cmn-more-page`), which are built on it.
 */
const PAGE_ROOT_TAGS = new Set(['cmn-page', 'cmn-more-page']);

/** Tailwind utilities that give an element padding, margin or width. */
const SPACING_UTILITY = /^(?:p[xytrblse]?|m[xytrblse]?|w|min-w|max-w|size)-/;

/** The same properties as CSS: padding, margin, and the (min/max) width in either writing mode. */
const SPACING_PROPERTY = /^(?:padding|margin)(?:-[a-z-]+)?$|^(?:min-|max-)?(?:width|inline-size)$/;

/** A selector that reaches the page's own host: `:host`, `:host(.x)`, or the `cmn-page` element. */
const PAGE_SELECTOR = /^(?::host(?:\([^)]*\))?|cmn-page)$/;

/** The utility of a class token, without variants (`md:`, `has-[x]:`), `!` or a leading `-`. */
function utilityOf(token) {
  let depth = 0;
  let cut = -1;
  for (let index = 0; index < token.length; index++) {
    const char = token[index];
    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
    } else if (char === ':' && depth === 0) {
      cut = index;
    }
  }
  return token
    .slice(cut + 1)
    .replace(/^!/, '')
    .replace(/!$/, '')
    .replace(/^-/, '');
}

function spacingClasses(classes) {
  return classes.split(/\s+/).filter(token => token && SPACING_UTILITY.test(utilityOf(token)));
}

/** `prop: value` pairs of a style attribute or a declaration block. */
function declarations(block) {
  return block
    .split(';')
    .map(part => part.split(/:(.*)/s))
    .filter(([property, value]) => property?.trim() && value !== undefined)
    .map(([property, value]) => ({property: property.trim().toLowerCase(), value: value.trim()}));
}

function spacingDeclarations(block) {
  return declarations(block).filter(({property}) => SPACING_PROPERTY.test(property));
}

/** Declarations that put spacing on the page host, from the rules of a (flat) stylesheet. */
function pageStylesheetSpacing(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found = [];
  for (const [, selector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.split(',').some(part => PAGE_SELECTOR.test(part.trim()))) {
      found.push(...spacingDeclarations(body));
    }
  }
  return found;
}

/** A binding key such as `class.p-4` or `style.padding.px`: the spacing it sets, if any. */
function bindingSpacing(key) {
  const [kind, ...rest] = key.split('.');
  if (kind === 'class' && rest.length > 0) {
    return spacingClasses(rest.join('.'))[0];
  }
  if (kind === 'style' && SPACING_PROPERTY.test(rest[0] ?? '')) {
    return rest[0];
  }
  return undefined;
}

function propertyName(property) {
  return property.key.name ?? property.key.value;
}

function stringValues(node) {
  if (!node) {
    return [];
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.flatMap(stringValues);
  }
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return [node.value];
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return [node.quasis[0].value.cooked];
  }
  return [];
}

function metadataProperty(metadata, name) {
  return metadata.properties.find(
    property =>
      property.type === 'Property' && !property.computed && propertyName(property) === name
  );
}

function readStylesheet(context, url) {
  try {
    return readFileSync(resolve(dirname(context.filename), url), 'utf8');
  } catch {
    return '';
  }
}

/** The spacing a `host: {...}` metadata object puts on the page host. */
function hostSpacing(host) {
  const found = [];
  for (const property of host.properties) {
    if (property.type !== 'Property' || property.computed) {
      continue;
    }
    const key = String(propertyName(property));
    const [value] = stringValues(property.value);
    if (key === 'class' && value) {
      found.push(...spacingClasses(value).map(token => ({node: property, found: token})));
    } else if (key === 'style' && value) {
      found.push(
        ...spacingDeclarations(value).map(({property: name}) => ({node: property, found: name}))
      );
    } else if (key.startsWith('[') && key.endsWith(']')) {
      const set = bindingSpacing(key.slice(1, -1));
      if (set) {
        found.push({node: property, found: set});
      }
    }
  }
  return found;
}

const pageRoot = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'A routed page is rooted on <cmn-page> and sets no padding, margin or width of its own (the page template owns them).',
    },
    schema: [],
    messages: {
      missing:
        'A routed page is rooted on <cmn-page>: this template has no <cmn-page> root (or a ready-made page such as <cmn-more-page>). Wrap its content in <cmn-page> from @lifekit-hq/ui. If this component is not a routed page, disable the rule for it with a reason after "--".',
      outside:
        'A routed page is rooted on <cmn-page>: {{found}} sits outside it. Move it inside <cmn-page>.',
      spacing:
        '{{owner}} sets its own spacing ({{found}}). A routed page sets no padding, margin or width: <cmn-page> owns them, so change the page template in @lifekit-hq/ui rather than the page.',
    },
  },
  create(context) {
    const reportSpacing = (node, owner, found, loc) =>
      context.report({node, loc, messageId: 'spacing', data: {owner, found}});

    return {
      // Angular templates: the root, and the spacing on the `cmn-page` element.
      Program(program) {
        if (!program.templateNodes) {
          return;
        }
        const significant = program.templateNodes.filter(
          node =>
            !(node.type === 'Text' && node.value.trim() === '') &&
            node.type !== 'LetDeclaration' &&
            !(node.type === 'Template' && node.tagName === 'ng-template')
        );
        const root = significant.find(
          node => node.type === 'Element' && PAGE_ROOT_TAGS.has(node.name)
        );
        if (!root) {
          const target = significant[0];
          context.report({
            loc: target ? templateLoc(context, target) : program.loc,
            messageId: 'missing',
          });
          return;
        }
        for (const node of significant.filter(other => other !== root)) {
          context.report({
            loc: templateLoc(context, node),
            messageId: 'outside',
            data: {found: node.type === 'Element' ? `<${node.name}>` : 'this content'},
          });
        }
        const loc = templateLoc(context, root);
        const owner = `<${root.name}>`;
        const classes = staticAttribute(root, 'class');
        for (const token of classes ? spacingClasses(classes) : []) {
          reportSpacing(undefined, owner, token, loc);
        }
        for (const {property} of spacingDeclarations(staticAttribute(root, 'style') ?? '')) {
          reportSpacing(undefined, owner, property, loc);
        }
        for (const input of root.inputs) {
          const set = bindingSpacing(input.keySpan?.toString() ?? '');
          if (set) {
            reportSpacing(undefined, owner, set, loc);
          }
        }
      },

      // The component class: its host metadata and its styles.
      'ClassDeclaration > Decorator > CallExpression[callee.name="Component"]'(call) {
        const [metadata] = call.arguments;
        if (metadata?.type !== 'ObjectExpression') {
          return;
        }
        const owner = 'The page host';
        const host = metadataProperty(metadata, 'host')?.value;
        if (host?.type === 'ObjectExpression') {
          for (const {node, found} of hostSpacing(host)) {
            reportSpacing(node, owner, found);
          }
        }
        const styles = metadataProperty(metadata, 'styles');
        for (const css of stringValues(styles?.value)) {
          for (const {property} of pageStylesheetSpacing(css)) {
            reportSpacing(styles, owner, property);
          }
        }
        for (const name of ['styleUrl', 'styleUrls']) {
          const urls = metadataProperty(metadata, name);
          for (const url of stringValues(urls?.value)) {
            for (const {property} of pageStylesheetSpacing(readStylesheet(context, url))) {
              reportSpacing(urls, owner, `${property} in ${url}`);
            }
          }
        }
      },

      // `@HostBinding('class.p-4')` and `@HostBinding('style.padding')`.
      'Decorator > CallExpression[callee.name="HostBinding"]'(call) {
        const [target] = stringValues(call.arguments[0]);
        const set = target && bindingSpacing(target);
        if (set) {
          reportSpacing(call, 'The page host', set);
        }
      },
    };
  },
};

const LIFEKIT_RULE = /lifekit\/[a-z-]+/;
const DISABLE_DIRECTIVE = /eslint-disable(?:-next-line|-line)?\b([^\n]*?)(?:-->|\*\/|$)/gm;

const requireDisableReason = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'A comment that disables a lifekit rule says why after "--", so the exception can be reviewed.',
    },
    schema: [],
    messages: {
      missing:
        'Give a reason when disabling a lifekit rule: "eslint-disable-next-line {{rule}} -- <why>".',
    },
  },
  create(context) {
    return {
      'Program:exit'() {
        const {text} = context.sourceCode;
        for (const match of text.matchAll(DISABLE_DIRECTIVE)) {
          const rule = LIFEKIT_RULE.exec(match[1]);
          if (!rule || /\s--\s*\S/.test(match[1])) {
            continue;
          }
          const start = context.sourceCode.getLocFromIndex(match.index);
          const end = context.sourceCode.getLocFromIndex(match.index + match[0].length);
          context.report({loc: {start, end}, messageId: 'missing', data: {rule: rule[0]}});
        }
      },
    };
  },
};

export default {
  meta: {name: '@lifekit-hq/eslint-plugin'},
  rules: {
    'no-raw-controls': noRawControls,
    'no-local-currency-format': noLocalCurrencyFormat,
    'require-disable-reason': requireDisableReason,
    'page-root': pageRoot,
  },
};
