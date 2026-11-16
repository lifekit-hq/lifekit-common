import {Clipboard} from '@angular/cdk/clipboard';
import type {Meta, StoryObj} from '@storybook/angular';
import {applicationConfig} from '@storybook/angular';

import {CmnClipboardService} from '../../services/clipboard/clipboard.service';
import {CopyButtonComponent} from './copy-button.component';

interface CopyButtonStoryArgs {
  text: string;
  label: string;
}

const meta: Meta<CopyButtonStoryArgs> = {
  title: 'Components/Copy button',
  component: CopyButtonComponent,
  tags: ['autodocs'],
  args: {text: 'https://example.test/invite/4f9c1a', label: 'Copy invite link'},
};

export default meta;
type Story = StoryObj<CopyButtonStoryArgs>;

/** Idle: the icon alone. Press it to see "Copied" for two seconds. */
export const Idle: Story = {};

/** The copy worked: a check and "Copied", on the button, not in a toast. */
export const Copied: Story = {
  play: ({canvasElement}) => {
    canvasElement.querySelector('button')?.click();
  },
};

/** Neither clipboard path works: "Copy failed" on the button. The real service also toasts the hand-copy hint; this story stubs it out. */
export const Failed: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {provide: CmnClipboardService, useValue: {copy: () => Promise.resolve(false)}},
        {provide: Clipboard, useValue: {copy: () => false}},
      ],
    }),
  ],
  play: ({canvasElement}) => {
    canvasElement.querySelector('button')?.click();
  },
};
