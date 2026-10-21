import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  type ControlEvent,
  ControlValueAccessor,
  FormGroupDirective,
  FormResetEvent,
  FormSubmittedEvent,
  NG_VALUE_ACCESSOR,
  NgForm,
  StatusChangeEvent,
  ValueChangeEvent,
} from '@angular/forms';
import {EMPTY, filter, map, merge, switchMap} from 'rxjs';

import {VALIDATION_MESSAGES} from '../../tokens/validation-messages.token';
import {ErrorSummaryRegistry} from '../error-summary/error-summary-registry';
import {InputComponent} from '../input/input.component';
import {TextareaComponent} from '../textarea/textarea.component';

let fieldCounter = 0;

/**
 * A label, hint and error around a projected `cmn-input` or `cmn-textarea`.
 *
 * Validation timing follows GOV.UK (guardrails V1, V4): with a `control`, nothing shows on blur or
 * while typing; errors appear when the enclosing form is submitted (`FormSubmittedEvent`, fired by
 * `[formGroup]` / `ngForm` on submit). After that, a shown error is re-checked as the person types
 * and clears the moment the field is valid; typing never raises a new error before the next submit.
 * A validity that resolves after the submit (an async validator finishing, a server `setErrors`)
 * counts as part of that submit and shows, unless the value was edited since; then it waits for the
 * next submit. A form reset hides everything again, including a reset
 * made by the `(ngSubmit)` handler itself. A control whose root form is not bound to an enclosing
 * `[formGroup]` or `ngForm` (a parentless control, or a group saved by a button calling
 * `markAllAsTouched()`) never sees a submit, so it shows its error once touched. Without a
 * `control`, a static `errorMessage` shows immediately.
 *
 * Inside a `[formGroup]` or `ngForm`, the field offers the error a submit put on screen to that
 * form's `cmn-error-summary` (guardrails V2), which repeats it word for word and links to the field.
 */
