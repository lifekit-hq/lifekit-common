import {ChangeDetectionStrategy, Component, input} from '@angular/core';

// Shadow plus a hairline border, like the menu: a shadow alone is lost on dark surfaces.
const PANEL_CLASSES =
  'block max-w-[min(20rem,calc(100vw-2rem))] break-words rounded-cmn-md border border-border-default bg-surface-card ' +
  'px-cmn-2 py-cmn-1 text-cmn-xs leading-relaxed text-text-primary shadow-cmn-md ' +
  'animate-cmn-fade-in';

/**
 * The visible bubble `cmnTooltip` attaches in a CDK overlay. Screen readers get the same text
 * through the trigger's `aria-describedby`, so this copy is hidden from them.
 */
@Component({
  selector: 'cmn-tooltip-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'aria-hidden': 'true', '[class]': 'panelClasses'},
  template: '{{ text() }}',
})
export class TooltipPanelComponent {
  public readonly text = input.required<string>();

  public readonly panelClasses = PANEL_CLASSES;
}
