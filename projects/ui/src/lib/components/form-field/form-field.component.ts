import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
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
  FormResetEvent,
  FormSubmittedEvent,
  NG_VALUE_ACCESSOR,
  StatusChangeEvent,
  ValueChangeEvent,
} from '@angular/forms';
import {EMPTY, filter, map, merge, switchMap} from 'rxjs';

import {VALIDATION_MESSAGES} from '../../tokens/validation-messages.token';
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
 * counts as part of that submit and shows. A form reset hides everything again. A control with no
 * enclosing form never sees a submit, so it shows its error once touched. Without a `control`, a
 * static `errorMessage` shows immediately.
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
  private readonly singleLineChild = contentChild(InputComponent);
  private readonly multiLineChild = contentChild(TextareaComponent);
  private pendingValue: unknown = undefined;
  private pendingDisabled: boolean | undefined = undefined;
  private onChangeFn: ((v: unknown) => void) | undefined;
  private onTouchedFn: (() => void) | undefined;
  /** True between a value change and the status change it triggers: typing, not a late result. */
  private valueJustChanged = false;
  /** True once the enclosing form has been submitted, until it is reset. */
  private readonly submitted = signal(false);
  /** True while a submit-time validator error is on screen; cleared once the field is valid. */
  private readonly errorShown = signal(false);
  /** Bumped on every control event so the message tracks the control's current errors. */
  private readonly revision = signal(0);

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
    const standalone = !ctrl.parent;
    if (this.errorMessage() && (standalone ? ctrl.touched : this.submitted())) {
      return this.errorMessage();
    }
    if (!(standalone ? ctrl.touched : this.errorShown()) || !ctrl.errors) {
      return '';
    }
    const [key, params] = Object.entries(ctrl.errors)[0];
    return this.validationMessages[key]?.(params) ?? key;
  });

  constructor() {
    this.fieldId = `cmn-field-${++fieldCounter}`;
    toObservable(this.control)
      .pipe(
        switchMap(ctrl => {
          this.submitted.set(false);
          this.errorShown.set(false);
          this.valueJustChanged = false;
          if (!ctrl) {
            return EMPTY;
          }
          // Submit and reset fire on the root form only; value and status changes fire on the control.
          const events$ =
            ctrl.root === ctrl
              ? ctrl.events
              : merge(
                  ctrl.events,
                  ctrl.root.events.pipe(
                    filter(
                      event => event instanceof FormSubmittedEvent || event instanceof FormResetEvent
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

  private onControlEvent(ctrl: AbstractControl, event: ControlEvent): void {
    if (event instanceof FormSubmittedEvent) {
      this.submitted.set(true);
      this.errorShown.set(ctrl.invalid);
    } else if (event instanceof FormResetEvent) {
      this.submitted.set(false);
      this.errorShown.set(false);
    } else if (event instanceof ValueChangeEvent) {
      this.valueJustChanged = true;
    } else if (event instanceof StatusChangeEvent) {
      const typed = this.valueJustChanged;
      this.valueJustChanged = false;
      if (ctrl.valid) {
        this.errorShown.set(false);
      } else if (ctrl.invalid && this.submitted() && !typed) {
        this.errorShown.set(true);
      }
    } else if (ctrl.valid) {
      this.errorShown.set(false);
    }
    this.revision.update(n => n + 1);
  }
}
