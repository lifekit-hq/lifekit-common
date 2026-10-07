import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {ButtonComponent} from '../button/button.component';
import {CMN_DRAWER_DATA, type CmnDrawerMode} from './drawer-config';
import {CmnDrawerRef} from './drawer-ref';

interface TransactionData {
  description: string;
  amount: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-drawer-content',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-col gap-cmn-4 p-cmn-6">
      <dl class="flex flex-col gap-cmn-3">
        <div>
          <dt class="text-cmn-xs text-text-secondary">Description</dt>
          <dd class="text-cmn-md text-text-primary">{{ data?.description ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-cmn-xs text-text-secondary">Amount</dt>
          <dd class="text-cmn-md text-text-primary">{{ data?.amount ?? '—' }}</dd>
        </div>
      </dl>
      <cmn-button (clicked)="ref.close('saved')" variant="secondary">Close from inside</cmn-button>
    </div>
  `,
})
class StoryDrawerContentComponent {
  protected readonly ref = inject(CmnDrawerRef);
  protected readonly data = inject<TransactionData | null>(CMN_DRAWER_DATA);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-long-drawer-content',
  template: `
    <div class="flex flex-col gap-cmn-3 p-cmn-6">
      @for (i of rows; track i) {
        <p class="text-cmn-sm text-text-secondary">
          Row {{ i }} — the body scrolls, the header does not.
        </p>
      }
    </div>
  `,
})
class StoryLongDrawerContentComponent {
  protected readonly rows = Array.from({length: 40}, (_, i) => i + 1);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-drawer-launcher',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-wrap gap-cmn-3">
      <cmn-button (clicked)="open()">Open drawer</cmn-button>
      <cmn-button (clicked)="openUntitled()" variant="secondary">No title</cmn-button>
      <cmn-button (clicked)="openWide()" variant="secondary">Wide</cmn-button>
      <cmn-button (clicked)="openScrolling()" variant="secondary">Scrolling body</cmn-button>
      <cmn-button (clicked)="openLocked()" variant="secondary">disableClose</cmn-button>
      <cmn-button (clicked)="openIn('sheet')" variant="secondary">Bottom sheet</cmn-button>
      <cmn-button (clicked)="openIn('side')" variant="secondary">Side panel (pinned)</cmn-button>
    </div>
    <p class="mt-cmn-4 text-cmn-sm text-text-secondary">Last result: {{ result() }}</p>
  `,
})
class StoryDrawerLauncherComponent {
  private readonly drawer = inject(CmnDrawerService);

  /** Opens a drawer in this mode as soon as the story renders (visual stories). */
  public readonly autoOpen = input<CmnDrawerMode | null>(null);
  /** The auto-opened drawer holds a long scrolling body instead of a short one. */
  public readonly autoLong = input<boolean>(false);

  protected readonly result = signal('—');

  constructor() {
    afterNextRender(() => {
      const mode = this.autoOpen();
      if (mode) {
        this.openIn(mode);
      }
    });
  }

  protected open(): void {
    this.drawer
      .open<string, TransactionData>(StoryDrawerContentComponent, {
        title: 'Transaction detail',
        data: {description: 'Whole Foods', amount: '-$87.43'},
      })
      .afterClosed()
      .subscribe(r => this.result.set(String(r)));
  }

  protected openUntitled(): void {
    this.drawer.open(StoryDrawerContentComponent);
  }

  protected openWide(): void {
    this.drawer.open(StoryDrawerContentComponent, {title: 'Wide drawer', width: '720px'});
  }

  protected openScrolling(): void {
    this.drawer.open(StoryLongDrawerContentComponent, {title: 'Long body'});
  }

  protected openIn(mode: CmnDrawerMode): void {
    this.drawer
      .open<string, TransactionData>(
        this.autoLong() ? StoryLongDrawerContentComponent : StoryDrawerContentComponent,
        {
          title: 'Transaction detail',
          data: {description: 'Whole Foods', amount: '-$87.43'},
          mode,
        }
      )
      .afterClosed()
      .subscribe(r => this.result.set(String(r)));
  }

  protected openLocked(): void {
    this.drawer.open(StoryDrawerContentComponent, {
      title: 'Backdrop and Escape are disabled',
      disableClose: true,
    });
  }
}

const meta: Meta<StoryDrawerLauncherComponent> = {
  title: 'Components/Drawer',
  component: StoryDrawerLauncherComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [StoryDrawerContentComponent, StoryLongDrawerContentComponent],
    }),
  ],
};

export default meta;
type Story = StoryObj<StoryDrawerLauncherComponent>;

/**
 * Every drawer state: titled, untitled, a wider panel, a body long enough to
 * scroll under a fixed header, and one that ignores backdrop clicks and Escape.
 */
export const Playground: Story = {};

/**
 * The phone presentation: a bottom sheet with a grabber, safe-area bottom padding and two
 * stops. It opens at the half stop (content-sized, never past half the viewport); tap the
 * grabber to go to the full stop (90dvh) and again to come back. Drag the grabber or header
 * down to dismiss. The default `responsive` mode uses it below `md`; `mode: 'sheet'` pins it.
 */
export const BottomSheet: Story = {
  args: {autoOpen: 'sheet'},
};

/** The bottom sheet in the dark theme. */
export const BottomSheetDark: Story = {
  args: {autoOpen: 'sheet'},
  globals: {theme: 'dark'},
};

/** The default `responsive` mode at phone width opens as a bottom sheet. */
export const ResponsivePhone: Story = {
  args: {autoOpen: 'responsive'},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/** The side panel from `md` up, unchanged, in the dark theme. */
export const SidePanelDark: Story = {
  args: {autoOpen: 'side'},
  globals: {theme: 'dark'},
};

/** A long body at the half stop: the sheet stops at half the viewport and the body scrolls. */
export const BottomSheetHalfScrolling: Story = {
  args: {autoOpen: 'sheet', autoLong: true},
};

/** Taps the grabber once the sheet has opened: the full stop, 90dvh. */
export const BottomSheetFull: Story = {
  args: {autoOpen: 'sheet', autoLong: true},
  play: async () => {
    const frames = 60;
    for (let frame = 0; frame < frames; frame++) {
      const grabber = document.querySelector<HTMLButtonElement>('.cmn-drawer-grabber');
      if (grabber) {
        grabber.click();
        return;
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  },
};

export const BottomSheetFullDark: Story = {
  ...BottomSheetFull,
  globals: {theme: 'dark'},
};
