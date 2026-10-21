// lifekit's own ESLint rules for consumer apps (docs/design/guardrails.md, rules X1 and $1).
// Template rules run on Angular templates (external `.html` and inline templates extracted by
// `angular.processInlineTemplates`); the same rule object also carries TypeScript selectors, and
// each parser only visits the node types it produces.

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
  },
};
