import {booleanAttribute, ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type PageContainerSpacing = 'none' | 'md' | 'lg';

const SPACING_CLASSES: Record<PageContainerSpacing, string> = {
  none: '',
  md: 'space-y-cmn-5',
  lg: 'space-y-cmn-10',
};

const HOST_CLASSES = 'block';
// Full-height column: the host takes its parent's height at every width (no min-height that grows
// with content, so a child scroller is bounded) and the box below grows into it.
const HOST_FILL_CLASSES = 'flex h-full flex-col';
const BOX_CLASSES = 'mx-auto w-full p-cmn-4 md:p-cmn-8';
const BOX_FILL_CLASSES = 'flex min-h-0 flex-1 flex-col';

/**
 * Page frame: a centred box capped at `maxWidth` (default 1200px) with the padding counted
 * inside that cap. `spacing` stacks projected children; `fill` makes the page a full-height
 * flex column, bounded to the space below the app shell's title, so projected content can take the
 * remaining height with `flex-1`. Put a `cmn-page-scroll` in it for a list that scrolls on its own.
 */
@Component({
  selector: 'cmn-page-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    // The shell bounds its page frame to the space below the title when a fill page is showing
    '[attr.data-cmn-fill]': 'fill() ? "" : null',
  },
  template: `
    <div [class]="boxClasses()">
      <ng-content />
    </div>
  `,
})
export class PageContainerComponent {
  public readonly maxWidth = input<string>('max-w-[1200px]');
  public readonly spacing = input<PageContainerSpacing>('md');
  public readonly fill = input(false, {transform: booleanAttribute});

  public readonly hostClasses = computed(() => (this.fill() ? HOST_FILL_CLASSES : HOST_CLASSES));

  public readonly boxClasses = computed(() =>
    [
      BOX_CLASSES,
      this.maxWidth(),
      SPACING_CLASSES[this.spacing()],
      this.fill() ? BOX_FILL_CLASSES : '',
    ]
      .filter(Boolean)
      .join(' ')
  );
}
