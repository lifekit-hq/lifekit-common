import type {Meta, StoryObj} from '@storybook/angular';

import {CmnPasswordStrengthComponent} from './password-strength.component';

const meta: Meta<CmnPasswordStrengthComponent> = {
  title: 'Components/Password Strength',
  component: CmnPasswordStrengthComponent,
  tags: ['autodocs'],
  argTypes: {
    score: {control: {type: 'range', min: 0, max: 4, step: 1}},
  },
};

export default meta;
type Story = StoryObj<CmnPasswordStrengthComponent>;

/** Score 0 renders nothing — an untouched password field shows no meter. */
export const Hidden: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="max-w-xs rounded-cmn-md border border-dashed border-border-default p-cmn-4">
        <cmn-password-strength [score]="score" />
      </div>
    `,
  }),
  args: {score: 0},
};

export const Weak: Story = {
  render: args => ({props: args, template: '<cmn-password-strength [score]="score" />'}),
  args: {score: 1},
};

export const Fair: Story = {
  render: args => ({props: args, template: '<cmn-password-strength [score]="score" />'}),
  args: {score: 2},
};

export const Good: Story = {
  render: args => ({props: args, template: '<cmn-password-strength [score]="score" />'}),
  args: {score: 3},
};

export const Strong: Story = {
  render: args => ({props: args, template: '<cmn-password-strength [score]="score" />'}),
  args: {score: 4},
};

export const AllScores: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-xs flex-col gap-cmn-4">
        @for (score of scores; track score) {
          <cmn-password-strength [score]="score" />
        }
      </div>
    `,
    props: {scores: [1, 2, 3, 4]},
  }),
};
