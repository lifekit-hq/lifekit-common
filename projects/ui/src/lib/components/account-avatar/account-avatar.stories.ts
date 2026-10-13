import type {Meta, StoryObj} from '@storybook/angular';

import {AccountAvatarComponent, type AccountAvatarSize} from './account-avatar.component';

interface AccountAvatarStoryArgs {
  label: string;
  pictureUrl: string | undefined;
  size: AccountAvatarSize;
}

/** A placeholder portrait as a data URI, so the picture state needs no network. */
const PICTURE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
      '<rect width="40" height="40" fill="#7c6cf0"/>' +
      '<circle cx="20" cy="16" r="7" fill="#fff"/>' +
      '<path d="M6 40c2-10 8-14 14-14s12 4 14 14z" fill="#fff"/></svg>'
  );

const meta: Meta<AccountAvatarStoryArgs> = {
  title: 'Components/AccountAvatar',
  component: AccountAvatarComponent,
  tags: ['autodocs'],
  argTypes: {
    size: {control: 'select', options: ['sm', 'md'] satisfies AccountAvatarSize[]},
  },
  args: {label: 'Ada Lovelace', pictureUrl: undefined, size: 'md'},
};

export default meta;
type Story = StoryObj<AccountAvatarStoryArgs>;

/** Initials of the name, or of the email when there is no name. */
export const Initials: Story = {};

/** The profile picture replaces the initials. */
export const WithPicture: Story = {args: {pictureUrl: PICTURE}};

/** A picture that fails to load (blocked, expired) falls back to the initials. */
export const BrokenPicture: Story = {
  args: {pictureUrl: 'https://invalid.example/missing.png'},
};

/** `sm` is the top bar's 32px disc, `md` the menu header's and More page's 40px one. */
export const Sizes: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="flex items-center gap-cmn-4 p-cmn-4">
        <cmn-account-avatar [label]="label" size="sm" />
        <cmn-account-avatar [label]="label" size="md" />
        <cmn-account-avatar [label]="label" [pictureUrl]="pictureUrl" size="sm" />
        <cmn-account-avatar [label]="label" [pictureUrl]="pictureUrl" size="md" />
      </div>
    `,
  }),
  args: {pictureUrl: PICTURE},
};

export const Dark: Story = {
  args: {pictureUrl: PICTURE},
  globals: {theme: 'dark'},
};
