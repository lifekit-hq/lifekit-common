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
          <button class="px-cmn-2 py-1 text-cmn-xs rounded border border-border-default text-text-secondary hover:text-text-primary">Dismiss</button>
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
          <button class="px-cmn-2 py-1 text-cmn-xs rounded border border-border-default text-text-secondary hover:text-text-primary">Restore</button>
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
            <button class="px-cmn-2 py-1 text-cmn-xs rounded border border-border-default text-text-secondary">Dismiss</button>
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
            <button class="px-cmn-2 py-1 text-cmn-xs rounded border border-border-default text-text-secondary">Dismiss</button>
          </div>
        </cmn-list-item-row>
        <cmn-list-item-row label="Adobe CC" sublabel="Creative suite" [dimmed]="true">
          <cmn-institution-avatar avatar name="Adobe CC" size="lg" />
          <div amount class="min-w-[72px] text-right">
            <div class="text-cmn-sm font-semibold tabular-nums text-text-primary">$54.99</div>
            <div class="text-cmn-xs text-text-secondary">/ mo</div>
          </div>
          <div actions class="flex shrink-0 gap-cmn-1">
            <button class="px-cmn-2 py-1 text-cmn-xs rounded border border-border-default text-text-secondary">Restore</button>
          </div>
        </cmn-list-item-row>
      </div>
    `,
  }),
};
