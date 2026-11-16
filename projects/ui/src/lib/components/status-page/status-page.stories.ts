import type {Meta, StoryObj} from '@storybook/angular';
import {applicationConfig, moduleMetadata} from '@storybook/angular';

import {provideAppMark} from '../../providers/provide-app-mark';
import {AlertComponent} from '../alert/alert.component';
import {StatusPageComponent} from './status-page.component';

const meta: Meta<StatusPageComponent> = {
  title: 'Components/StatusPage',
  component: StatusPageComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A full-page status on the sign-in frame. `preset` picks the words and both ' +
          'actions (`signed-out`, `no-access`, `unreachable`, `not-found`); the inputs replace ' +
          'them and the page decides what each action does.',
      },
    },
  },
  decorators: [
    applicationConfig({providers: [provideAppMark('bk', {followSeed: false})]}),
    moduleMetadata({imports: [AlertComponent]}),
  ],
};

export default meta;
type Story = StoryObj<StatusPageComponent>;

export const SignedOut: Story = {args: {preset: 'signed-out'}};

export const NoAccess: Story = {args: {preset: 'no-access'}};

export const Unreachable: Story = {args: {preset: 'unreachable'}};

export const NotFound: Story = {args: {preset: 'not-found'}};

export const CustomWords: Story = {
  args: {
    preset: 'no-access',
    title: 'Not on the guest list',
    lead: 'denys@example.com is not allowed to use Basket.',
    primaryLabel: 'Use another account',
    secondaryLabel: 'Ask for access',
  },
};

export const WithAlert: Story = {
  args: {preset: 'unreachable'},
  render: args => ({
    props: args,
    template: `
      <cmn-status-page [preset]="preset">
        <cmn-alert variant="error" title="Gateway timeout">The API did not answer in 10 seconds.</cmn-alert>
      </cmn-status-page>
    `,
  }),
};
