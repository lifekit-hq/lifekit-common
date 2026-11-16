import type {Meta, StoryObj} from '@storybook/angular';
import {applicationConfig, moduleMetadata} from '@storybook/angular';

import {provideAppMark} from '../../providers/provide-app-mark';
import {AlertComponent} from '../alert/alert.component';
import {ButtonComponent} from '../button/button.component';
import {AuthPageComponent} from './auth-page.component';

const meta: Meta<AuthPageComponent> = {
  title: 'Components/AuthPage',
  component: AuthPageComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The frame of a signed-out page: the app’s mark, a title, a lead, the content and the ' +
          'legal links, in one centred card and the page’s `main` landmark. The sign-in itself ' +
          '(passkey, redirect) stays in the app.',
      },
    },
  },
  decorators: [
    applicationConfig({providers: [provideAppMark('bk', {followSeed: false})]}),
    moduleMetadata({imports: [ButtonComponent, AlertComponent]}),
  ],
};

export default meta;
type Story = StoryObj<AuthPageComponent>;

export const SignIn: Story = {
  render: () => ({
    template: `
      <cmn-auth-page title="Sign in to Basket" lead="Use your passkey to continue.">
        <cmn-button class="block [&_button]:w-full" icon="KeyRound">Sign in with a passkey</cmn-button>
        <a footer href="#">Privacy</a>
        <a footer href="#">Terms</a>
      </cmn-auth-page>
    `,
  }),
};

export const WithAlert: Story = {
  render: () => ({
    template: `
      <cmn-auth-page title="Sign in to Basket" lead="Use your passkey to continue.">
        <cmn-alert variant="error" title="Sign-in failed">The passkey was not accepted. Try again.</cmn-alert>
        <cmn-button class="block [&_button]:w-full">Try again</cmn-button>
      </cmn-auth-page>
    `,
  }),
};

export const TitleOnly: Story = {
  render: () => ({
    template: `
      <cmn-auth-page title="Welcome back">
        <cmn-button class="block [&_button]:w-full">Continue</cmn-button>
      </cmn-auth-page>
    `,
  }),
};
