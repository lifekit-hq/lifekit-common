import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {PriceBlockComponent} from '../components/price-block/price-block.component';
import {BENCHMARK, RISING} from '../components/price-block/price-block.fixtures';

const CAPTION =
  'ACME’s price in US dollars. The dotted line marks the price at the start of the period; the ' +
  'pill beside the price is the change since then.';
const COMPARED_CAPTION =
  'ACME (blue) and the World index (grey), each as its percent change since the start of the ' +
  'period. The dotted line marks 0%, the start.';

/**
 * The golden price screens: the price block as a page shows it, once for one instrument over a year
 * and once with a benchmark overlaid (so the chart reads in percent). Fake data only: a made-up
 * ticker and index, on dates that never move. `e2e/screens/price-block.spec.ts` photographs each at
 * rest and, with a mouse held over the plot, with the crosshair and its one combined pill.
 */
@Component({
  selector: 'cmn-price-golden',
  imports: [PriceBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block bg-surface-bg p-cmn-4 md:p-cmn-8'},
  template: `
    <div class="mx-auto flex max-w-[48rem] flex-col gap-cmn-6" data-price-golden>
      @if (compared()) {
        <cmn-price-block
          [series]="comparedSeries"
          [caption]="comparedCaption"
          label="ACME against the World index"
          period="6M"
        />
      } @else {
        <cmn-price-block [series]="single" [caption]="caption" label="ACME" />
      }
    </div>
  `,
})
class PriceGoldenComponent {
  public readonly compared = input<boolean>(false);
  protected readonly single = [RISING];
  protected readonly comparedSeries = [RISING, BENCHMARK];
  protected readonly caption = CAPTION;
  protected readonly comparedCaption = COMPARED_CAPTION;
}

const meta: Meta<PriceGoldenComponent> = {
  title: 'Charts/Golden',
  component: PriceGoldenComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<PriceGoldenComponent>;

/** One instrument over a year: the price, its change pill, the dotted start-of-period baseline. */
export const Price: Story = {};

/** The same instrument over six months against a benchmark: both lines read in percent from 0%. */
export const Compared: Story = {args: {compared: true}};
