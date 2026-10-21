import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormGroupDirective, NgForm} from '@angular/forms';

import {CMN_DIALOG_PRESENTATION} from '../dialog/dialog-config';
import {type ErrorSummaryField, ErrorSummaryRegistry} from './error-summary-registry';

/** A sheet form this short fits one screen, so it focuses its first invalid field instead. */
const SHORT_SHEET_FIELDS = 3;

let summaryCounter = 0;

/** Orders fields as the form lays them out, whatever order they were created in. */
function byDocumentOrder(a: ErrorSummaryField, b: ErrorSummaryField): number {
  return a.host.compareDocumentPosition(b.host) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * The GOV.UK error summary (guardrails V2). Place it at the top of a `[formGroup]` or `ngForm`
 * form. On a submit with errors it lists every error its `cmn-form-field`s show, in the same words
 * and in form order, each linking to its field, and focus moves to it. An entry leaves as its field
 * is fixed, following the form field's timing; a reset hides it all.
 *
 * Deviation: a sheet form with three or fewer fields draws no summary, and a submit with errors
 * focuses the first invalid field instead. `sheet` says whether the form is in a sheet; left unset,
 * it follows the enclosing `cmn-dialog`'s phone presentation.
 */
@Component({
  selector: 'cmn-error-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown()) {
      <div
        #summary
        [attr.aria-labelledby]="titleId"
        class="rounded-cmn-md border-2 border-status-error bg-surface-card p-cmn-4 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1"
        tabindex="-1"
      >
        <div role="alert">
          <h2 [id]="titleId" class="font-label text-cmn-md font-semibold text-text-primary">
            {{ title() }}
          </h2>
          <ul class="mt-cmn-1 flex flex-col">
            @for (entry of entries(); track entry.fieldId) {
              <li>
                <a
                  [href]="'#' + entry.fieldId"
                  (click)="follow($event, entry)"
                  class="inline-block py-cmn-1 text-cmn-sm font-medium text-status-error underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >{{ entry.submitError() }}</a
                >
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class ErrorSummaryComponent {
  private readonly injector = inject(Injector);
  private readonly presentation = inject(CMN_DIALOG_PRESENTATION, {optional: true});
  private readonly form =
    inject(FormGroupDirective, {optional: true}) ?? inject(NgForm, {optional: true});
  private readonly fields = this.form
    ? inject(ErrorSummaryRegistry).fields(this.form)
    : signal<readonly ErrorSummaryField[]>([]);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  public readonly title = input<string>('There is a problem');
  /** Whether the form sits in a sheet; `null` follows the enclosing `cmn-dialog`. */
  public readonly sheet = input<boolean | null>(null);

  protected readonly titleId = `cmn-error-summary-${++summaryCounter}-title`;
  /** The fields showing an error from the last submit, in form order. */
  protected readonly entries = computed(() =>
    this.fields()
      .filter(field => field.submitError())
      .sort(byDocumentOrder)
  );
  /** A sheet form short enough to fit one screen: it focuses a field instead of drawing. */
  protected readonly shortSheet = computed(
    () =>
      (this.sheet() ?? this.presentation?.() === 'sheet') &&
      this.fields().length <= SHORT_SHEET_FIELDS
  );
  protected readonly shown = computed(() => !this.shortSheet() && this.entries().length > 0);

  constructor() {
    // The fields take the submit after `ngSubmit` has run, so the entries are read once rendered.
    this.form?.ngSubmit.pipe(takeUntilDestroyed()).subscribe(() => {
      afterNextRender(() => this.moveFocus(), {injector: this.injector});
    });
  }

  protected follow(event: MouseEvent, entry: ErrorSummaryField): void {
    // An app's <base href> would resolve a bare fragment against the base and navigate away.
    event.preventDefault();
    entry.focusControl();
  }

  private moveFocus(): void {
    const [first] = this.entries();
    if (!first) {
      return;
    }
    if (this.shortSheet()) {
      first.focusControl();
    } else {
      this.summary()?.nativeElement.focus();
    }
  }
}
