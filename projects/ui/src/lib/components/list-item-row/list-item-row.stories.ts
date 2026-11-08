import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {InstitutionAvatarComponent} from '../institution-avatar/institution-avatar.component';
import {ListItemRowComponent} from './list-item-row.component';

const meta: Meta<ListItemRowComponent> = {
  title: 'Components/ListItemRow',
  component: ListItemRowComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [InstitutionAvatarComponent]})],
  argTypes: {
    label: {control: 'text'},
    sublabel: {control: 'text'},
    dimmed: {control: 'boolean'},
    action: {control: 'boolean'},
    activated: {action: 'activated'},
    trailingAction: {action: 'trailingAction'},
    swipeLeadingAction: {action: 'swipeLeadingAction'},
    swipeTrailingAction: {action: 'swipeTrailingAction'},
  },
};

export default meta;
type Story = StoryObj<ListItemRowComponent>;

export const Default: Story = {
  args: {label: 'Netflix'},
};

export const WithSublabel: Story = {
  args: {label: 'Netflix', sublabel: 'Video streaming'},
};

export const Dimmed: Story = {
  args: {label: 'Spotify', sublabel: 'Music', dimmed: true},
};

// The whole row is one button that opens a dialog or detail view; the amount stays read-only text
// because a button cannot hold other controls.
export const Action: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Manual holding" sublabel="Edit value and notes" [action]="true" (activated)="activated($event)">
          <cmn-institution-avatar avatar name="Manual holding" size="lg" />
          <div amount class="min-w-[72px] text-right">
            <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$1,250.00</div>
          </div>
        </cmn-list-item-row>
        <cmn-list-item-row label="Chrome on Windows" sublabel="Signed in Oct 20" [action]="true" (activated)="activated($event)" />
      </div>
    `,
  }),
};

/**
 * The quiet trailing action: one borderless icon button at the row's end (here a row's menu),
 * instead of a bordered text button repeated on every row.
 */
export const TrailingAction: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Oat milk" sublabel="Added by Ann" trailingIcon="Ellipsis" (trailingAction)="trailingAction($event)" />
        <cmn-list-item-row label="Bananas" sublabel="Added by Bo" trailingIcon="Ellipsis" (trailingAction)="trailingAction($event)" />
        <cmn-list-item-row label="Sourdough loaf" sublabel="Added by Ann" trailingIcon="Ellipsis" (trailingAction)="trailingAction($event)" />
      </div>
    `,
  }),
};

/** An action row keeps its trailing action beside the row button, never inside it. */
export const ActionWithTrailingAction: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Chrome on Windows" sublabel="Signed in Oct 20" [action]="true" trailingIcon="Ellipsis" (activated)="activated($event)" (trailingAction)="trailingAction($event)" />
        <cmn-list-item-row label="Safari on iPhone" sublabel="Signed in Nov 2" [action]="true" trailingIcon="Ellipsis" (activated)="activated($event)" (trailingAction)="trailingAction($event)" />
      </div>
    `,
  }),
};

/**
 * Swipe actions (Apple HIG, Lists and tables): the leading edge holds the affirmative action
 * (tick, mark read), the trailing edge the destructive one (delete, dismiss). A swipe is a shortcut,
 * so each row keeps its visible control (the Ellipsis menu here) and the same actions are also
 * buttons a keyboard or screen reader reaches, which slide the row open when focused. On a
 * desktop browser turn on touch emulation to swipe; a mouse never does.
 */
export const SwipeActions: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Oat milk" sublabel="Added by Ann" trailingIcon="Ellipsis"
          [swipeLeading]="{label: 'Done', icon: 'Check', tone: 'positive'}"
          [swipeTrailing]="{label: 'Remove', icon: 'Trash2', tone: 'danger'}"
          (trailingAction)="trailingAction($event)"
          (swipeLeadingAction)="swipeLeadingAction($event)"
          (swipeTrailingAction)="swipeTrailingAction($event)" />
        <cmn-list-item-row label="Bananas" sublabel="Added by Bo" trailingIcon="Ellipsis"
          [swipeLeading]="{label: 'Done', icon: 'Check', tone: 'positive'}"
          [swipeTrailing]="{label: 'Remove', icon: 'Trash2', tone: 'danger'}"
          (trailingAction)="trailingAction($event)"
          (swipeLeadingAction)="swipeLeadingAction($event)"
          (swipeTrailingAction)="swipeTrailingAction($event)" />
        <cmn-list-item-row label="Sourdough loaf" sublabel="Added by Ann" trailingIcon="Ellipsis"
          [swipeLeading]="{label: 'Done', icon: 'Check', tone: 'positive'}"
          [swipeTrailing]="{label: 'Remove', icon: 'Trash2', tone: 'danger'}"
          (trailingAction)="trailingAction($event)"
          (swipeLeadingAction)="swipeLeadingAction($event)"
          (swipeTrailingAction)="swipeTrailingAction($event)" />
      </div>
    `,
  }),
};

