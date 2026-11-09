import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {PageComponent} from '../page/page.component';
import {ProseComponent} from './prose.component';

describe('ProseComponent', () => {
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
  class HostComponent {}

  let fixture: ComponentFixture<HostComponent>;
  const prose = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('cmn-prose') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('caps the line at 56ch, which wraps Plex Sans copy under 80 characters', () => {
    // 65ch (`max-w-prose`) wraps the same copy at 82 to 86 characters and fails the line-length aim
    expect(prose().classList).toContain('max-w-[56ch]');
    expect(prose().classList).not.toContain('max-w-prose');
  });

  it('is a block that sets the body copy type, secondary and wrapping long words', () => {
    for (const name of ['block', 'text-cmn-sm', 'text-text-secondary', 'break-words']) {
      expect(prose().classList).toContain(name);
    }
  });

  it('projects its paragraphs and spaces them a line apart, not a section apart', () => {
    expect(prose().querySelectorAll('p')).toHaveLength(2);
    expect(prose().classList).toContain('[&>p+p]:mt-cmn-3');
    expect(prose().classList).not.toContain('gap-cmn-section-gap');
  });

  it('is a top-level block of the page column, so the page sets the gap around it', () => {
    const column = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-cmn-page-column]'
    ) as HTMLElement;
    expect(prose().parentElement).toBe(column);
    expect(column.classList).toContain('gap-cmn-section-gap');
  });
});
