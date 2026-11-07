import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {icons, type LucideIcons} from 'lucide-angular';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {provideLucideIcons} from '../../providers/provide-lucide-icons';
import {CmnIconRegistry} from '../../services/icon-registry/icon-registry.service';
import {IconComponent, type IconSize} from './icon.component';
import {CMN_LUCIDE_ICONS} from './lucide-icon-set';

/** An icon the app registers itself; deliberately outside the generated subset. */
const APP_ICONS: LucideIcons = {};
APP_ICONS['Anvil'] = icons.Anvil;

const CUSTOM_SVG = '<svg viewBox="0 0 16 16"><rect width="16" height="16" /></svg>';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;
  let registry: CmnIconRegistry;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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

  it('exposes a labelled icon as an image and hides an unlabelled one', () => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="img"]')).toBeNull();

    fixture.componentRef.setInput('ariaLabel', 'Notifications');
    fixture.detectChanges();
    expect(el.querySelector('[role="img"][aria-label="Notifications"]')).not.toBeNull();
  });

  it('ships a subset of the Lucide map, not the whole of it', () => {
    expect(Object.keys(CMN_LUCIDE_ICONS).length).toBeLessThan(Object.keys(icons).length / 4);
    expect(CMN_LUCIDE_ICONS['Bell']).toBe(icons.Bell);
  });

  it('renders the svg of a subset icon', () => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon svg')).not.toBeNull();
  });

  it('leaves a real Lucide icon outside the subset unrendered instead of throwing', () => {
    expect('Anvil' in CMN_LUCIDE_ICONS).toBe(false);
    expect('Anvil' in icons).toBe(true);
    fixture.componentRef.setInput('name', 'Anvil');
    fixture.detectChanges();
    expect(fixture.componentInstance.isLucide()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon')).toBeNull();
  });
});

describe('IconComponent unregistered-icon warning', () => {
  let fixture: ComponentFixture<IconComponent>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await TestBed.configureTestingModule({
      imports: [IconComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(IconComponent);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('warns once per name, naming the icon, when it is outside the subset and the extras', () => {
    fixture.componentRef.setInput('name', 'Hammer');
    fixture.detectChanges();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"Hammer"');
    expect(warn.mock.calls[0][0]).toContain('provideLucideIcons');
    expect(warn.mock.calls[0][0]).toContain('consumers.json');

    const second = TestBed.createComponent(IconComponent);
    second.componentRef.setInput('name', 'Hammer');
    second.detectChanges();
    expect(warn).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('span')).not.toBeNull();
  });

  it('does not warn for a subset icon', () => {
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn for a name with a registered custom svg', () => {
    TestBed.inject(CmnIconRegistry).registerInline('warn-free-mark', CUSTOM_SVG);
    fixture.componentRef.setInput('name', 'warn-free-mark');
    fixture.detectChanges();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('IconComponent with an app-registered icon', () => {
  it('renders an icon the app added through provideLucideIcons', async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideLucideIcons(APP_ICONS),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'Anvil');
    fixture.detectChanges();

    expect(fixture.componentInstance.isLucide()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon svg')).not.toBeNull();
  });

  it('keeps the library subset when the app registers extras', async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideLucideIcons(APP_ICONS),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'Bell');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('lucide-icon svg')).not.toBeNull();
  });
});
