import type {Meta, StoryObj} from '@storybook/angular';
import {applicationConfig} from '@storybook/angular';

import {provideAppMark} from '../../providers/provide-app-mark';
import {AppMarkComponent} from './app-mark.component';

interface Args {
  app: 'lk' | 'fs' | 'dc' | 'bk';
  size: number;
  label: string;
}

const meta: Meta<Args> = {
  title: 'Components/AppMark',
  component: AppMarkComponent,
  tags: ['autodocs'],
  argTypes: {
    app: {control: 'select', options: ['lk', 'fs', 'dc', 'bk']},
    size: {control: {type: 'number', min: 16, max: 128}},
    label: {control: 'text'},
  },
  parameters: {
    docs: {
      description: {
        component:
          'The app’s mark, inline, in `--color-accent-default` / `--color-text-inverse`: it follows ' +
          'the app’s seed, the colour a user picks and light/dark. Set the app’s own mark once with ' +
          '`provideAppMark(app)`; the same call keeps the SVG favicon on the chosen colour.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: '<cmn-app-mark [app]="app" [size]="size" [label]="label" />',
  }),
  args: {app: 'bk', size: 56, label: 'Basket'},
};

export const EveryApp: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-app-mark app="lk" label="Lifekit" />
        <cmn-app-mark app="fs" label="Finance Sentry" />
        <cmn-app-mark app="dc" label="devclaw" />
        <cmn-app-mark app="bk" label="Basket" />
      </div>
    `,
  }),
};

export const SmallSizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-end gap-cmn-4">
        <cmn-app-mark app="bk" [size]="16" />
        <cmn-app-mark app="bk" [size]="24" />
        <cmn-app-mark app="bk" [size]="32" />
        <cmn-app-mark app="bk" [size]="56" />
      </div>
    `,
  }),
};

/** The mark takes the seed from the page: here a coral scope stands in for a user's own colour. */
export const FollowsTheSeed: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-app-mark app="bk" label="Basket, app colour" />
        <div
          class="flex items-center gap-cmn-4"
          style="--color-accent-default: #c2410c; --color-text-inverse: #ffffff"
        >
          <cmn-app-mark app="bk" label="Basket, chosen colour" />
        </div>
      </div>
    `,
  }),
};

/** The app’s own mark, set once for the whole app, is what a bare `<cmn-app-mark />` draws. */
export const FromProvider: Story = {
  decorators: [applicationConfig({providers: [provideAppMark('bk', {followSeed: false})]})],
  render: () => ({template: '<cmn-app-mark label="Basket" />'}),
};
