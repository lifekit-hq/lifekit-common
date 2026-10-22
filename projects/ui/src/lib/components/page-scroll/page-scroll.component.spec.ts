import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {PageScrollComponent} from './page-scroll.component';

describe('PageScrollComponent', () => {
  let fixture: ComponentFixture<PageScrollComponent>;

  const host = (): HTMLElement => fixture.nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [PageScrollComponent]}).compileComponents();
    fixture = TestBed.createComponent(PageScrollComponent);
    fixture.detectChanges();
  });

  it('should take the remaining height and be the one scroller', () => {
    for (const cls of ['flex', 'flex-col', 'min-h-0', 'flex-1', 'overflow-y-auto']) {
      expect(host().classList).toContain(cls);
    }
  });

  it('should be reachable by keyboard so its content scrolls without a pointer', () => {
    expect(host().getAttribute('tabindex')).toBe('0');
  });

  it('should be an unnamed plain element until labelled', () => {
    expect(host().hasAttribute('role')).toBe(false);
    expect(host().hasAttribute('aria-label')).toBe(false);
  });

  it('should become a named region when labelled', () => {
    fixture.componentRef.setInput('label', 'Alerts');
    fixture.detectChanges();
    expect(host().getAttribute('role')).toBe('region');
    expect(host().getAttribute('aria-label')).toBe('Alerts');
  });
});
