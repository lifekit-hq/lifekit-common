import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {DangerZoneComponent} from './danger-zone.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-danger-zone-launcher',
  imports: [DangerZoneComponent],
  template: `
    <div class="max-w-[900px] space-y-cmn-4">
      <cmn-danger-zone
        [busy]="deleting()"
        (confirmed)="remove()"
        description="Permanently delete your account and all associated data. This cannot be undone."
        actionLabel="Delete account"
        confirmMessage="Your account and every record in it will be deleted for good."
      />
      <p class="text-cmn-sm text-text-secondary" aria-live="polite">{{ status() }}</p>
    </div>
  `,
})
class StoryDangerZoneLauncherComponent {
  protected readonly deleting = signal(false);
  protected readonly status = signal('Nothing deleted yet.');

  protected remove(): void {
    this.deleting.set(true);
    this.status.set('Confirmed. Deleting…');
    setTimeout(() => {
      this.deleting.set(false);
      this.status.set('Account deleted (story only: nothing was removed).');
    }, 1200);
  }
}

const meta: Meta<DangerZoneComponent> = {
  title: 'Components/DangerZone',
  component: DangerZoneComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [StoryDangerZoneLauncherComponent]})],
  argTypes: {
    heading: {control: 'text'},
    description: {control: 'text'},
    actionLabel: {control: 'text'},
    confirmTitle: {control: 'text'},
    confirmMessage: {control: 'text'},
    disabled: {control: 'boolean'},
    busy: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<DangerZoneComponent>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="max-w-[900px]">
        <cmn-danger-zone
          [heading]="heading"
          [description]="description"
          [actionLabel]="actionLabel"
          [disabled]="disabled"
          [busy]="busy"
        />
      </div>
    `,
  }),
  args: {
    heading: 'Danger zone',
    description: 'Permanently delete your account and all associated data. This cannot be undone.',
    actionLabel: 'Delete account',
    disabled: false,
    busy: false,
  },
};

export const Busy: Story = {
  ...Default,
  args: {...Default.args, busy: true},
};

export const Disabled: Story = {
  ...Default,
  args: {...Default.args, disabled: true},
};

/** One launcher story for the confirm step: click the button, then confirm or cancel. */
export const ConfirmLauncher: Story = {
  render: () => ({template: '<cmn-story-danger-zone-launcher />'}),
};
