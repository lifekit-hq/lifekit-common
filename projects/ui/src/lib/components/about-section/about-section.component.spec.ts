import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {provideWhatsNew, type WhatsNewStorage} from '../whats-new/whats-new.config';
import {WHATS_NEW_FIXTURE} from '../whats-new/whats-new.fixtures';
import {CmnWhatsNewService} from '../whats-new/whats-new.service';
import {AboutSectionComponent} from './about-section.component';

function storage(seen: string): WhatsNewStorage {
  const items: Record<string, string> = {k: seen};
  return {getItem: key => items[key] ?? null, setItem: (key, value) => void (items[key] = value)};
}

function create(): ComponentFixture<AboutSectionComponent> {
  const fixture = TestBed.createComponent(AboutSectionComponent);
  fixture.detectChanges();
  return fixture;
}

function el(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('AboutSectionComponent', () => {
  describe("without What's new", () => {
    beforeEach(() => TestBed.configureTestingModule({imports: [AboutSectionComponent]}));

    it("shows the version it is given and no What's new button", () => {
      const fixture = TestBed.createComponent(AboutSectionComponent);
      fixture.componentRef.setInput('version', '3.2.0');
      fixture.detectChanges();
      expect(el(fixture).textContent).toContain('3.2.0');
      expect(el(fixture).querySelector('button')).toBeNull();
    });
  });

  describe("with What's new", () => {
    beforeEach(() =>
      TestBed.configureTestingModule({
        imports: [AboutSectionComponent],
        providers: [
          provideWhatsNew({
            version: '4.5.0',
            storage: storage('4.4.2'),
            storageKey: 'k',
            load: () => Promise.resolve(WHATS_NEW_FIXTURE),
          }),
        ],
      })
    );

    it('shows the running version', () => {
      expect(el(create()).textContent).toContain('4.5.0');
    });

    it('lets an explicit version win', () => {
      const fixture = TestBed.createComponent(AboutSectionComponent);
      fixture.componentRef.setInput('version', '9.9.9');
      fixture.detectChanges();
      expect(el(fixture).textContent).toContain('9.9.9');
    });

    it("opens the sheet from the What's new button", () => {
      const fixture = create();
      const service = TestBed.inject(CmnWhatsNewService);
      let opened = 0;
      service.open = () => (opened++, undefined as never);
      el(fixture).querySelector<HTMLButtonElement>('cmn-button button')?.click();
      expect(opened).toBe(1);
      expect(el(fixture).textContent).toContain("What's new");
    });
  });
});
