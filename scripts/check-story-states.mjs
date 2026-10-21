#!/usr/bin/env node
/**
 * Story-state check (docs/design/guardrails.md, X2 with S6, S7 and T3): every component has a
 * story for each state its category needs. A state is met by a story export whose name matches
 * the state's pattern, in any `*.stories.ts` in the component's directory.
 *
 * Exits 1 (fail) when:
 *   - a required state has no story and docs/story-states-baseline.json does not justify the gap,
 *   - a baseline entry is stale: its state now has a story, or it names a component or state
 *     the categories below do not require (the baseline only shrinks), or
 *   - a component named in a category has no directory.
 */
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'projects/ui/src/lib/components');
const BASELINE_PATH = join(ROOT, 'docs/story-states-baseline.json');

const DISABLED = /^Disabled$/;
const ERROR = /^Error$|Error$|^Invalid/;
const LONG = /^(?:With)?(?:Long|Many)/;

/** The category state sets from guardrails.md (X2). Each state is a pattern over export names. */
export const CATEGORIES = [
  {
    name: 'Field',
    components: ['input', 'textarea', 'select', 'date-range', 'search-input'],
    states: {
      Default: /^Default$/,
      Filled: /^(?:Filled|WithValue|Prefilled)$/,
      Disabled: DISABLED,
      ReadOnly: /^Read[Oo]nly$/,
      Error: ERROR,
    },
  },
  {
    name: 'Choice',
    components: ['checkbox', 'toggle', 'segmented', 'chip'],
    states: {
      Off: /^(?:Off|Unchecked|Unselected|Default)$/,
      On: /^(?:On|Checked|Selected|Chosen)$/,
      Disabled: DISABLED,
    },
  },
  {
    // Lists are data-table's list rows (`ListRows*`), so data-table carries their states.
    name: 'Async surface',
    components: [
      'data-table',
      'area-chart',
      'bar-chart',
      'donut-chart',
      'line-chart',
      'stat-card',
      'chat',
    ],
    states: {
      Loading: /Loading$/,
      Empty: /Empty/,
      Error: ERROR,
      Populated: /^(?:Default|Populated|Single|Stacked|WithHistory)$/,
      LongContent: LONG,
    },
  },
  {
    name: 'Feedback',
    components: ['toast', 'alert'],
    states: {
      Info: /^Info$/,
      Success: /^Success$/,
      Warning: /^Warning$/,
      Error: /^Error$/,
      WithAction: /^WithAction/,
      LongContent: LONG,
    },
  },
  {
    // S6: an empty state for first use, for no results and for an error.
    name: 'Empty state',
    components: ['empty-state'],
    states: {FirstUse: /^FirstUse/, NoResults: /^NoResults/, Error: /^Error/},
  },
  {
    // One launcher story per service (AGENTS.md).
    name: 'Overlay',
    components: ['dialog', 'drawer', 'command-palette'],
    states: {Launcher: /./},
  },
];

/** Stories that hold a state under a name of their own: `component/State` to the export. */
export const ALIASES = new Map([['date-range/Error', 'InvertedRange']]);

/** Story export names in one component directory. */
export function storyExports(dir) {
  return readdirSync(dir)
    .filter(file => file.endsWith('.stories.ts'))
    .flatMap(file => [...readFileSync(join(dir, file), 'utf8').matchAll(/^export const (\w+)/gm)])
    .map(match => match[1]);
}

/**
 * Validates story exports against the categories and the baseline.
 * @param {Map<string, string[] | null>} exportsByComponent null for a missing directory
 * @param {{component: string, state: string, reason: string}[]} gaps
 * @returns {string[]} error messages (empty when valid)
 */
export function validate(exportsByComponent, gaps, categories = CATEGORIES) {
  const errors = [];
  const justified = new Map(gaps.map(gap => [`${gap.component}/${gap.state}`, gap]));
  const required = new Set();
  for (const category of categories) {
    for (const component of category.components) {
      const names = exportsByComponent.get(component);
      if (!names) {
        errors.push(`${component}: no component directory (category ${category.name})`);
        continue;
      }
      for (const [state, pattern] of Object.entries(category.states)) {
        const key = `${component}/${state}`;
        required.add(key);
        const met =
          names.some(name => pattern.test(name)) || names.includes(ALIASES.get(key) ?? '');
        if (!met && !justified.has(key)) {
          errors.push(`${key}: no story matches ${pattern} (${category.name})`);
        } else if (met && justified.has(key)) {
          errors.push(`${key}: has a story now; remove it from the baseline`);
        }
      }
    }
  }
  for (const [key, gap] of justified) {
    if (!required.has(key)) errors.push(`${key}: baseline entry for a state no category requires`);
    else if (!gap.reason?.trim()) errors.push(`${key}: baseline entry has no reason`);
  }
  return errors;
}

function main() {
  const exportsByComponent = new Map();
  for (const category of CATEGORIES) {
    for (const component of category.components) {
      const dir = join(COMPONENTS_DIR, component);
      exportsByComponent.set(component, existsSync(dir) ? storyExports(dir) : null);
    }
  }
  const {gaps} = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const errors = validate(exportsByComponent, gaps);
  if (errors.length) {
    console.error(`check-story-states: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exit(1);
  }
  console.log(
    `check-story-states: ${exportsByComponent.size} components, ${gaps.length} justified gap(s)`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
