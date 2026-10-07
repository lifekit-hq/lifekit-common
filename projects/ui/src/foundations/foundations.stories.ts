import type {Meta, StoryObj} from '@storybook/angular';

import {blend, type ContrastGrade, contrastRatio, gradeContrast, type Rgb, toHex} from './contrast';
import {listColorTokens, readTypeStep, resolveColor, type ThemeName} from './token-reader';

const meta: Meta = {
  title: 'Foundations',
  parameters: {layout: 'padded'},
};

export default meta;
type Story = StoryObj;

const THEMES: readonly ThemeName[] = ['light', 'dark'];
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;
const TINT_ALPHA = 0.15;

// ─── Type ramp ───────────────────────────────────────────────────────────────

/** Class names of the Tailwind preset's `cmn-*` size scale; sizes and line heights are read from the DOM. */
const RAMP: readonly {name: string; cls: string}[] = [
  {name: 'cmn-4xl', cls: 'text-cmn-4xl'},
  {name: 'cmn-3xl', cls: 'text-cmn-3xl'},
  {name: 'cmn-2xl', cls: 'text-cmn-2xl'},
  {name: 'cmn-xl', cls: 'text-cmn-xl'},
  {name: 'cmn-lg', cls: 'text-cmn-lg'},
  {name: 'cmn-md', cls: 'text-cmn-md'},
  {name: 'cmn-sm', cls: 'text-cmn-sm'},
  {name: 'cmn-xs', cls: 'text-cmn-xs'},
];

const WEIGHTS: readonly {name: string; cls: string}[] = [
  {name: 'Regular 400', cls: 'font-normal'},
  {name: 'Medium 500', cls: 'font-medium'},
  {name: 'Semibold 600', cls: 'font-semibold'},
  {name: 'Bold 700', cls: 'font-bold'},
];

const SPECIMEN_LATIN = 'Groceries and household, 1 234,56';
const SPECIMEN_CYRILLIC = 'Продукти та господарські товари — Київ';

export const TypeRamp: Story = {
  name: 'Type ramp',
  render: () => ({
    props: {ramp: RAMP, weights: WEIGHTS, latin: SPECIMEN_LATIN, cyrillic: SPECIMEN_CYRILLIC},
    template: `
      <section class="flex flex-col gap-cmn-8 text-text-primary">
        <header class="flex flex-col gap-cmn-1">
          <h1 class="text-cmn-2xl font-semibold">Type ramp</h1>
          <p class="text-cmn-sm text-text-secondary">
            One family, IBM Plex Sans, carries every role including money. Sizes and line heights below are read from the rendered elements,
            so they cannot drift from the Tailwind preset. 12px (<code>cmn-xs</code>) is the floor: nothing smaller ships.
          </p>
        </header>

        <div class="flex flex-col divide-y divide-border-default border border-border-default rounded-cmn-lg bg-surface-card">
          @for (step of ramp; track step.name) {
            <div class="grid grid-cols-[9rem_1fr] items-baseline gap-cmn-4 p-cmn-4" data-ramp-row>
              <div class="flex flex-col text-cmn-xs text-text-secondary tabular-nums">
                <span class="font-medium text-text-primary">{{ step.name }}</span>
                <span data-ramp-metrics>…</span>
              </div>
              <div class="flex flex-col gap-cmn-1">
                <span [class]="step.cls" data-ramp-sample>{{ latin }}</span>
                <span [class]="step.cls" lang="uk">{{ cyrillic }}</span>
              </div>
            </div>
          }
        </div>

        <div class="flex flex-col gap-cmn-3">
          <h2 class="text-cmn-lg font-semibold">Weights</h2>
          <div class="grid gap-cmn-3 sm:grid-cols-2">
            @for (w of weights; track w.name) {
              <div class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
                <div class="text-cmn-xs text-text-secondary">{{ w.name }}</div>
                <div [class]="'text-cmn-xl ' + w.cls">Aa Бб Ґґ — 0123456789</div>
              </div>
            }
          </div>
        </div>
      </section>
    `,
  }),
  play: ({canvasElement}) => {
    for (const row of Array.from(canvasElement.querySelectorAll('[data-ramp-row]'))) {
      const sample = row.querySelector('[data-ramp-sample]');
      const out = row.querySelector('[data-ramp-metrics]');
      if (sample && out) {
        const {fontSize, lineHeight} = readTypeStep(sample);
        out.textContent = `${fontSize} / ${lineHeight}`;
      }
    }
  },
};

