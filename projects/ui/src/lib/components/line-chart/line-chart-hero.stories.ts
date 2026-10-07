/**
 * The dashboard hero this chart work is built for: headline number and delta, then the chart,
 * then the period control under it. Holding a pointer on the chart makes the headline and delta
 * read the point under it and snap back on release. Only the delta text is coloured; the chart
 * and the card never repaint.
 *
 * Judged against the Robinhood/IBKR portfolio hero in the #825 reference board (pick 1, charts A).
 */
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {chartDelta, type ChartPoint, type ChartScrubPoint, money} from '@lifekit-hq/charts-core';
import {LkSegmented, type SegmentedOption} from '@lifekit-hq/elements';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {LineChartComponent} from './line-chart.component';

if (!customElements.get('lk-segmented')) {
  customElements.define('lk-segmented', LkSegmented);
}

const PERIODS: SegmentedOption[] = ['1W', '1M', '3M', 'YTD', '1Y', '5Y', 'MAX'].map(value => ({
  value,
  label: value,
}));
const POINTS_PER_PERIOD: Record<string, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 13,
  YTD: 40,
  '1Y': 12,
  '5Y': 20,
  MAX: 24,
};
const START = 1_250_000;
const WAVE = 18_000;
const DRIFT = 4_000;

/** A deterministic wandering series, so the story and its screenshots do not move. */
function series(period: string, direction: 1 | -1): ChartPoint[] {
  const count = POINTS_PER_PERIOD[period];
  return Array.from({length: count}, (_, i) => ({
    label: `${period} ${i + 1}`,
    value: Math.round(
      START + direction * DRIFT * i + WAVE * Math.sin(i * 1.7) + WAVE * Math.cos(i * 0.6)
    ),
  }));
}

interface HeroArgs {
  direction: 1 | -1;
}

interface Hero {
  period: string;
  data: ChartPoint[];
  headline: number;
  change: number;
  percent: number | null;
  scrubbing: boolean;
}

function rest(hero: Hero): void {
  const last = hero.data[hero.data.length - 1].value;
  const delta = chartDelta(hero.data[0].value, last);
  Object.assign(hero, {
    headline: last,
    change: delta.change,
    percent: delta.percent,
    scrubbing: false,
  });
}

const meta: Meta<HeroArgs> = {
  title: 'Patterns/Period hero',
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [LineChartComponent], schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  args: {direction: 1},
  argTypes: {direction: {control: 'inline-radio', options: [1, -1]}},
  render: args => {
    const hero: Hero = {
      period: '1M',
      data: [],
      headline: 0,
      change: 0,
      percent: null,
      scrubbing: false,
    };
    const load = (): void => {
      hero.data = series(hero.period, args.direction);
      rest(hero);
    };
    load();
    return {
      props: {
        hero,
        periods: PERIODS,
        money,
        pick: (e: CustomEvent<{value: string}>) => {
          hero.period = e.detail.value;
          load();
        },
        scrub: (point: ChartScrubPoint) => {
          const delta = chartDelta(hero.data[0].value, point.y);
          Object.assign(hero, {
            headline: point.y,
            change: delta.change,
            percent: delta.percent,
            scrubbing: true,
          });
        },
        release: () => rest(hero),
        deltaClass: (h: Hero) =>
          h.change === 0
            ? 'text-text-secondary'
            : h.change > 0
              ? 'text-status-success'
              : 'text-status-error',
      },
      template: `
        <section class="mx-auto flex w-full max-w-md flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
          <div>
            <p class="font-label text-cmn-xs font-semibold text-text-secondary">Net worth</p>
            <p class="text-cmn-2xl font-semibold text-text-primary" data-testid="headline">{{ money(hero.headline, 'USD') }}</p>
            <p class="text-cmn-sm" [class]="deltaClass(hero)" data-testid="delta">
              {{ hero.change > 0 ? '+' : '' }}{{ money(hero.change, 'USD') }}
              @if (hero.percent !== null) { ({{ hero.percent.toFixed(2) }}%) }
              <span class="text-text-secondary">{{ hero.scrubbing ? 'to this point' : 'over ' + hero.period }}</span>
            </p>
          </div>
          <cmn-line-chart
            [data]="hero.data"
            [scrubbable]="true"
            (scrub)="scrub($event)"
            (scrubEnd)="release()"
          />
          <lk-segmented
            [options]="periods"
            [value]="hero.period"
            label="History range"
            (lk-segmented-change)="pick($event)"
          ></lk-segmented>
        </section>
      `,
    };
  },
};

export default meta;
type Story = StoryObj<HeroArgs>;

/** Hover the chart with a mouse, or press and hold with a finger, and read the headline change. */
export const Default: Story = {};

/** A down period: the delta text turns to the error token, nothing else changes colour. */
export const DownPeriod: Story = {args: {direction: -1}};

/** The 390px phone the control is sized for: seven periods in one row of 44px-plus cells. */
export const Phone: Story = {
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

export const Dark: Story = {globals: {theme: 'dark'}};
