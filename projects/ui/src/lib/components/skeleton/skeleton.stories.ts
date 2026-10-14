import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {SkeletonDirective} from '../../directives/skeleton/skeleton.directive';
import {SkeletonComponent} from './skeleton.component';

const meta: Meta<SkeletonComponent> = {
  title: 'Components/Skeleton',
  component: SkeletonComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [SkeletonDirective]})],
};

export default meta;
type Story = StoryObj<SkeletonComponent>;

export const Default: Story = {
  args: {},
};

export const Sized: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-md flex-col gap-cmn-2">
        <cmn-skeleton width="40%" height="1.75rem" />
        <cmn-skeleton width="100%" />
        <cmn-skeleton width="100%" />
        <cmn-skeleton width="65%" />
      </div>
    `,
  }),
};

export const Shapes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-skeleton width="3rem" height="3rem" className="rounded-full" />
        <div class="flex flex-1 flex-col gap-cmn-2">
          <cmn-skeleton width="50%" height="1rem" />
          <cmn-skeleton width="80%" height="0.75rem" />
        </div>
      </div>
    `,
  }),
};

export const CardPlaceholder: Story = {
  render: () => ({
    template: `
      <div class="max-w-sm rounded-cmn-md border border-border-default bg-surface-card p-cmn-4">
        <cmn-skeleton width="45%" height="0.875rem" className="mb-cmn-3" />
        <cmn-skeleton width="70%" height="2rem" className="mb-cmn-2" />
        <cmn-skeleton width="30%" height="0.75rem" />
      </div>
    `,
  }),
};

/**
 * `*cmnSkeleton` swaps the real content for placeholder bars while `loading`
 * is true, so the call site keeps one template instead of two branches.
 */
export const StructuralDirective: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="flex max-w-md flex-col gap-cmn-6">
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">loading</p>
          <ng-container *cmnSkeleton="{loading: true, count: 3, height: '1rem'}">
            <p class="text-cmn-sm text-text-primary">Loaded content</p>
          </ng-container>
        </section>
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">loaded</p>
          <ng-container *cmnSkeleton="{loading: false}">
            <p class="text-cmn-sm text-text-primary">Loaded content</p>
          </ng-container>
        </section>
      </div>
    `,
  }),
};

/**
 * `shape` draws a whole component's silhouette, copying its box so the page does not move when
 * the content arrives. The sheen sweeps across each block; Reduce Motion leaves them still.
 */
export const Presets: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-md flex-col gap-cmn-6 bg-surface-bg p-cmn-4">
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">stat</p>
          <cmn-skeleton shape="stat" />
        </section>
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">chart</p>
          <cmn-skeleton shape="chart" />
        </section>
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">chart, aspect 16 / 9</p>
          <cmn-skeleton shape="chart" aspect="16 / 9" />
        </section>
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">section (heading and 3 rows)</p>
          <cmn-skeleton shape="section" />
        </section>
        <section>
          <p class="mb-cmn-2 text-cmn-xs text-text-secondary">row, 2</p>
          <div class="rounded-cmn-md border border-border-default bg-surface-card">
            <cmn-skeleton shape="row" [count]="2" />
          </div>
        </section>
      </div>
    `,
  }),
};

/** The same presets on the dark ground, where the skeleton colour must still read. */
export const PresetsDark: Story = {
  ...Presets,
  globals: {theme: 'dark'},
};
