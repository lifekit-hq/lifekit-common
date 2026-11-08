import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

import {IconComponent} from '../icon/icon.component';

/** How far (deg) the arc turns over a whole pull, so the pull reads as winding up before it spins. */
const PULL_TURN_DEG = 270;
/** Half of `size-cmn-size-md`: centres the chip on a point. */
const CHIP_HALF = 'calc(var(--cmn-size-md) / 2)';

const CHIP_CLASSES =
  'flex size-cmn-size-md items-center justify-center rounded-full border border-border-default ' +
  'bg-surface-card text-text-secondary';
/** Settles on the short duration; a finger moving it is never animated, and Reduce Motion drops it. */
const CHIP_SETTLE_CLASSES =
  ' transition-opacity duration-cmn-short ease-cmn-standard motion-reduce:transition-none';

/**
 * The activity indicator of pull to refresh (Apple HIG, Refreshing content): a round chip with the
 * spinner arc. `cmn-app-layout` draws it under the top bar, in the gap the pulled content opens;
 * a story draws it alone. While pulling, the arc winds up with `progress`; while `refreshing` it
 * spins (a spinner keeps turning under Reduce Motion, as the others do).
 *
 * With no `offset` (Reduce Motion: the content stays where it is) the chip sits a small distance
 * below the bar and only fades in with the pull. It is decorative: the shell announces
 * "Refreshing" in a live region.
 */
@Component({
  selector: 'cmn-pull-refresh-indicator',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'pointer-events-none flex justify-center', 'aria-hidden': 'true'},
  template: `
    <span
      [class]="chipClasses()"
      [style.opacity]="opacity()"
      [style.transform]="chipTransform()"
      data-cmn-pull-indicator
    >
      <span [class]="arcClasses()" [style.transform]="arcTransform()">
        <cmn-icon name="LoaderCircle" size="md" />
      </span>
    </span>
  `,
})
export class PullRefreshIndicatorComponent {
  /** 0 to 1: how close the pull is to the threshold. */
  public readonly progress = input<number>(0);
  /** The reload is running: the arc spins and the chip stays. */
  public readonly refreshing = input<boolean>(false);
  /** How far (px) the content has been pulled down; 0 when it does not move. */
  public readonly offset = input<number>(0);
  /** A finger is pulling, so the chip follows it with no transition. */
  public readonly dragging = input<boolean>(false);
  /** Nothing is showing and nothing is pulled. */
  public readonly hidden = input<boolean>(false);

  protected readonly opacity = computed<number>(() =>
    this.hidden() ? 0 : this.refreshing() ? 1 : this.progress()
  );

  protected readonly chipClasses = computed<string>(
    () => CHIP_CLASSES + (this.dragging() ? '' : CHIP_SETTLE_CLASSES)
  );

  /** In the gap between the bar and the content when that moves; a small step below the bar when not. */
  protected readonly chipTransform = computed<string>(() =>
    this.offset() > 0
      ? `translateY(calc(${this.offset()}px / 2 - ${CHIP_HALF}))`
      : 'translateY(var(--cmn-motion-distance-sm))'
  );

  protected readonly arcClasses = computed<string>(() =>
    this.refreshing() ? 'inline-flex animate-spin' : 'inline-flex'
  );

  protected readonly arcTransform = computed<string | null>(() =>
    this.refreshing() ? null : `rotate(${this.progress() * PULL_TURN_DEG}deg)`
  );
}
