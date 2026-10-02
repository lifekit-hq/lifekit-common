import type {Meta, StoryObj} from '@storybook/angular';

import {TopBarComponent} from './top-bar.component';

const meta: Meta<TopBarComponent> = {
  title: 'Components/TopBar',
  component: TopBarComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<TopBarComponent>;

export const Default: Story = {
  args: {title: 'Dashboard', isDark: false, avatarLabel: 'Denys'},
};

export const DarkMode: Story = {
  args: {title: 'Dashboard', isDark: true, avatarLabel: 'Denys'},
};

/** `overlay`: below md the bar turns translucent and blurred and pads by the top safe-area inset. */
export const Overlay: Story = {
  args: {title: 'Dashboard', isDark: false, avatarLabel: 'Denys', overlay: true},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};
