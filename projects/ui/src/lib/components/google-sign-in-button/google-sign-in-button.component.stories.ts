import {componentWrapperDecorator, type Meta, type StoryObj} from '@storybook/angular';

import {GoogleSignInButtonComponent} from './google-sign-in-button.component';

const darkSurface = componentWrapperDecorator(
  story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`
);

const meta: Meta<GoogleSignInButtonComponent> = {
  title: 'Components/GoogleSignInButton',
  component: GoogleSignInButtonComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Renders the Google Identity Services (GSI) sign-in button. Requires a valid `clientId` from Google Cloud Console. In Storybook the button renders but the GSI popup will not complete without a real OAuth origin.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<GoogleSignInButtonComponent>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: '<cmn-google-sign-in-button [clientId]="clientId" />',
  }),
  args: {
    clientId: 'your-google-client-id.apps.googleusercontent.com',
  },
};

export const CustomWidth: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-google-sign-in-button [clientId]="clientId" [buttonConfiguration]="buttonConfiguration" />',
  }),
  args: {
    clientId: 'your-google-client-id.apps.googleusercontent.com',
    buttonConfiguration: {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      text: 'signin_with',
      size: 'large',
      width: 240,
    },
  },
};

/** The `locale` input pins the button language instead of following the browser. */
export const Locale: Story = {
  render: args => ({
    props: args,
    template: '<cmn-google-sign-in-button [clientId]="clientId" [locale]="locale" />',
  }),
  args: {
    clientId: 'your-google-client-id.apps.googleusercontent.com',
    locale: 'uk',
  },
};

export const LocaleDark: Story = {
  decorators: [darkSurface],
  ...Locale,
  globals: {theme: 'dark'},
};
