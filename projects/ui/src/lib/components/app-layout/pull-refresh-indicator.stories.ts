import type {Meta, StoryObj} from '@storybook/angular';

import {PullRefreshIndicatorComponent} from './pull-refresh-indicator.component';

/**
 * The indicator of pull to refresh, drawn alone in the gap under a bar. In the shell it follows
 * the finger; here each state is held still. A spinner is the one thing that keeps turning under
 * Reduce Motion.
 */
const meta: Meta<PullRefreshIndicatorComponent> = {
  title: 'Components/Pull Refresh Indicator',
  component: PullRefreshIndicatorComponent,
  tags: ['autodocs'],
  render: args => ({
    props: args,
    template: `
      <div class="relative h-24 w-80 border-t border-border-default bg-surface-bg">
        <cmn-pull-refresh-indicator
          class="absolute inset-x-0 top-0"
          [progress]="progress"
          [refreshing]="refreshing"
          [offset]="offset"
          [dragging]="dragging"
          [hidden]="hidden"
        />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<PullRefreshIndicatorComponent>;

/** Part way: the arc has wound a share of the way and the chip is half there. */
export const Pulling: Story = {args: {progress: 0.5, offset: 32, dragging: true}};

/** Past the threshold: releasing now refreshes. */
export const Ready: Story = {args: {progress: 1, offset: 64, dragging: true}};

/** Released: the content rests one control height down and the arc spins until the reload is done. */
export const Refreshing: Story = {args: {progress: 1, refreshing: true, offset: 48}};

/** Reduce Motion: the content does not move, so the chip sits a small step below the bar and only fades in. */
export const ReduceMotion: Story = {args: {progress: 1, refreshing: true, offset: 0}};
