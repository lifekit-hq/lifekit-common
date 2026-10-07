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

/** Two-letter initials from the consumer (e.g. `authStore.avatarInitials`) fit the avatar circle. */
export const TwoLetterInitials: Story = {
  args: {title: 'Dashboard', isDark: false, avatarLabel: 'DT'},
};

export const TwoLetterInitialsDark: Story = {
  args: {title: 'Dashboard', isDark: true, avatarLabel: 'DT'},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/** Page chrome: a back chevron (no text) and trailing page actions, sized for touch below md. */
export const BackAndActions: Story = {
  args: {
    title: 'Checking',
    avatarLabel: 'DT',
    showBack: true,
    actions: [
      {id: 'edit', label: 'Edit', icon: 'Pencil'},
      {id: 'share', label: 'Share', icon: 'Share'},
    ],
  },
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/** `largeTitle: 'visible'`: the page's large title is in view, so the bar's copy stays hidden. */
export const LargeTitleVisible: Story = {
  args: {title: 'Accounts', avatarLabel: 'DT', largeTitle: 'visible'},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/** `largeTitle: 'collapsed'`: the large title scrolled under the bar, which now shows the title. */
export const LargeTitleCollapsed: Story = {
  args: {title: 'Accounts', avatarLabel: 'DT', largeTitle: 'collapsed', showBack: true},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};
