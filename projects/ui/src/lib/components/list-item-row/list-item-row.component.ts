import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

@Component({
  selector: 'cmn-list-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {style: 'display: block'},
  template: `
    <div [class]="rowClasses()">
      <ng-content select="[avatar]" />
      <div class="flex-1 min-w-0">
        <div [class]="labelClasses()">
          {{ label() }}
        </div>
        @if (sublabel()) {
          <div class="text-cmn-xs truncate text-text-secondary">
            {{ sublabel() }}
          </div>
        }
      </div>
      <ng-content select="[meta]" />
      <ng-content select="[amount]" />
      <ng-content select="[actions]" />
    </div>
  `,
})
export class ListItemRowComponent {
  public readonly label = input.required<string>();
  public readonly sublabel = input<string | null>(null);
  public readonly dimmed = input<boolean>(false);

  // Dimmed recolours the text rather than fading the row: opacity would drag text and tags under
  // 4.5:1. The label steps down to the sublabel's grade, which stays readable, and the leading
  // avatar/icon slot is desaturated, not faded, so initials in an avatar keep their contrast.
  protected readonly rowClasses = computed(() => {
    const base =
      'flex items-center gap-cmn-3 border-b border-border-default px-cmn-4 py-cmn-3 last:border-b-0 hover:bg-surface-bg transition-colors';
    return this.dimmed() ? `${base} [&>[avatar]]:grayscale` : base;
  });

  protected readonly labelClasses = computed(
    () =>
      `font-label text-cmn-sm font-medium truncate ${this.dimmed() ? 'text-text-secondary' : 'text-text-primary'}`
  );
}
