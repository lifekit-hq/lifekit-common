import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {AlertItemComponent} from './alert-item.component';

/**
 * The unit run loads no stylesheet, so each rule is what the generated utility of the same name
 * resolves to, limited to the ones that place the dismiss button and its pressed box. The
 * `max-md:` variants are written without the media query: this is the phone case.
 */
const UTILITY_RULES = `
  .relative { position: relative; }
  .absolute { position: absolute; }
  .flex { display: flex; }
  .shrink-0 { flex-shrink: 0; }
  .flex-1 { flex: 1 1 0%; }
  .min-w-0 { min-width: 0; }
  .items-start { align-items: flex-start; }
  .p-cmn-1 { padding: 4px; }
  .p-cmn-4 { padding: 16px; }
  .px-cmn-1 { padding-left: 4px; padding-right: 4px; }
  .gap-cmn-3 { gap: 12px; }
  .max-md\\:relative { position: relative; }
  .max-md\\:after\\:absolute::after { position: absolute; content: ''; }
  .max-md\\:after\\:left-1\\/2::after { left: 50%; }
  .max-md\\:after\\:top-1\\/2::after { top: 50%; }
  .max-md\\:after\\:h-cmn-touch::after { height: 44px; }
  .max-md\\:after\\:w-cmn-touch::after { width: 44px; }
  .max-md\\:after\\:-translate-x-1\\/2::after { transform: translate(-50%, -50%); }
  .max-md\\:after\\:-translate-y-1\\/2::after { transform: translate(-50%, -50%); }
  .max-md\\:after\\:\\!left-auto::after { left: auto !important; }
  .max-md\\:after\\:\\!right-0::after { right: 0 !important; }
  .max-md\\:after\\:\\!translate-x-0::after { transform: translate(0, -50%) !important; }
`;

const PHONE_WIDTHS = [375, 390];
const TOUCH = 44;
/** A card's padding is `p-cmn-4`; a flat row's is `px-cmn-1`. */
const DENSITIES = ['card', 'flat'] as const;

@Component({
  imports: [AlertItemComponent],
  template: `
    <div class="scroller" style="overflow-y: auto; overflow-x: auto; height: 400px">
      @for (n of [1, 2, 3]; track n) {
        <cmn-alert-item
          [density]="density"
          [title]="'Alert ' + n"
          message="Something needs a look"
        />
      }
    </div>
  `,
})
class HostComponent {
  public density: 'card' | 'flat' = 'card';
}

describe('AlertItemComponent dismiss hit area on a phone', () => {
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
  });

  afterEach(() => {
    style.remove();
  });

  for (const density of DENSITIES) {
    for (const width of PHONE_WIDTHS) {
      it(`does not scroll the ${density} feed sideways at ${width}px and keeps a ${TOUCH}px target`, () => {
        fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.density = density;
        const host = fixture.nativeElement as HTMLElement;
        host.style.cssText = `display: block; width: ${width}px`;
        document.body.append(host);
        fixture.detectChanges();

        const scroller = host.querySelector('.scroller') as HTMLElement;
        expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);

        const dismiss = host.querySelector('button[aria-label="Dismiss"]') as HTMLElement;
        const after = getComputedStyle(dismiss, '::after');
        expect(parseFloat(after.width)).toBeGreaterThanOrEqual(TOUCH);
        expect(parseFloat(after.height)).toBeGreaterThanOrEqual(TOUCH);
        host.remove();
      });
    }
  }
});
