import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';

/**
 * Carbon's button kinds. `destructive` is Carbon's danger button (primary); the tertiary and ghost
 * danger kinds follow it. `secondary` is Carbon's secondary (a filled button in the ink colour), and
 * the outlined button an earlier version called `secondary` is now `tertiary`.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'destructive'
  | 'danger-tertiary'
  | 'danger-ghost';
/** `sm` 32px and `lg` 64px are Carbon's small and extra-large; `md` is the 48px default. */
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonIconPosition = 'prefix' | 'suffix';

// Carbon's anatomy: square, a 1px border on every kind (transparent unless the kind draws one) so
// the box never changes between kinds, 14px body-compact label, 16px side padding. Focus is Carbon's
// inset ring: the border turns to the focus colour and a 1px ground-coloured line sits inside it.
// Every size presses as at least --size-touch square on a phone and keeps its drawn size.
const BASE_CLASSES =
  'inline-flex items-center justify-center gap-cmn-2 font-label [font-weight:var(--cmn-btn-weight)] text-cmn-sm ' +
  'rounded-cmn-role-control shadow-cmn-btn border px-cmn-4 focus:outline-none ' +
  'focus:border-border-focus focus:shadow-cmn-focus-inset ' +
  `transition-colors duration-cmn-short ease-cmn-standard ${PHONE_HIT_AREA_CLASSES}`;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-accent-default text-text-inverse hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'border-cmn-btn-secondary-border bg-cmn-btn-secondary text-cmn-btn-secondary-fg hover:bg-cmn-btn-secondary-hover active:bg-cmn-btn-secondary-hover',
  tertiary:
    'bg-transparent border-accent-default text-accent-default ' +
    'hover:bg-accent-default hover:text-text-inverse active:bg-accent-active active:text-text-inverse',
  ghost:
    'border-transparent bg-transparent text-accent-default hover:bg-surface-raised hover:text-accent-hover ' +
    'active:bg-surface-hover',
  destructive:
    'border-transparent bg-status-error text-text-inverse hover:opacity-90 active:opacity-80',
  'danger-tertiary':
    'bg-transparent border-status-error text-status-error ' +
    'hover:bg-status-error hover:text-text-inverse active:opacity-80 active:bg-status-error active:text-text-inverse',
  'danger-ghost':
    'border-transparent bg-transparent text-status-error hover:bg-status-error hover:text-text-inverse ' +
    'active:opacity-80 active:bg-status-error active:text-text-inverse',
};

// Carbon's layout sizes: sm 32, the 48 default (`--cmn-control-h`, shared with the md field beside
// it) and 64 (Carbon's extra-large). The height is a minimum so a label that wraps grows the button
// instead of overflowing it; block padding stays under the height a one-line label needs, so the
// size sets the box in every kind.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-cmn-size-sm py-cmn-1',
  md: 'min-h-cmn-control-h py-cmn-2',
  lg: 'min-h-cmn-16 py-cmn-3',
};

const ICON_SIZE: Record<ButtonSize, 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

// A disabled button is drawn in its own colours, not the variant's dimmed: opacity over an accent
// fill leaves the label near 1:1 on its ground. The grey fill (or, for the outlined and quiet kinds,
// the hairline border) and the secondary text colour hold 4.5:1 on card, ground and raised
// surfaces in both themes.
const DISABLED_FILLED = 'border-transparent bg-surface-raised text-text-secondary';
const DISABLED_OUTLINED = 'bg-transparent border-border-default text-text-secondary';
const DISABLED_GHOST = 'border-transparent bg-transparent text-text-secondary';
const DISABLED_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: DISABLED_FILLED,
  secondary: DISABLED_FILLED,
  tertiary: DISABLED_OUTLINED,
  ghost: DISABLED_GHOST,
  destructive: DISABLED_FILLED,
  'danger-tertiary': DISABLED_OUTLINED,
  'danger-ghost': DISABLED_GHOST,
};
const DISABLED_CLASSES = 'pointer-events-none cursor-not-allowed';
/** A busy button is not dimmed: its label stays at full contrast while the spinner turns. */
const BUSY_CLASSES = 'pointer-events-none';

@Component({
  selector: 'cmn-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[attr.aria-label]': 'null'},
  imports: [IconComponent],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-busy]="loading() ? true : null"
      [attr.aria-disabled]="disabled() ? true : null"
      [class]="classes()"
      (click)="clicked.emit($event)"
    >
      @if (loading()) {
        <span class="animate-spin inline-flex">
          <cmn-icon [size]="iconSize()" name="LoaderCircle" />
        </span>
      } @else if (icon() && iconPosition() === 'prefix') {
        <cmn-icon [name]="icon()!" [size]="iconSize()" aria-hidden="true" />
      }
      <ng-content />
      @if (!loading() && icon() && iconPosition() === 'suffix') {
        <cmn-icon [name]="icon()!" [size]="iconSize()" aria-hidden="true" />
      }
    </button>
  `,
})
export class ButtonComponent {
  public readonly variant = input<ButtonVariant>('primary');
  public readonly size = input<ButtonSize>('md');
  public readonly type = input<ButtonType>('button');
  public readonly disabled = input<boolean>(false);
  public readonly loading = input<boolean>(false);
  public readonly icon = input<Nullable<LucideIconName>>(null);
  public readonly iconPosition = input<ButtonIconPosition>('prefix');
  /** Names an icon-only button; moves to the inner `<button>` so the host element carries no label. */
  public readonly ariaLabel = input<Nullable<string>>(null, {alias: 'aria-label'});

  public readonly clicked = output<MouseEvent>();

  public readonly classes = computed(() => {
    const disabled = this.disabled();
    const variant = disabled ? DISABLED_VARIANT_CLASSES : VARIANT_CLASSES;
    const parts = [BASE_CLASSES, variant[this.variant()], SIZE_CLASSES[this.size()]];
    if (disabled) {
      parts.push(DISABLED_CLASSES);
    } else if (this.loading()) {
      parts.push(BUSY_CLASSES);
    }
    return parts.join(' ');
  });

  public readonly iconSize = computed(() => ICON_SIZE[this.size()]);
}
