import type {Meta, StoryObj} from '@storybook/angular';

import {SessionSectionComponent} from './session-section.component';

const meta: Meta<SessionSectionComponent> = {
  title: 'Components/SessionSection',
  component: SessionSectionComponent,
  tags: ['autodocs'],
  parameters: {layout: 'padded'},
  args: {appName: 'Lifekit'},
};

export default meta;
type Story = StoryObj<SessionSectionComponent>;

/** "Sign out of {app}" with a secondary Sign out button; the app handles `signOut`. */
export const Default: Story = {};

/** Without an app name the row reads "Sign out". */
export const Unnamed: Story = {args: {appName: ''}};
