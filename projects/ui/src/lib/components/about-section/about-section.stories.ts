import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {provideWhatsNew, type WhatsNewStorage} from '../whats-new/whats-new.config';
import {WHATS_NEW_FIXTURE} from '../whats-new/whats-new.fixtures';
import {AboutSectionComponent} from './about-section.component';

const KEY = 'story.about.lastSeen';

function device(seen: string): WhatsNewStorage {
  const items: Record<string, string> = {[KEY]: seen};
  return {getItem: key => items[key] ?? null, setItem: (key, value) => void (items[key] = value)};
}

const meta: Meta<AboutSectionComponent> = {
  title: 'Components/AboutSection',
  component: AboutSectionComponent,
  tags: ['autodocs'],
  parameters: {layout: 'padded'},
};

export default meta;
type Story = StoryObj<AboutSectionComponent>;

/** An app without What's new: just the Version row. */
export const VersionOnly: Story = {args: {version: '3.2.0'}};

/** With `provideWhatsNew`: the running version, and What's new beside it with its dot while unread. */
export const WithWhatsNew: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideWhatsNew({
          version: '4.5.0',
          storage: device('4.4.2'),
          storageKey: KEY,
          load: () => Promise.resolve(WHATS_NEW_FIXTURE),
        }),
      ],
    }),
  ],
};