/** One side only: a row with just a trailing action does not open toward the leading edge. */
export const SwipeTrailingOnly: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Price drop on Cedar ETF" sublabel="2 hours ago" [action]="true"
          [swipeTrailing]="{label: 'Dismiss', icon: 'X'}"
          (activated)="activated($event)"
          (swipeTrailingAction)="swipeTrailingAction($event)" />
        <cmn-list-item-row label="Statement ready" sublabel="Yesterday" [action]="true"
          [swipeTrailing]="{label: 'Dismiss', icon: 'X'}"
          (activated)="activated($event)"
          (swipeTrailingAction)="swipeTrailingAction($event)" />
      </div>
    `,
  }),
};

/**
 * The keyboard and screen-reader path: focus on a revealed action slides the row open to show it,
 * Escape or moving focus away puts it back. Here focus is placed on the trailing action.
 */
export const SwipeRevealedByFocus: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Oat milk" sublabel="Added by Ann" trailingIcon="Ellipsis"
          [swipeLeading]="{label: 'Done', icon: 'Check', tone: 'positive'}"
          [swipeTrailing]="{label: 'Remove', icon: 'Trash2', tone: 'danger'}"
          (swipeLeadingAction)="swipeLeadingAction($event)"
          (swipeTrailingAction)="swipeTrailingAction($event)" />
      </div>
    `,
  }),
  play: ({canvasElement}) => {
    canvasElement.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')?.focus();
  },
};

export const WithAvatar: Story = {
  render: () => ({
    template: `
      <cmn-list-item-row label="Netflix" sublabel="Video streaming">
        <cmn-institution-avatar avatar name="Netflix" size="lg" />
      </cmn-list-item-row>
    `,
  }),
};

export const WithAllSlots: Story = {
  render: () => ({
    template: `
      <cmn-list-item-row label="Netflix" sublabel="Video streaming">
        <cmn-institution-avatar avatar name="Netflix" size="lg" />
        <div meta class="min-w-[100px] text-center">
          <div class="text-cmn-xs text-text-secondary">Feb 1, 2026</div>
          <div class="text-cmn-xs text-text-secondary">in 14d</div>
        </div>
        <div amount class="min-w-[72px] text-right">
          <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$15.99</div>
          <div class="text-cmn-xs text-text-secondary">/ mo</div>
        </div>
        <div actions class="flex shrink-0 gap-cmn-1">
          <button class="px-cmn-2 py-1 text-cmn-xs rounded-cmn-sm border border-border-default text-text-secondary hover:text-text-primary">Dismiss</button>
        </div>
      </cmn-list-item-row>
    `,
  }),
};

export const DimmedWithActions: Story = {
  render: () => ({
    template: `
      <cmn-list-item-row label="Spotify" sublabel="Music" [dimmed]="true">
        <cmn-institution-avatar avatar name="Spotify" size="lg" />
        <div amount class="min-w-[72px] text-right">
          <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$9.99</div>
          <div class="text-cmn-xs text-text-secondary">/ mo</div>
        </div>
        <div actions class="flex shrink-0 gap-cmn-1">
          <button class="px-cmn-2 py-1 text-cmn-xs rounded-cmn-sm border border-border-default text-text-secondary hover:text-text-primary">Restore</button>
        </div>
      </cmn-list-item-row>
    `,
  }),
};

export const MultipleRowsInCard: Story = {
  render: () => ({
    template: `
      <div class="border border-border-default rounded-cmn-md overflow-hidden">
        <cmn-list-item-row label="Netflix" sublabel="Video streaming">
          <cmn-institution-avatar avatar name="Netflix" size="lg" />
          <div meta class="min-w-[100px] text-center">
            <div class="text-cmn-xs text-status-warning font-semibold">Jan 25, 2026</div>
            <div class="text-cmn-xs text-status-warning">in 4d</div>
          </div>
          <div amount class="min-w-[72px] text-right">
            <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$15.99</div>
            <div class="text-cmn-xs text-text-secondary">/ mo</div>
          </div>
          <div actions class="flex shrink-0 gap-cmn-1">
            <button class="px-cmn-2 py-1 text-cmn-xs rounded-cmn-sm border border-border-default text-text-secondary">Dismiss</button>
          </div>
        </cmn-list-item-row>
        <cmn-list-item-row label="Spotify" sublabel="Music">
          <cmn-institution-avatar avatar name="Spotify" size="lg" />
          <div meta class="min-w-[100px] text-center">
            <div class="text-cmn-xs text-text-secondary">Feb 5, 2026</div>
            <div class="text-cmn-xs text-text-secondary">in 15d</div>
          </div>
          <div amount class="min-w-[72px] text-right">
            <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$9.99</div>
            <div class="text-cmn-xs text-text-secondary">/ mo</div>
          </div>
          <div actions class="flex shrink-0 gap-cmn-1">
            <button class="px-cmn-2 py-1 text-cmn-xs rounded-cmn-sm border border-border-default text-text-secondary">Dismiss</button>
          </div>
        </cmn-list-item-row>
        <cmn-list-item-row label="Adobe CC" sublabel="Creative suite" [dimmed]="true">
          <cmn-institution-avatar avatar name="Adobe CC" size="lg" />
          <div amount class="min-w-[72px] text-right">
            <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$54.99</div>
            <div class="text-cmn-xs text-text-secondary">/ mo</div>
          </div>
          <div actions class="flex shrink-0 gap-cmn-1">
            <button class="px-cmn-2 py-1 text-cmn-xs rounded-cmn-sm border border-border-default text-text-secondary">Restore</button>
          </div>
        </cmn-list-item-row>
      </div>
    `,
  }),
};
