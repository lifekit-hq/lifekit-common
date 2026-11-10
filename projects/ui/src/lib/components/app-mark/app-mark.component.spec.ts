import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {provideAppMark} from '../../providers/provide-app-mark';
import {AppMarkComponent} from './app-mark.component';

const DEFAULT_SIZE = 56;
const CUSTOM_SIZE = 32;

describe('AppMarkComponent', () => {
  let fixture: ComponentFixture<AppMarkComponent>;

  function setup(app?: 'bk'): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppMarkComponent],
      providers: app ? [provideAppMark(app, {followSeed: false})] : [],
    });
    fixture = TestBed.createComponent(AppMarkComponent);
  }

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const svg = (): SVGElement => host().querySelector('svg') as SVGElement;

  beforeEach(() => setup());

  afterEach(() => TestBed.resetTestingModule());

  it('draws the mark as inline svg in the accent tokens, so it follows the seed and the theme', () => {
    fixture.detectChanges();
    const markup = svg().outerHTML;
    expect(markup).toContain('fill="var(--color-accent-default)"');
    expect(markup).toContain('var(--color-text-inverse)');
    expect(markup).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it('is 56px square by default and sizes the svg to fill it', () => {
    fixture.detectChanges();
    expect(host().style.width).toBe(`${DEFAULT_SIZE}px`);
    expect(host().style.height).toBe(`${DEFAULT_SIZE}px`);
    expect(svg().getAttribute('width')).toBe('100%');
    expect(svg().getAttribute('height')).toBe('100%');
  });

  it('takes a size', () => {
    fixture.componentRef.setInput('size', CUSTOM_SIZE);
    fixture.detectChanges();
    expect(host().style.width).toBe(`${CUSTOM_SIZE}px`);
  });

  it('draws the lifekit mark until the app sets its own', () => {
    fixture.detectChanges();
    const lk = svg().innerHTML;
    setup('bk');
    fixture.detectChanges();
    expect(svg().innerHTML).not.toBe(lk);
  });

  it('lets one place draw another app’s mark', () => {
    setup('bk');
    fixture.detectChanges();
    const bk = svg().innerHTML;
    fixture.componentRef.setInput('app', 'lk');
    fixture.detectChanges();
    expect(svg().innerHTML).not.toBe(bk);
  });

  it('is hidden from assistive tech without a label', () => {
    fixture.detectChanges();
    expect(host().getAttribute('aria-hidden')).toBe('true');
    expect(host().getAttribute('role')).toBeNull();
    expect(host().getAttribute('aria-label')).toBeNull();
  });

  it('is an image with a name when labelled', () => {
    fixture.componentRef.setInput('label', 'Basket');
    fixture.detectChanges();
    expect(host().getAttribute('role')).toBe('img');
    expect(host().getAttribute('aria-label')).toBe('Basket');
    expect(host().getAttribute('aria-hidden')).toBeNull();
  });

  it('fails loudly for an app that has no mark', () => {
    fixture.componentRef.setInput('app', 'zz');
    expect(() => fixture.detectChanges()).toThrow(/Unknown lifekit app mark "zz"/);
  });
});
