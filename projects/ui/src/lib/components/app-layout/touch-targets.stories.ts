import {ChangeDetectionStrategy, Component} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {ChipComponent} from '../chip/chip.component';

const RANGES = ['1W', '1M', '3M', '1Y', 'All'];

@Component({
  selector: 'cmn-touch-targets',
  imports: [ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-sm p-cmn-4">
      <div
        class="flex flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
      >
        <div class="flex items-center justify-between">
          <p class="font-headline text-cmn-sm font-semibold text-text-primary">Net worth</p>
          <a class="cmn-hit-slop text-cmn-sm text-accent-default" href="#breakdown">Breakdown</a>
        </div>
        <div class="flex gap-cmn-2">
          @for (range of ranges; track range) {
            <cmn-chip [selected]="range === '1M'">{{ range }}</cmn-chip>
          }
        </div>
      </div>
    </div>
  `,
})
class TouchTargetsComponent {
  protected readonly ranges = RANGES;
}

/**
 * Fixture for the phone conformance suite, and the reference for small controls on a phone: a
 * chip draws a pill but presses as a 44px square (below md), and `cmn-hit-slop` gives a link in a
 * card the same 44px target without changing how the link looks or where it sits. Neighbouring
 * targets overlap rather than push each other apart, so leave a target's height between rows.
 */
const meta: Meta<TouchTargetsComponent> = {
  title: 'Conformance/Touch Targets',
  component: TouchTargetsComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;

export const Targets: StoryObj<TouchTargetsComponent> = {
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};