@Component({
  selector: 'cmn-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-col gap-cmn-1">
      @if (label()) {
        <label [for]="fieldId" class="font-label text-cmn-sm font-medium text-text-primary">
          {{ label() }}
          @if (required()) {
            <span class="text-status-error ml-0.5" aria-hidden="true">*</span>
          }
        </label>
      }

      <ng-content />

      @if (hint() && !resolvedError()) {
        <span class="text-cmn-xs leading-relaxed text-text-secondary">{{ hint() }}</span>
      }

      @if (resolvedError()) {
        <span
          role="alert"
          aria-live="polite"
          class="text-cmn-xs leading-relaxed text-status-error"
          >{{ resolvedError() }}</span
        >
      }
    </div>
  `,
})
export class FormFieldComponent implements ControlValueAccessor, AfterContentInit {
  private readonly validationMessages = inject(VALIDATION_MESSAGES);
  private readonly formGroupDirective = inject(FormGroupDirective, {optional: true});
  private readonly ngForm = inject(NgForm, {optional: true});
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly singleLineChild = contentChild(InputComponent);
  private readonly multiLineChild = contentChild(TextareaComponent);
  private pendingValue: unknown = undefined;
  private pendingDisabled: boolean | undefined = undefined;
  private onChangeFn: ((v: unknown) => void) | undefined;
  private onTouchedFn: (() => void) | undefined;
  /** True once the value changes after the last submit or reset: a later result belongs to the edit. */
  private editedSinceSubmit = false;
  /** True from a reset until the task ends; a submit in that window was reset by its own handler. */
  private resetThisTask = false;
  /** True once the enclosing form has been submitted, until it is reset. */
  private readonly submitted = signal(false);
  /** True while a submit-time validator error is on screen; cleared once the field is valid. */
  private readonly errorShown = signal(false);
  /** Bumped on every control event so the message tracks the control's current errors. */
  private readonly revision = signal(0);
  /** The error on screen because of a submit, or `''`: what the form's error summary lists. */
  private readonly submitError = computed(() => (this.submitted() ? this.resolvedError() : ''));

  public readonly label = input<string>('');
  public readonly hint = input<string>('');
  public readonly errorMessage = input<string>('');
  public readonly required = input<boolean>(false);
  public readonly control = input<AbstractControl | null>(null);

  public readonly fieldId: string;

  /** The projected `cmn-input` or `cmn-textarea`, which share one value-accessor surface. */
  protected readonly inputChild = computed<InputComponent | TextareaComponent | undefined>(
    () => this.singleLineChild() ?? this.multiLineChild()
  );
  protected readonly resolvedError = computed(() => {
    this.revision();
    const ctrl = this.control();
    if (!ctrl) {
      return this.errorMessage();
    }
    const awaitsSubmit = this.enclosingForm() === ctrl.root;
    if (this.errorMessage() && (awaitsSubmit ? this.submitted() : ctrl.touched)) {
      return this.errorMessage();
    }
    if (!(awaitsSubmit ? this.errorShown() : ctrl.touched) || !ctrl.errors) {
      return '';
    }
    const [key, params] = Object.entries(ctrl.errors)[0];
    return this.validationMessages[key]?.(params) ?? key;
  });

  constructor() {
    this.fieldId = `cmn-field-${++fieldCounter}`;
    const summaryForm = this.formGroupDirective ?? this.ngForm;
    if (summaryForm) {
      const unregister = inject(ErrorSummaryRegistry).register(summaryForm, {
        fieldId: this.fieldId,
        host: this.host.nativeElement,
        submitError: this.submitError,
        focusControl: () => this.focusControl(),
      });
      inject(DestroyRef).onDestroy(unregister);
    }
    toObservable(this.control)
      .pipe(
        switchMap(ctrl => {
          this.submitted.set(false);
          this.errorShown.set(false);
          this.editedSinceSubmit = false;
          this.resetThisTask = false;
          if (!ctrl) {
            return EMPTY;
          }
          // Submit and reset fire on the directive's form only; value and status fire on the control.
          // An ngModel control joins that form a tick after binding, so its root is not read here.
          const form = this.enclosingForm();
          const events$ =
            !form || form === ctrl
              ? ctrl.events
              : merge(
                  ctrl.events,
                  form.events.pipe(
                    filter(
                      event =>
                        event instanceof FormSubmittedEvent || event instanceof FormResetEvent
                    )
                  )
                );
          return events$.pipe(map(event => [ctrl, event] as const));
        }),
        takeUntilDestroyed()
      )
      .subscribe(([ctrl, event]) => this.onControlEvent(ctrl, event));
  }

  public ngAfterContentInit(): void {
    const inputCmp = this.inputChild();
    if (!inputCmp) {
      return;
    }

    inputCmp.setInputId(this.fieldId);

    if (this.pendingValue !== undefined) {
      inputCmp.writeValue(this.pendingValue as string);
    }
    if (this.pendingDisabled !== undefined) {
      inputCmp.setDisabledState(this.pendingDisabled);
    }
    if (this.onChangeFn) {
      inputCmp.registerOnChange(this.onChangeFn as (v: string) => void);
    }
    if (this.onTouchedFn) {
      inputCmp.registerOnTouched(this.onTouchedFn);
    }
  }

  public writeValue(value: unknown): void {
    this.pendingValue = value;
    this.inputChild()?.writeValue(value as string);
  }

  public registerOnChange(fn: (v: unknown) => void): void {
    this.onChangeFn = fn;
    this.inputChild()?.registerOnChange(fn as (v: string) => void);
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
    this.inputChild()?.registerOnTouched(fn);
  }

  public setDisabledState(isDisabled: boolean): void {
    this.pendingDisabled = isDisabled;
    this.inputChild()?.setDisabledState(isDisabled);
  }

  /** The form bound by an enclosing `[formGroup]` or `ngForm`: the only source of submit events. */
  private enclosingForm(): AbstractControl | undefined {
    return this.formGroupDirective?.form ?? this.ngForm?.form;
  }

  /** Focuses the projected control and scrolls so its label shows too, as a summary link does. */
  private focusControl(): void {
    const host = this.host.nativeElement;
    host.querySelector<HTMLElement>(`#${this.fieldId}`)?.focus({preventScroll: true});
    host.scrollIntoView({block: 'center'});
  }

  private onControlEvent(ctrl: AbstractControl, event: ControlEvent): void {
    if (event instanceof FormSubmittedEvent) {
      if (!this.resetThisTask) {
        this.submitted.set(true);
        this.errorShown.set(ctrl.invalid);
        this.editedSinceSubmit = false;
      }
    } else if (event instanceof FormResetEvent) {
      this.submitted.set(false);
      this.errorShown.set(false);
      this.editedSinceSubmit = false;
      this.resetThisTask = true;
      queueMicrotask(() => (this.resetThisTask = false));
    } else if (event instanceof ValueChangeEvent) {
      this.editedSinceSubmit = true;
    } else if (event instanceof StatusChangeEvent) {
      if (ctrl.valid) {
        this.errorShown.set(false);
      } else if (ctrl.invalid && this.submitted() && !this.editedSinceSubmit) {
        this.errorShown.set(true);
      }
    } else if (ctrl.valid) {
      this.errorShown.set(false);
    }
    this.revision.update(n => n + 1);
  }
}
