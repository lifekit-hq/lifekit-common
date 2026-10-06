import {NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  type ElementRef,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';

import {ButtonComponent} from '../button/button.component';
import {DialogActionsComponent} from '../dialog/dialog-actions.component';
import {CmnStepDirective} from './stepper-step.directive';

const INDEX_OFFSET = 1;

/**
 * Multi-step flow body for use inside a dialog. Owns step sequencing, progress and
 * Back / Next / Finish affordances; step content is declared with `cmnStep` templates.
 */
@Component({
  selector: 'cmn-stepper-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, DialogActionsComponent, NgTemplateOutlet],
  host: {style: 'display: block'},
  template: `
    <ol class="flex items-center gap-cmn-2 mb-cmn-4 list-none p-0 m-0" aria-label="Progress">
      @for (s of steps(); track $index) {
        <li
          [attr.aria-current]="$index === step() ? 'step' : null"
          [class]="
            $index === step()
              ? 'flex-1 border-t-2 border-accent-default pt-cmn-1 text-cmn-sm font-medium text-text-primary'
              : $index < step()
                ? 'flex-1 border-t-2 border-accent-default pt-cmn-1 text-cmn-sm text-text-secondary'
                : 'flex-1 border-t-2 border-border-default pt-cmn-1 text-cmn-sm text-text-secondary'
          "
        >
          <span class="sr-only">
            {{ $index < step() ? 'Completed: ' : $index === step() ? 'Current: ' : '' }}
          </span>
          {{ s.label() }}
        </li>
      }
    </ol>
    <p class="sr-only" aria-live="polite">Step {{ position() }} of {{ steps().length }}</p>
    @if (current(); as s) {
      <h3
        #heading
        class="font-headline text-base font-semibold text-text-primary mb-cmn-3 focus:outline-none"
        tabindex="-1"
      >
        {{ s.label() }}
      </h3>
      <ng-container [ngTemplateOutlet]="s.template" />
    }
    <cmn-dialog-actions align="between">
      <cmn-button [disabled]="busy()" (clicked)="onBack()" variant="secondary">
        {{ isFirst() ? cancelLabel() : backLabel() }}
      </cmn-button>
      <cmn-button [disabled]="!canAdvance()" [loading]="busy()" (clicked)="onNext()">
        {{ isLast() ? finishLabel() : nextLabel() }}
      </cmn-button>
    </cmn-dialog-actions>
  `,
})
export class StepperDialogComponent {
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private lastStep: number | null = null;

  public readonly step = model<number>(0);
  public readonly busy = input<boolean>(false);
  public readonly backLabel = input<string>('Back');
  public readonly nextLabel = input<string>('Next');
  public readonly finishLabel = input<string>('Finish');
  public readonly cancelLabel = input<string>('Cancel');

  public readonly finished = output<void>();
  public readonly cancelled = output<void>();

  protected readonly steps = contentChildren(CmnStepDirective);

  protected readonly current = computed(() => this.steps()[this.step()] ?? null);
  protected readonly position = computed(() => this.step() + INDEX_OFFSET);
  protected readonly isFirst = computed(() => this.step() === 0);
  protected readonly isLast = computed(() => this.step() >= this.steps().length - INDEX_OFFSET);
  protected readonly canAdvance = computed(
    () => !this.busy() && (this.current()?.valid() ?? false)
  );

  constructor() {
    // Move focus to the new step's heading so screen-reader / keyboard users land on it.
    effect(() => {
      const step = this.step();
      untracked(() => {
        if (this.lastStep !== null && this.lastStep !== step) {
          this.heading()?.nativeElement.focus();
        }
        this.lastStep = step;
      });
    });
  }

  protected onBack(): void {
    if (this.isFirst()) {
      this.cancelled.emit();
    } else {
      this.step.update(i => i - INDEX_OFFSET);
    }
  }

  protected onNext(): void {
    if (!this.canAdvance()) {
      return;
    }
    if (this.isLast()) {
      this.finished.emit();
    } else {
      this.step.update(i => i + INDEX_OFFSET);
    }
  }
}
