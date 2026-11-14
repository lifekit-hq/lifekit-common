import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

import {type Nullable} from '../../types';
import {ButtonComponent} from '../button/button.component';

let sectionCounter = 0;

/**
 * The section's divider and the space around it. Outside a `cmn-page` column the
 * section sets both. In a `cmn-page` column the template's section gap already sits between
 * blocks, so the section drops its margin and keeps the same gap above its divider: the divider
 * sits a section gap from the content on either side.
 */
const HOST_CLASSES =
  'block border-b border-border-default pb-cmn-8 mb-cmn-8 last:mb-0 last:border-b-0 last:pb-0 ' +
  '[[data-cmn-page-column]>&]:mb-0 ' +
  '[[data-cmn-page-column]>&:not(:last-child)]:pb-cmn-section-gap';

/**
 * One titled block of a Settings page. The heading, description and caption sit in a left column
 * from md up and stack above the content on phones. The section owns its divider, so a page is
 * just sections stacked in a `cmn-page kind="settings"`.
 *
 * Save model: toggles and selects inside a section apply immediately and need nothing here. A
 * section holding a text form sets `saveLabel`, which adds the standard per-section Save button;
 * the app handles `save` and owns the dirty/saving state.
 */
@Component({
  selector: 'cmn-settings-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  host: {class: HOST_CLASSES},
  template: `
    <section
      [attr.aria-labelledby]="headingId"
      class="grid grid-cols-1 gap-cmn-4 md:grid-cols-[280px_1fr] md:gap-cmn-10"
    >
      <div class="min-w-0">
        <h2 [id]="headingId" class="font-label text-cmn-sm font-semibold text-text-primary">
          {{ heading() }}
        </h2>
        @if (description()) {
          <p class="mt-cmn-1 text-cmn-xs leading-relaxed text-text-secondary">
            {{ description() }}
          </p>
        }
        @if (caption()) {
          <p class="mt-cmn-2 text-cmn-xs font-medium text-text-secondary">{{ caption() }}</p>
        }
      </div>
      <div class="min-w-0 space-y-cmn-5">
        <ng-content />
        @if (saveLabel()) {
          <div class="flex justify-end">
            <cmn-button [disabled]="saveDisabled()" [loading]="saving()" (clicked)="save.emit()">{{
              saveLabel()
            }}</cmn-button>
          </div>
        }
      </div>
    </section>
  `,
})
export class SettingsSectionComponent {
  public readonly heading = input.required<string>();
  public readonly description = input<string>('');
  /** Where the values live, e.g. "On this device" or "Synced to your account". */
  public readonly caption = input<string>('');
  /** Adds the per-section Save button when set; leave unset for immediate-apply sections. */
  public readonly saveLabel = input<Nullable<string>>(null);
  public readonly saveDisabled = input<boolean>(false);
  public readonly saving = input<boolean>(false);

  public readonly save = output<void>();

  protected readonly headingId = `cmn-settings-section-${sectionCounter++}`;
}
