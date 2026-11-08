import {afterNextRender, ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {WhatsNewComponent} from './whats-new.component';
import {provideWhatsNew, type WhatsNewStorage} from './whats-new.config';
import {WHATS_NEW_FIXTURE} from './whats-new.fixtures';
import {CmnWhatsNewService} from './whats-new.service';

/** A marker that is not shared with the next story, nor with the reader's real browser storage. */
function memoryStorage(initial: Record<string, string>): WhatsNewStorage {
  const items = {...initial};
  return {getItem: key => items[key] ?? null, setItem: (key, value) => void (items[key] = value)};
}

const SEEN_KEY = 'stories.whatsNew.lastSeen';

/**
 * Launches the sheet the way an app does: `CmnWhatsNewService.open()` from the account menu, the
 * More page, the palette or the version footer. A side panel from md up, a bottom sheet below it.
 */
@Component({
  selector: 'cmn-story-whats-new-launcher',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-start gap-cmn-3 p-cmn-6">
      <cmn-button [icon]="'Megaphone'" (clicked)="whatsNew.open()">
        {{ whatsNew.hasUnread() ? "What's new (unread)" : "What's new" }}
      </cmn-button>
      <p class="text-cmn-sm text-text-secondary">
        {{ whatsNew.versionLabel }}. Opening the sheet marks it seen.
      </p>
    </div>
  `,
})
class StoryWhatsNewLauncherComponent {
  /** Opens the sheet as soon as the story renders (visual stories). */
  public readonly autoOpen = input<boolean>(false);

  protected readonly whatsNew = inject(CmnWhatsNewService);

  constructor() {
    afterNextRender(() => {
      if (this.autoOpen()) {
        this.whatsNew.open();
      }
    });
  }
}

const meta: Meta<WhatsNewComponent> = {
  title: 'Components/WhatsNew',
  component: WhatsNewComponent,
  tags: ['autodocs'],
  args: {versions: WHATS_NEW_FIXTURE.versions, status: 'success'},
  render: args => ({
    props: args,
    template: `
      <div class="max-w-xl bg-surface-card p-cmn-4 md:p-cmn-6">
        <cmn-whats-new [versions]="versions" [status]="status" />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<WhatsNewComponent>;

/**
 * Four releases, newest first. 4.5.0 and 4.4.2 have lines written for them and keep their change
 * list folded; 4.4.0 has only changes, so its fold is open; 4.3.0 has nothing to show.
 */
export const Default: Story = {};

export const Dark: Story = {globals: {theme: 'dark'}};

/** One release, the first on a new app: no scrolling, no older versions. */
export const SingleRelease: Story = {args: {versions: WHATS_NEW_FIXTURE.versions.slice(0, 1)}};

/** A line that wraps, and a release with no date. */
export const LongLines: Story = {
  args: {
    versions: [
      {
        version: '4.5.0',
        date: null,
        notes: [
          {
            text: 'Tasks that repeat now keep their own reminder, so finishing this week’s bins does not clear next week’s, and moving one to another day moves only that one.',
            owner: false,
          },
          {text: 'Short line.', owner: false},
        ],
        changes: [],
      },
    ],
  },
};

/** The skeleton while the notes are fetched; it only shows for a load that takes over 200ms. */
export const Loading: Story = {args: {versions: [], status: 'loading'}};

/** The notes could not be fetched; Retry reports `retry` and the app asks again. */
export const Error: Story = {args: {versions: [], status: 'error'}};

/** No releases to list. */
export const Empty: Story = {args: {versions: []}};

/**
 * The sheet itself, opened by the service: a side panel from md up and a bottom sheet on a phone,
 * with the seen marker in memory so the story starts unread every time.
 */
export const Sheet: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideWhatsNew({
          version: '4.5.0',
          storage: memoryStorage({[SEEN_KEY]: '4.4.2'}),
          storageKey: SEEN_KEY,
          load: () => Promise.resolve(WHATS_NEW_FIXTURE),
        }),
      ],
    }),
  ],
  render: () => ({
    moduleMetadata: {imports: [StoryWhatsNewLauncherComponent]},
    template: '<cmn-story-whats-new-launcher />',
  }),
};

/** The sheet already open on a phone: a bottom sheet over the page. */
export const SheetPhone: Story = {
  ...Sheet,
  globals: {viewport: {value: 'mobile2', isRotated: false}},
  render: () => ({
    moduleMetadata: {imports: [StoryWhatsNewLauncherComponent]},
    template: '<cmn-story-whats-new-launcher [autoOpen]="true" />',
  }),
};

/** The sheet already open on a phone, dark. */
export const SheetPhoneDark: Story = {
  ...SheetPhone,
  globals: {viewport: {value: 'mobile2', isRotated: false}, theme: 'dark'},
};

/** The sheet's failure: the load rejects, the sheet says so, and Retry asks again. */
export const SheetOffline: Story = {
  ...Sheet,
  decorators: [
    applicationConfig({
      providers: [
        provideWhatsNew({
          version: '4.5.0',
          storage: memoryStorage({[SEEN_KEY]: '4.4.2'}),
          storageKey: SEEN_KEY,
          load: () => Promise.reject(new globalThis.Error('offline')),
        }),
      ],
    }),
  ],
  render: () => ({
    moduleMetadata: {imports: [StoryWhatsNewLauncherComponent]},
    template: '<cmn-story-whats-new-launcher [autoOpen]="true" />',
  }),
};