// ─── Colour tokens ───────────────────────────────────────────────────────────

/**
 * What each foreground token is *for*: the backgrounds it must sit on and the WCAG minimum that
 * use demands. Only this intent is written down; every colour value is resolved from the tokens.
 */
interface Pairing {
  readonly fg: string;
  readonly onTokens: readonly string[];
  readonly min: number;
  readonly use: string;
  /** Composite the fg over the background at this alpha first (status text on its own tint). */
  readonly tint?: boolean;
}

const SURFACES = ['--color-surface-bg', '--color-surface-card', '--color-surface-raised'];
const STATUSES = ['info', 'success', 'warning', 'error'].map(s => `--color-status-${s}`);

const PAIRINGS: readonly Pairing[] = [
  {fg: '--color-text-primary', onTokens: SURFACES, min: TEXT_MIN, use: 'Body and headings'},
  {fg: '--color-text-secondary', onTokens: SURFACES, min: TEXT_MIN, use: 'Supporting text, labels'},
  {fg: '--color-text-placeholder', onTokens: SURFACES, min: TEXT_MIN, use: 'Input placeholders'},
  {
    fg: '--color-text-disabled',
    onTokens: SURFACES,
    min: NON_TEXT_MIN,
    use: 'Disabled controls (WCAG exempts; 3:1 kept as a floor)',
  },
  {fg: '--color-accent-default', onTokens: SURFACES, min: TEXT_MIN, use: 'Links, accent text'},
  {fg: '--color-accent-hover', onTokens: SURFACES, min: TEXT_MIN, use: 'Link hover'},
  {
    fg: '--color-text-inverse',
    onTokens: ['--color-accent-default'],
    min: TEXT_MIN,
    use: 'Label on a filled accent button',
  },
  ...STATUSES.map(fg => ({
    fg,
    onTokens: ['--color-surface-card'],
    min: TEXT_MIN,
    use: 'Status text on a card',
  })),
  ...STATUSES.map(fg => ({
    fg,
    onTokens: [fg],
    min: TEXT_MIN,
    use: 'Status text on its own 15% tint',
    tint: true,
  })),
  ...STATUSES.map(fg => ({
    fg: '--color-text-inverse',
    onTokens: [fg],
    min: TEXT_MIN,
    use: 'Label on a solid status fill (badge)',
  })),
  {
    fg: '--color-border-strong',
    onTokens: ['--color-surface-card'],
    min: NON_TEXT_MIN,
    use: 'Input and control outlines (1.4.11)',
  },
  {fg: '--color-border-focus', onTokens: SURFACES, min: NON_TEXT_MIN, use: 'Focus ring (1.4.11)'},
];

interface Cell {
  readonly bg: string;
  readonly ratio: string;
  readonly grade: ContrastGrade;
  readonly pass: boolean;
  readonly bgHex: string;
}

interface Row {
  readonly fg: string;
  readonly fgHex: string;
  readonly use: string;
  readonly min: number;
  readonly cells: Cell[];
}

function short(token: string): string {
  return token.replace('--color-', '');
}

function pairingRows(theme: ThemeName): Row[] {
  return PAIRINGS.map(p => {
    const fg = resolveColor(p.fg, theme);
    const cells = p.onTokens.map(bgToken => {
      const base = resolveColor(bgToken, theme);
      const bg: Rgb = p.tint
        ? blend(base, resolveColor('--color-surface-card', theme), TINT_ALPHA)
        : base;
      const ratio = contrastRatio(fg, bg);
      const grade = gradeContrast(ratio, p.min);
      return {
        bg: short(bgToken),
        ratio: ratio.toFixed(2),
        grade,
        pass: grade !== 'fail',
        bgHex: toHex(bg),
      };
    });
    return {fg: short(p.fg), fgHex: toHex(fg), use: p.use, min: p.min, cells};
  });
}

