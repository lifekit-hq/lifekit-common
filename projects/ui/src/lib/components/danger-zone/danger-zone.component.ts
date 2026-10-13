import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {ButtonComponent} from '../button/button.component';

let zoneCounter = 0;

/**
 * The destructive section of a Settings page: a tinted block describing one irreversible action
 * and the button that starts it. The button never acts directly. It opens the confirm dialog
 * and `confirmed` fires only when the user confirms, so every app gets the same second step.
 */
@Component({
  selector: 'cmn-danger-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  host: {style: 'display: block'},
  template: `
    <section
      [attr.aria-labelledby]="headingId"
      class="flex flex-col gap-cmn-4 rounded-cmn-lg border border-status-error/30 bg-status-error/[0.04] p-cmn-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <h2 [id]="headingId" class="font-label text-cmn-sm font-semibold text-status-error">
          {{ heading() }}
        </h2>
        <p class="mt-cmn-1 text-cmn-xs leading-relaxed text-text-secondary">
          {{ description() }}
        </p>
      </div>
      <cmn-button
        [disabled]="disabled()"
        [loading]="busy()"
        (clicked)="requestConfirm()"
        class="shrink-0 self-start sm:self-auto"
        size="sm"
        variant="destructive"
      >
        {{ actionLabel() }}
      </cmn-button>
    </section>
  `,
})
export class DangerZoneComponent {
  private readonly dialog = inject(CmnDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogTitle = computed(() => this.confirmTitle() || `${this.actionLabel()}?`);
  private readonly dialogMessage = computed(() => this.confirmMessage() || this.description());

  public readonly heading = input<string>('Danger zone');
  public readonly description = input.required<string>();
  /** The destructive button's label, e.g. "Delete account". Also the dialog's confirm label. */
  public readonly actionLabel = input.required<string>();
  /** Dialog title; defaults to the action label as a question. */
  public readonly confirmTitle = input<string>('');
  /** Dialog message; defaults to the description. */
  public readonly confirmMessage = input<string>('');
  public readonly disabled = input<boolean>(false);
  /** The confirmed action is in flight. */
  public readonly busy = input<boolean>(false);

  /** Fires once the user has confirmed in the dialog. */
  public readonly confirmed = output<void>();

  protected readonly headingId = `cmn-danger-zone-${zoneCounter++}`;

  protected requestConfirm(): void {
    this.dialog
      .confirm({
        title: this.dialogTitle(),
        message: this.dialogMessage(),
        confirmLabel: this.actionLabel(),
        confirmVariant: 'destructive',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.confirmed.emit();
        }
      });
  }
}
