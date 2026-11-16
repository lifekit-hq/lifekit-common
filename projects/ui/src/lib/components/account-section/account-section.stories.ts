import type {Meta, StoryObj} from '@storybook/angular';

import {AccountSectionComponent} from './account-section.component';

const meta: Meta<AccountSectionComponent> = {
  title: 'Components/AccountSection',
  component: AccountSectionComponent,
  tags: ['autodocs'],
  parameters: {layout: 'padded'},
  args: {caption: 'Signed in through the Lifekit gate'},
};

export default meta;
type Story = StoryObj<AccountSectionComponent>;

/** The signed-in person's name and email, read-only. */
export const Default: Story = {
  args: {account: {name: 'Ada Lovelace', email: 'ada@example.com'}},
};

/** An IdP that sends no name, or one equal to the email: the Name row is left out. */
export const EmailOnly: Story = {
  args: {account: {name: 'ada@example.com', email: 'ada@example.com'}},
};

/** No account yet. */
export const NotSignedIn: Story = {args: {account: undefined}};