interface Swatch {
  readonly name: string;
  readonly hex: string;
}

function swatches(theme: ThemeName): Swatch[] {
  return listColorTokens().map(token => ({
    name: short(token),
    hex: toHex(resolveColor(token, theme)),
  }));
}

export const ColourTokens: Story = {
  name: 'Colour tokens',
  render: () => ({
    props: {
      themes: THEMES.map(theme => ({theme, swatches: swatches(theme), rows: pairingRows(theme)})),
    },
    template: `
      <section class="flex flex-col gap-cmn-8 text-text-primary">
        <header class="flex flex-col gap-cmn-1">
          <h1 class="text-cmn-2xl font-semibold">Colour tokens</h1>
          <p class="text-cmn-sm text-text-secondary">
            Token names are discovered from the loaded <code>theme.css</code>; hex values and contrast ratios are computed live from the
            resolved colours, in both themes regardless of the toolbar. Required: 4.5:1 for text, 3:1 for UI components.
          </p>
        </header>

        @for (t of themes; track t.theme) {
          <div [attr.data-theme]="t.theme" class="flex flex-col gap-cmn-6 rounded-cmn-lg border border-border-default bg-surface-bg p-cmn-6">
            <h2 class="text-cmn-xl font-semibold capitalize">{{ t.theme }}</h2>

            <div class="grid gap-cmn-2" style="grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr))">
              @for (s of t.swatches; track s.name) {
                <div class="flex items-center gap-cmn-2 rounded-cmn-md border border-border-default bg-surface-card p-cmn-2">
                  <span class="size-8 shrink-0 rounded-cmn-sm border border-border-default" [style.background]="s.hex"></span>
                  <span class="flex min-w-0 flex-col text-cmn-xs">
                    <span class="truncate font-medium">{{ s.name }}</span>
                    <span class="text-text-secondary tabular-nums">{{ s.hex }}</span>
                  </span>
                </div>
              }
            </div>

            <div class="overflow-x-auto rounded-cmn-md border border-border-default bg-surface-card">
              <table class="w-full border-collapse text-cmn-sm">
                <thead>
                  <tr class="text-left text-cmn-xs text-text-secondary">
                    <th class="p-cmn-2 font-medium">Foreground</th>
                    <th class="p-cmn-2 font-medium">Use</th>
                    <th class="p-cmn-2 font-medium">Min</th>
                    <th class="p-cmn-2 font-medium">Against</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of t.rows; track $index) {
                    <tr class="border-t border-border-default align-top">
                      <td class="p-cmn-2">
                        <span class="inline-flex items-center gap-cmn-2">
                          <span class="size-4 rounded-cmn-sm border border-border-default" [style.background]="r.fgHex"></span>
                          <span class="font-medium">{{ r.fg }}</span>
                        </span>
                      </td>
                      <td class="p-cmn-2 text-text-secondary">{{ r.use }}</td>
                      <td class="p-cmn-2 tabular-nums">{{ r.min }}:1</td>
                      <td class="p-cmn-2">
                        <div class="flex flex-wrap gap-cmn-2">
                          @for (c of r.cells; track c.bg) {
                            <span
                              class="inline-flex items-center gap-cmn-2 rounded-cmn-md border border-border-default px-cmn-2 py-cmn-1 text-cmn-xs"
                              [attr.data-pass]="c.pass"
                            >
                              <span class="flex size-6 items-center justify-center rounded-cmn-sm font-semibold" [style.background]="c.bgHex" [style.color]="r.fgHex">Aa</span>
                              <span class="tabular-nums">{{ c.ratio }}:1</span>
                              <span class="font-semibold" [class.text-status-success]="c.pass" [class.text-status-error]="!c.pass">{{ c.grade }}</span>
                              <span class="text-text-secondary">on {{ c.bg }}</span>
                            </span>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </section>
    `,
  }),
};

// ─── Money specimen ──────────────────────────────────────────────────────────

interface Entry {
  readonly description: string;
  readonly account: string;
  readonly amount: number;
  readonly currency: 'UAH' | 'EUR' | 'USD' | 'GBP';
}

/** Locale per currency: how each is conventionally written (separators, symbol placement). */
const LOCALE: Record<Entry['currency'], string> = {
  UAH: 'uk-UA',
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
};

