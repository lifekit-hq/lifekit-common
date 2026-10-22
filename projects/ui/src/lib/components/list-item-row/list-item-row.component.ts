import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

@Component({
  selector: 'cmn-list-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {style: 'display: block'},
  template: `
    <!-- The content is written once and stamped into whichever row element the mode needs, so
         both modes share one layout. -->
    <ng-template #content>
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
    </ng-template>
    @if (action()) {
      <button [class]="rowClasses()" (click)="activated.emit()" type="button">
        <ng-container [ngTemplateOutlet]="content" />
      </button>
    } @else {
      <div [class]="rowClasses()">
        <ng-container [ngTemplateOutlet]="content" />
      </div>
    }
  `,
})
export class ListItemRowComponent {
  public readonly label = input.required<string>();
  public readonly sublabel = input<string | null>(null);
  public readonly dimmed = input<boolean>(false);
  /**
   * Makes the whole row one native button (for a row that opens a dialog or a detail view).
   * A button cannot hold other controls, so an action row takes no interactive `[actions]`.
   */
  public readonly action = input<boolean>(false);

  /** Emits when an action row is pressed (click, Enter or Space). */
  public readonly activated = output<void>();

  // Dimmed recolours the text rather than fading the row: opacity would drag text and tags under
  // 4.5:1. The label steps down to the sublabel's grade, which stays readable, and the leading
  // avatar/icon slot is desaturated, not faded, so initials in an avatar keep their contrast.
  protected readonly rowClasses = computed(() => {
    const base =
      'flex items-center gap-cmn-3 border-b border-border-default px-cmn-4 py-cmn-3 last:border-b-0 hover:bg-surface-bg transition-colors';
    const mode = this.action()
      ? `${base} w-full cursor-pointer text-left active:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus`
      : base;
    return this.dimmed() ? `${mode} [&>[avatar]]:grayscale` : mode;
  });

  protected readonly labelClasses = computed(
    () =>
      `font-label text-cmn-sm font-medium truncate ${this.dimmed() ? 'text-text-secondary' : 'text-text-primary'}`
  );
}
