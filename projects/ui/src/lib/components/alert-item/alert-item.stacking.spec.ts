import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {ListSectionComponent} from '../list-section/list-section.component';
import {AlertItemComponent} from './alert-item.component';

/**
 * The unit run loads no stylesheet, so the utilities these components carry resolve to nothing.
 * Each rule is what the generated utility of the same name resolves to, limited to the ones that
 * decide what paints on top of what; the heading's `max-md:` variants are written without the
 * media query because the heading is only sticky on a phone and this is the phone case.
 */
const UTILITY_RULES = `
  .relative { position: relative; }
  .sticky { position: sticky; }
  .z-10 { z-index: 10; }
  .isolate { isolation: isolate; }
  .flex { display: flex; }
  .block { display: block; }
  .shrink-0 { flex-shrink: 0; }
  .flex-1 { flex: 1 1 0%; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .min-h-cmn-size-md { min-height: 40px; }
  .p-1 { padding: 0.25rem; }
  .p-cmn-4 { padding: 1rem; }
  .max-md\\:sticky { position: sticky; }
  .max-md\\:z-10 { z-index: 10; }
  .max-md\\:top-\\[var\\(--cmn-sticky-top\\,0px\\)\\] { top: var(--cmn-sticky-top, 0px); }
`;

const SCROLLER_HEIGHT = 240;
/** How far the dismiss button's centre sits above the heading's bottom edge, in px. */
const OVERLAP = 4;
/** Scrolling moves the sticky heading too, so the offset is re-read until it settles. */
const SETTLE_PASSES = 3;
const ALERTS = [1, 2, 3, 4, 5];

@Component({
  imports: [ListSectionComponent, AlertItemComponent],
  template: `
    <div
      style="height: ${SCROLLER_HEIGHT}px; overflow-y: auto; position: relative"
      class="scroller"
    >
      <cmn-list-section [card]="false" heading="Today">
        @for (n of alerts; track n) {
          <cmn-alert-item [title]="'Alert ' + n" message="Something needs a look" />
        }
      </cmn-list-section>
    </div>
  `,
})
class HostComponent {
  protected readonly alerts = ALERTS;
}

describe('AlertItemComponent stacking under a sticky list-section heading', () => {
  let fixture: ComponentFixture<HostComponent>;
  let style: HTMLStyleElement;

  beforeEach(async () => {
    style = document.createElement('style');
    style.textContent = UTILITY_RULES;
    document.head.append(style);

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    style.remove();
  });

  it('paints the heading over a dismiss button scrolled beneath it', () => {
    const host = fixture.nativeElement as HTMLElement;
    const scroller = host.querySelector('.scroller') as HTMLElement;
    const heading = host.querySelector('h2') as HTMLElement;
    const dismiss = host.querySelector('button[aria-label="Dismiss"]') as HTMLElement;

    // Scroll until the first dismiss button straddles the sticky heading's bottom edge. The
    // heading's position only settles once the list has scrolled, so the offset is read after it.
    const centre = () => {
      const rect = dismiss.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      scroller.scrollTop += centre() - (heading.getBoundingClientRect().bottom - OVERLAP);
    }

    const headingBottom = heading.getBoundingClientRect().bottom;
    const button = dismiss.getBoundingClientRect();
    const probeY = headingBottom - 1;
    expect(button.top).toBeLessThan(probeY);
    expect(button.bottom).toBeGreaterThan(probeY);

    const painted = document.elementFromPoint(button.left + button.width / 2, probeY);
    expect(painted).not.toBeNull();
    expect(heading.contains(painted)).toBe(true);
  });
});