const MINUS = '−';

const ENTRIES: readonly Entry[] = [
  {description: 'Зарплата — ТОВ «Ромашка»', account: 'monobank', amount: 62500, currency: 'UAH'},
  {description: 'Продукти — Сільпо, Київ', account: 'monobank', amount: -1284.5, currency: 'UAH'},
  {description: 'Оренда квартири, жовтень', account: 'ПриватБанк', amount: -18000, currency: 'UAH'},
  {
    description: 'Кава та круасан — Lviv Croissants',
    account: 'monobank',
    amount: -145,
    currency: 'UAH',
  },
  {description: 'Spotify Premium', account: 'Revolut', amount: -9.99, currency: 'EUR'},
  {description: 'Переказ від Олени Коваленко', account: 'Revolut', amount: 1250, currency: 'EUR'},
  {description: 'Freelance — Щоденна підтримка', account: 'Wise', amount: 3420.75, currency: 'USD'},
  {description: 'GitHub Copilot', account: 'Wise', amount: -10, currency: 'USD'},
  {description: 'Квиток Київ → London Gatwick', account: 'Wise', amount: -312.4, currency: 'GBP'},
  {description: 'Повернення коштів — Мотузка', account: 'monobank', amount: 0.5, currency: 'UAH'},
];

function formatMoney(amount: number, currency: Entry['currency']): string {
  const abs = new Intl.NumberFormat(LOCALE[currency], {style: 'currency', currency}).format(
    Math.abs(amount)
  );
  if (amount === 0) {
    return abs;
  }
  return `${amount < 0 ? MINUS : '+'}${abs}`;
}

function totals(entries: readonly Entry[]): {currency: string; text: string}[] {
  const sums = new Map<Entry['currency'], number>();
  for (const e of entries) {
    sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amount);
  }
  return [...sums].map(([currency, sum]) => ({currency, text: formatMoney(sum, currency)}));
}

export const MoneySpecimen: Story = {
  name: 'Money specimen',
  render: () => ({
    props: {
      rows: ENTRIES.map(e => ({
        description: e.description,
        account: e.account,
        currency: e.currency,
        text: formatMoney(e.amount, e.currency),
        negative: e.amount < 0,
      })),
      totals: totals(ENTRIES),
    },
    template: `
      <section class="flex flex-col gap-cmn-8 text-text-primary">
        <header class="flex flex-col gap-cmn-1">
          <h1 class="text-cmn-2xl font-semibold">Money specimen</h1>
          <p class="text-cmn-sm text-text-secondary">
            Money is set in the text face with <code>tabular-nums</code>, right-aligned, so columns of amounts line up in any currency.
            Sign is carried by the glyph (+ / −) as well as colour; amounts are never mono, never colour-only, and each currency keeps its own
            locale formatting. Descriptions are free-form Cyrillic and Latin.
          </p>
        </header>

        <div class="overflow-x-auto rounded-cmn-lg border border-border-default bg-surface-card">
          <table class="w-full border-collapse text-cmn-md">
            <thead>
              <tr class="text-left text-cmn-xs text-text-secondary">
                <th class="p-cmn-3 font-medium">Description</th>
                <th class="p-cmn-3 font-medium">Account</th>
                <th class="p-cmn-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows; track $index) {
                <tr class="border-t border-border-default">
                  <td class="p-cmn-3">{{ r.description }}</td>
                  <td class="p-cmn-3 text-cmn-sm text-text-secondary">{{ r.account }}</td>
                  <td class="p-cmn-3 text-right font-medium tabular-nums whitespace-nowrap"
                      [class.text-status-error]="r.negative"
                      [class.text-status-success]="!r.negative">{{ r.text }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              @for (t of totals; track t.currency) {
                <tr class="border-t border-border-strong">
                  <td class="p-cmn-3 text-cmn-sm font-medium" colspan="2">Net {{ t.currency }}</td>
                  <td class="p-cmn-3 text-right font-semibold tabular-nums whitespace-nowrap">{{ t.text }}</td>
                </tr>
              }
            </tfoot>
          </table>
        </div>
      </section>
    `,
  }),
};
