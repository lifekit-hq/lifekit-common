import {ChangeDetectionStrategy, Component, input} from '@angular/core';

let rowCounter = 0;

/**
 * A label and optional description on the left, the control on the right. Project a
 * `cmn-toggle` or `cmn-select` (or a button) as the content. The row is a labelled group, so a
 * control that renders no visible label of its own is still named and described for assistive
 * technology.
 */
@Component({
  selector: 'cmn-setting-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {style: 'display: block'},
  template: `
    <div
      [attr.aria-labelledby]="labelId"
      [attr.aria-describedby]="description() ? descriptionId : null"
      class="flex items-center justify-between gap-cmn-4"
      role="group"
    >
      <div class="min-w-0">
        <div [id]="labelId" class="font-label text-cmn-sm font-medium text-text-primary">
          {{ label() }}
        </div>
        @if (description()) {
          <div
            [id]="descriptionId"
            class="mt-cmn-1 text-cmn-xs leading-relaxed text-text-secondary"
          >
            {{ description() }}
          </div>
        }
      </div>
      <div class="shrink-0">
        <ng-content />
      </div>
    </div>
  `,
})
export class SettingRowComponent {
  private readonly id = rowCounter++;

  public readonly label = input.required<string>();
  public readonly description = input<string>('');
  protected readonly labelId = `cmn-setting-row-${this.id}-label`;
  protected readonly descriptionId = `cmn-setting-row-${this.id}-description`;
}
