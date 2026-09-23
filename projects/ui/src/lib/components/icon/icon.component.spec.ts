import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {CmnIconRegistry} from '../../services/icon-registry/icon-registry.service';
import {IconComponent, type IconSize} from './icon.component';

const CUSTOM_SVG = '<svg viewBox="0 0 16 16"><rect width="16" height="16" /></svg>';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;
  let registry: CmnIconRegistry;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    registry = TestBed.inject(CmnIconRegistry);
    fixture = TestBed.createComponent(IconComponent);
  });

  it.each<[IconSize, number]>([
    ['sm', 16],
    ['md', 20],
    ['lg', 24],
  ])('maps size "%s" to %ipx', (size, px) => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    expect(fixture.componentInstance.resolvedSize()).toBe(px);
  });

  it('recognises a lucide name and renders the lucide element', () => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();
    expect(fixture.componentInstance.isLucide()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon')).not.toBeNull();
  });

  it('does not treat an unknown name as lucide', () => {
    fixture.componentRef.setInput('name', 'definitely-not-a-lucide-icon');
    fixture.detectChanges();
    expect(fixture.componentInstance.isLucide()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.cmn-icon-custom')).toBeNull();
  });

  it('prefers a registered custom SVG over the lucide set', () => {
    registry.registerInline('Bell', CUSTOM_SVG);
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();

    const custom = (fixture.nativeElement as HTMLElement).querySelector('.cmn-icon-custom');
    expect(custom).not.toBeNull();
    expect(custom?.innerHTML).toContain('<rect');
    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon')).toBeNull();
  });

  it('renders a registered custom SVG for a non-lucide name', () => {
    registry.registerInline('brand-mark', CUSTOM_SVG);
    fixture.componentRef.setInput('name', 'brand-mark');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.cmn-icon-custom')).not.toBeNull();
  });

  it('hides a label-less icon from assistive tech', () => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('lucide-icon');
    expect(el?.getAttribute('aria-hidden')).toBe('true');
    expect(el?.getAttribute('aria-label')).toBeNull();
  });

  it('exposes a labelled icon to assistive tech instead of hiding it', () => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.componentRef.setInput('ariaLabel', 'Notifications');
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('lucide-icon');
    expect(el?.getAttribute('aria-hidden')).toBeNull();
    expect(el?.getAttribute('aria-label')).toBe('Notifications');
  });

  it('sizes and colors a custom SVG the same way as a lucide one', () => {
    registry.registerInline('brand-mark', CUSTOM_SVG);
    fixture.componentRef.setInput('name', 'brand-mark');
    fixture.componentRef.setInput('size', 'lg');
    fixture.componentRef.setInput('color', 'rgb(1, 2, 3)');
    fixture.detectChanges();

    const custom = (fixture.nativeElement as HTMLElement).querySelector(
      '.cmn-icon-custom'
    ) as HTMLElement;
    expect(custom.style.width).toBe('24px');
    expect(custom.style.height).toBe('24px');
    expect(custom.style.color).toBe('rgb(1, 2, 3)');
  });
});
