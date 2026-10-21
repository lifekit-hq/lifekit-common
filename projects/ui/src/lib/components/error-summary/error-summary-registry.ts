import {Injectable, type Signal, signal, type WritableSignal} from '@angular/core';

/** What a `cmn-form-field` offers the error summary of its form. */
export interface ErrorSummaryField {
  /** The id on the field's native control; the summary links to it. */
  readonly fieldId: string;
  /** The field's host element, which orders the entries as the form lays them out. */
  readonly host: HTMLElement;
  /** The inline error a submit put on screen, or `''`: the summary repeats it word for word. */
  readonly submitError: Signal<string>;
  /** Moves focus to the field's control and brings its label into view. */
  focusControl(): void;
}

/**
 * The form fields under each form directive (`FormGroupDirective` or `NgForm`), so a
 * `cmn-error-summary` in the same form can list what its fields show without the host wiring them.
 */
@Injectable({providedIn: 'root'})
export class ErrorSummaryRegistry {
  private readonly forms = new WeakMap<object, WritableSignal<readonly ErrorSummaryField[]>>();

  public fields(form: object): Signal<readonly ErrorSummaryField[]> {
    return this.list(form).asReadonly();
  }

  /** Adds a field to its form's list; the returned function takes it out again. */
  public register(form: object, field: ErrorSummaryField): () => void {
    const list = this.list(form);
    list.update(fields => [...fields, field]);
    return () => list.update(fields => fields.filter(f => f !== field));
  }

  private list(form: object): WritableSignal<readonly ErrorSummaryField[]> {
    let list = this.forms.get(form);
    if (!list) {
      list = signal<readonly ErrorSummaryField[]>([]);
      this.forms.set(form, list);
    }
    return list;
  }
}
