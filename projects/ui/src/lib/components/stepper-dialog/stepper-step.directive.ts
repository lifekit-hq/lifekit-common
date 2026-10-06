import {Directive, inject, input, TemplateRef} from '@angular/core';

/** Declares one step of a `cmn-stepper-dialog`: `<ng-template cmnStep label="Provider">…</ng-template>`. */
@Directive({selector: 'ng-template[cmnStep]'})
export class CmnStepDirective {
  public readonly template = inject<TemplateRef<unknown>>(TemplateRef);

  public readonly label = input.required<string>();
  /** When false, "Next" / "Finish" is disabled for this step. */
  public readonly valid = input<boolean>(true);
}
