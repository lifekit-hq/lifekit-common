import type {Rgb} from './contrast';
import {parseColor} from './contrast';

export type ThemeName = 'light' | 'dark';

export interface TypeStep {
  readonly fontSize: string;
  readonly lineHeight: string;
  readonly fontFamily: string;
}

const COLOR_PREFIX = '--color-';

function* styleRules(rules: CSSRuleList): Generator<CSSStyleRule> {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      yield rule;
    } else if ('cssRules' in rule) {
      yield* styleRules((rule as CSSGroupingRule).cssRules);
    }
  }
}

/**
 * Names of every `--color-*` custom property the loaded stylesheets declare, in source order.
 * Discovered from the CSSOM so the stories never carry a copy of the token list.
 */
export function listColorTokens(sheets: StyleSheetList = document.styleSheets): string[] {
  const names = new Set<string>();
  for (const sheet of Array.from(sheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet: unreadable, and not ours
    }
    for (const rule of styleRules(rules)) {
      for (const name of Array.from(rule.style)) {
        if (name.startsWith(COLOR_PREFIX)) {
          names.add(name);
        }
      }
    }
  }
  return [...names];
}

/** Resolves a colour token (or any CSS colour) under `theme`, independent of the toolbar's active theme. */
export function resolveColor(value: string, theme: ThemeName): Rgb {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', theme);
  const isToken = value.startsWith('--');
  probe.style.color = isToken ? `var(${value})` : value;
  if (!probe.style.color) {
    throw new Error(`Unsupported CSS colour: ${value}`);
  }
  document.body.appendChild(probe);
  try {
    const computed = getComputedStyle(probe);
    if (isToken && !computed.getPropertyValue(value).trim()) {
      throw new Error(`Colour token ${value} is not defined under theme "${theme}"`);
    }
    const rgb = parseColor(computed.color);
    if (!rgb) {
      throw new Error(`Cannot parse computed colour "${computed.color}" for ${value}`);
    }
    return rgb;
  } finally {
    probe.remove();
  }
}

/** Computed type metrics of an element carrying a ramp class (e.g. `text-cmn-lg`). */
export function readTypeStep(element: Element): TypeStep {
  const {fontSize, lineHeight, fontFamily} = getComputedStyle(element);
  return {fontSize, lineHeight, fontFamily};
}
