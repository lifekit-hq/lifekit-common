import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {CMN_DIALOG_PRESENTATION} from './dialog-config';

export type DialogActionsAlign = 'between' | 'end' | 'start';

const BASE_CLASSES =
  '-mx-cmn-6 -mb-cmn-6 mt-cmn-6 flex items-center gap-cmn-2 ' +
  'border-t border-border-default px-cmn-6 py-cmn-4';

// A phone sheet or full-screen flow keeps its actions in reach: they pin to the bottom of the
// scrolling body and stay on top of the content that scrolls under them. A sticky box measures
// against the body's content box, so its offset undoes the body padding the bar breaks out of.
const PINNED_CLASSES = 'sticky -bottom-cmn-6 z-10 bg-surface-card';

// An action sheet stacks full-width actions inside its card, which pads 1rem rather than 1.5rem.
const ACTION_SHEET_CLASSES =
  '-mx-cmn-4 -mb-cmn-4 mt-cmn-4 flex flex-col items-stretch gap-cmn-2 ' +
  'border-t border-border-default px-cmn-4 py-cmn-3 [&_button]:w-full [&_button]:min-h-14';

const ALIGN_CLASSES: Record<DialogActionsAlign, string> = {
  between: 'justify-between',
  end: 'justify-end',
  start: 'justify-start',
};

@Component({
  selector: 'cmn-dialog-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="classes()">
      <ng-content />
    </div>
  `,
})
export class DialogActionsComponent {
  private readonly presentation = inject(CMN_DIALOG_PRESENTATION, {optional: true});

  public readonly align = input<DialogActionsAlign>('end');

  public readonly classes = computed(() => {
    const presentation = this.presentation?.() ?? 'dialog';
    if (presentation === 'action-sheet') {
      return ACTION_SHEET_CLASSES;
    }
    const base = `${BASE_CLASSES} ${ALIGN_CLASSES[this.align()]}`;
    return presentation === 'dialog' ? base : `${base} ${PINNED_CLASSES}`;
  });
}
