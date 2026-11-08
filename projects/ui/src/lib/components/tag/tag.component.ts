import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

/** The four status hues plus neutral; Carbon's blue, green, red, magenta (the warning slot) and gray tags. */
export type TagVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
/** Carbon's tag sizes: 24px (default) and 32px tall. */
export type TagSize = 'md' | 'lg';

// Carbon's read-only tag: a tinted fill with text in the hue, both from the status roles so a seed
// re-tints it and light/dark follow. Colour is never the only signal; the label says the status.
const VARIANT_CLASSES: Record<TagVariant, string> = {
  success: 'bg-status-success-subtle text-status-success',
  error: 'bg-status-error-subtle text-status-error',
  warning: 'bg-status-warning-subtle text-status-warning',
  info: 'bg-status-info-subtle text-status-info',
  neutral: 'bg-surface-raised text-text-secondary',
};

// Label-01 (12px, regular) in a pill, as Carbon draws its tag (the one rounded Carbon shape).
const BASE_CLASSES =
  'inline-flex items-center rounded-cmn-full px-cmn-2 text-cmn-xs font-label font-normal';

const SIZE_CLASSES: Record<TagSize, string> = {
  md: 'min-h-cmn-size-xs',
  lg: 'min-h-cmn-size-sm px-cmn-3',
};

@Component({
  selector: 'cmn-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span [class]="classes()"><ng-content /></span>',
})
export class TagComponent {
  public readonly variant = input<TagVariant>('neutral');
  public readonly size = input<TagSize>('md');

  public readonly classes = computed(
    () => `${BASE_CLASSES} ${SIZE_CLASSES[this.size()]} ${VARIANT_CLASSES[this.variant()]}`
  );
}
