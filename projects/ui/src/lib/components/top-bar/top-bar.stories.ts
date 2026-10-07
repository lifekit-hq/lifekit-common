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

/** `overlay`: the bar turns translucent and blurred and pads by the top safe-area inset; the app layout sets it in the phone shell. */
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

/**
 * Page chrome: a back chevron (no text) and trailing page actions, sized for touch below md.
 * Fullscreen, so a 320px phone gives the bar its full width: the title truncates, never collapses.
 */
export const BackAndActions: Story = {
  parameters: {layout: 'fullscreen'},
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

/**
 * Back, three page actions, search and avatar: from 360px all three actions sit inline. Below
 * 360px only the first stays and the rest move into the "More actions" menu, so the title keeps
 * the same room as with two actions. Narrow the canvas under 360px to see it.
 */
export const ManyActions: Story = {
  parameters: {layout: 'fullscreen'},
  args: {
    title: 'Checking account',
    avatarLabel: 'DT',
    showBack: true,
    actions: [
      {id: 'edit', label: 'Edit', icon: 'Pencil'},
      {id: 'share', label: 'Share', icon: 'Share'},
      {id: 'archive', label: 'Archive', icon: 'Archive', disabled: true},
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
