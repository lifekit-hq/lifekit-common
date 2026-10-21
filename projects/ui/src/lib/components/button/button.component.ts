import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonIconPosition = 'prefix' | 'suffix';

// Every size presses as at least --size-touch square on a phone and keeps its drawn size.
const BASE_CLASSES =
  'inline-flex items-center justify-center gap-cmn-2 font-label font-medium rounded-cmn-md ' +
  'focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1 ' +
  `transition-colors duration-150 ${PHONE_HIT_AREA_CLASSES}`;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent-default text-text-inverse hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'bg-transparent border border-border-strong text-text-primary hover:bg-surface-raised active:bg-surface-raised',
  destructive: 'bg-status-error text-text-inverse hover:opacity-90 active:opacity-80',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-cmn-2 py-cmn-1 text-cmn-sm',
  md: 'px-cmn-4 py-cmn-2 text-cmn-md',
  lg: 'px-cmn-6 py-cmn-3 text-cmn-lg',
};

const ICON_SIZE: Record<ButtonSize, 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

const DISABLED_CLASSES = 'opacity-50 pointer-events-none cursor-not-allowed';

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
    const parts = [BASE_CLASSES, VARIANT_CLASSES[this.variant()], SIZE_CLASSES[this.size()]];
    if (this.disabled() || this.loading()) {
      parts.push(DISABLED_CLASSES);
    }
    return parts.join(' ');
  });

  public readonly iconSize = computed(() => ICON_SIZE[this.size()]);
}
