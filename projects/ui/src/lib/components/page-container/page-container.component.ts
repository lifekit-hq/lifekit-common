import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

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
/**
 * The end padding also clears what floats over the bottom of the app shell's scroll container
 * (`--cmn-content-inset-bottom`, published by `cmn-app-layout`; 0px anywhere else). It is padding
 * on this box, not on the scroll container, so it holds when a page host caps its height.
 */
const BOX_INSET_CLASSES =
  'pb-[calc(theme(spacing.cmn-4)+var(--cmn-content-inset-bottom,0px))] ' +
  'md:pb-[calc(theme(spacing.cmn-8)+var(--cmn-content-inset-bottom,0px))]';
/**
 * A filled box is held to its host's height, and a page longer than that overflows it, past its
 * padding. So in fill mode the end clearance is a spacer after the content instead: it follows
 * overflowing content to its end, and stands in for the padding when a child scrolls internally.
 */
const BOX_FILL_INSET_CLASSES =
  "pb-0 md:pb-0 after:block after:shrink-0 after:content-[''] " +
  'after:h-[calc(theme(spacing.cmn-4)+var(--cmn-content-inset-bottom,0px))] ' +
  'md:after:h-[calc(theme(spacing.cmn-8)+var(--cmn-content-inset-bottom,0px))]';
const BOX_FILL_CLASSES = 'flex min-h-0 flex-1 flex-col';

/**
 * Page frame: a centred box capped at `maxWidth` (default 1200px) with the padding counted
 * inside that cap. `spacing` stacks projected children; `fill` makes the page a full-height
 * flex column so projected content can take the remaining height with `flex-1`: its own
 * height on a phone is a minimum (`min-h-full`), so a page longer than the screen still scrolls
 * whole; from md it is capped at the parent's height.
 *
 * The outermost page container ends with the app shell's bottom inset, so its last row scrolls
 * clear of the floating tab bar; a page container nested in another does not add it again.
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
  private readonly outer = inject(PageContainerComponent, {optional: true, skipSelf: true});

  public readonly maxWidth = input<string>('max-w-[1200px]');
  public readonly spacing = input<PageContainerSpacing>('md');
  public readonly fill = input(false, {transform: booleanAttribute});

  public readonly hostClasses = computed(() => (this.fill() ? HOST_FILL_CLASSES : HOST_CLASSES));

  public readonly boxClasses = computed(() =>
    [
      BOX_CLASSES,
      this.endInsetClasses(),
      this.maxWidth(),
      SPACING_CLASSES[this.spacing()],
      this.fill() ? BOX_FILL_CLASSES : '',
    ]
      .filter(Boolean)
      .join(' ')
  );

  private endInsetClasses(): string {
    if (this.outer) {
      return '';
    }
    return this.fill() ? BOX_FILL_INSET_CLASSES : BOX_INSET_CLASSES;
  }
}
