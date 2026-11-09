import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {PageComponent} from '../page/page.component';
import {ProseComponent} from './prose.component';

/** The route scan's `line-length` rule aims for fewer characters than this per rendered line. */
const LINE_LENGTH_AIM = 80;
/** The list template's main column on a desktop screen, where the cap has to hold. */
const LIST_COLUMN_PX = 640;

const DISCLAIMER =
  'Ledger proposes, you decide. Finance Sentry never trades: confirming records your decision ' +
  'and shows the order for you to place at your broker yourself. Nothing here is financial ' +
  'advice, and every proposal is a reading of your own data.';

const PLEX_SANS = new URL(
  '../../../../../../node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2',
  import.meta.url
);
const PLEX_FAMILY = 'Plex Sans (prose spec)';

/**
 * The unit run loads no stylesheet, so the Tailwind utilities on the host resolve to nothing.
 * Each rule here is what the generated utility of the same name resolves to, so the width a class
 * gives is what the lines below are measured against, and a class that resolves to no rule here
 * (a different cap, a utility that is not generated) leaves the copy unbounded.
 */
const UTILITY_RULES = `
  cmn-prose { font-family: '${PLEX_FAMILY}'; }
  .block { display: block; }
  .text-cmn-sm { font-size: 0.875rem; line-height: 1.5; }
  .break-words { overflow-wrap: break-word; }
  .max-w-\\[56ch\\] { max-width: 56ch; }
  .max-w-prose { max-width: 65ch; }
`;

/**
 * Characters on each rendered line of the element's text, spaces included, found by where each
 * one is painted: from the first to the last visible character of the line.
 */
const charactersPerLine = (element: HTMLElement): number[] => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const lines = new Map<number, {first: number; last: number}>();
  let offset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    for (let index = 0; index < text.length; index++, offset++) {
      if (!text.data[index].trim()) {
        continue;
      }
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const top = Math.round(range.getBoundingClientRect().top);
      const line = lines.get(top);
      if (line) {
        line.last = offset;
      } else {
        lines.set(top, {first: offset, last: offset});
      }
    }
  }
  return [...lines.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, {first, last}]) => last - first + 1);
};

describe('ProseComponent', () => {
  @Component({
    imports: [ProseComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<cmn-prose>{{ disclaimer }}</cmn-prose>',
  })
  class DisclaimerHostComponent {
    protected readonly disclaimer = DISCLAIMER;
  }

  @Component({
    imports: [PageComponent, ProseComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-page kind="list" title="Decisions">
        <cmn-prose>
          <p class="first">Ledger proposes, you decide.</p>
          <p class="second">Finance Sentry never trades.</p>
        </cmn-prose>
        <section class="after">After</section>
      </cmn-page>
    `,
  })
  class PageHostComponent {}

  const style = document.createElement('style');
  let plex: FontFace;
  let fixture: ComponentFixture<unknown>;

  const prose = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('cmn-prose') as HTMLElement;

  beforeAll(async () => {
    plex = new FontFace(PLEX_FAMILY, `url(${PLEX_SANS.href})`, {weight: '100 700'});
    document.fonts.add(await plex.load());
    style.textContent = UTILITY_RULES;
    document.head.append(style);
  });

  afterAll(() => {
    document.fonts.delete(plex);
    style.remove();
  });

  describe('a long disclaimer in the list page column', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(DisclaimerHostComponent);
      (fixture.nativeElement as HTMLElement).style.width = `${LIST_COLUMN_PX}px`;
      document.body.append(fixture.nativeElement);
      fixture.detectChanges();
    });

    afterEach(() => {
      (fixture.nativeElement as HTMLElement).remove();
    });

    it('wraps onto several lines, none of them 80 characters or longer', () => {
      const lines = charactersPerLine(prose());

      expect(lines.length).toBeGreaterThan(2);
      for (const characters of lines) {
        expect(characters).toBeLessThan(LINE_LENGTH_AIM);
      }
    });

    it('is the cap that narrows it: the same column without the measure runs past the aim', () => {
      prose().className = '';
      prose().style.display = 'block';
      prose().style.fontSize = '0.875rem';

      expect(Math.max(...charactersPerLine(prose()))).toBeGreaterThanOrEqual(LINE_LENGTH_AIM);
    });

    it('lets a long unbroken word wrap inside the measure instead of overflowing it', () => {
      prose().textContent = 'x'.repeat(DISCLAIMER.length);

      expect(prose().scrollWidth).toBeLessThanOrEqual(prose().clientWidth);
    });
  });

  describe('as a block of a page', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(PageHostComponent);
      fixture.detectChanges();
    });

    it('projects its paragraphs, one above the other', () => {
      const [first, second] = Array.from(prose().querySelectorAll('p'));

      expect(prose().querySelectorAll('p')).toHaveLength(2);
      expect(second.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        first.getBoundingClientRect().bottom
      );
    });

    it('is a top-level block of the page column, so the page sets the gap around it', () => {
      const column = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-cmn-page-column]'
      ) as HTMLElement;

      expect(prose().parentElement).toBe(column);
    });
  });
});
