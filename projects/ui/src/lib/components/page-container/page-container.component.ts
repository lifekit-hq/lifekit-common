import {booleanAttribute, ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type PageContainerSpacing = 'none' | 'md' | 'lg';

const SPACING_CLASSES: Record<PageContainerSpacing, string> = {
  none: '',
  md: 'space-y-cmn-5',
  lg: 'space-y-cmn-10',
};

const HOST_CLASSES = 'block';
// Full-height column: the host fills its parent (from md up) and the box below grows into it.
const HOST_FILL_CLASSES = 'flex min-h-full flex-col md:h-full';
const BOX_CLASSES = 'mx-auto w-full p-cmn-4 md:p-cmn-8';
const BOX_FILL_CLASSES = 'flex min-h-0 flex-1 flex-col';

/**
 * Page frame: a centred box capped at `maxWidth` (default 1200px) with the padding counted
 * inside that cap. `spacing` stacks projected children; `fill` makes the page a full-height
 * flex column so projected content can take the remaining height with `flex-1`.
 */
@Component({
  selector: 'cmn-page-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[class]': 'hostClasses()'},
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
