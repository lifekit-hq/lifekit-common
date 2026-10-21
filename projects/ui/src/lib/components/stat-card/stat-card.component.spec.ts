import {LOCALE_ID} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {StatCardComponent} from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Total Wealth');
    fixture.componentRef.setInput('value', '$1,420,892.12');
    fixture.componentRef.setInput('delta', null);
    fixture.componentRef.setInput('deltaLabel', '');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display label and value', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Total Wealth');
    expect(text).toContain('$1,420,892.12');
  });

  it('should show a string value as given', () => {
    fixture.componentRef.setInput('value', 'n/a');
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();
    expect(fixture.componentInstance.displayValue()).toBe('n/a');
  });

  it('should format a numeric amount with a currency as money', () => {
    fixture.componentRef.setInput('value', 1420892.12);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('€1,420,892.12');
  });

  it('should format a numeric value without a currency as a plain number', () => {
    fixture.componentRef.setInput('value', 1234.5);
    fixture.detectChanges();
    expect(fixture.componentInstance.displayValue()).toBe('1,234.5');
  });

  it('should show the empty dash for a missing or non-finite number', () => {
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    expect(fixture.componentInstance.displayValue()).toBe('—');

    fixture.componentRef.setInput('value', Number.NaN);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();
    expect(fixture.componentInstance.displayValue()).toBe('—');
  });

  it('should wrap a value wider than the card instead of hiding digits behind an ellipsis', () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.display = 'block';
    host.style.width = '160px';
    fixture.componentRef.setInput('value', '$12,345,678,901.23');
    fixture.detectChanges();
    const value = host.querySelector<HTMLElement>('.text-cmn-2xl');
    if (!value) {
      throw new Error('value span not rendered');
    }
    expect(value.classList).not.toContain('truncate');
    expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
  });

  it('should show loading skeleton when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const skeleton: HTMLElement | null = fixture.nativeElement.querySelector('.cmn-skeleton-sweep');
    expect(skeleton).toBeTruthy();
  });

  it('should apply success delta class for positive delta', () => {
    fixture.componentRef.setInput('delta', 4.2);
    fixture.componentRef.setInput('deltaLabel', '+4.2%');
    fixture.detectChanges();
    const deltaSpan: HTMLElement | null = fixture.nativeElement.querySelector('.text-gain');
    expect(deltaSpan).toBeTruthy();
  });

  it('should apply error delta class for negative delta', () => {
    fixture.componentRef.setInput('delta', -2.1);
    fixture.componentRef.setInput('deltaLabel', '-2.1%');
    fixture.detectChanges();
    const deltaSpan: HTMLElement | null = fixture.nativeElement.querySelector('.text-loss');
    expect(deltaSpan).toBeTruthy();
  });

  it('should apply neutral delta class for a zero delta, not the success class', () => {
    fixture.componentRef.setInput('delta', 0);
    fixture.componentRef.setInput('deltaLabel', '0.0%');
    fixture.detectChanges();
    const neutral: HTMLElement | null = fixture.nativeElement.querySelector('.text-text-secondary');
    const success: HTMLElement | null = fixture.nativeElement.querySelector('.text-gain');
    expect(neutral).toBeTruthy();
    expect(success).toBeFalsy();
  });

  it('should render a flat glyph for a zero delta, not a trending-up icon', () => {
    fixture.componentRef.setInput('delta', 0);
    fixture.componentRef.setInput('deltaLabel', '0.0%');
    fixture.detectChanges();
    expect(fixture.componentInstance.deltaIcon()).toBe('Minus');
  });

  it('should have every deltaClasses() constant reachable from a rendered state', () => {
    fixture.componentRef.setInput('delta', null);
    fixture.detectChanges();
    let deltaRow: HTMLElement | null = fixture.nativeElement.querySelector(
      '.flex.items-center.gap-1'
    );
    expect(deltaRow).toBeFalsy();

    fixture.componentRef.setInput('delta', 0);
    fixture.detectChanges();
    deltaRow = fixture.nativeElement.querySelector('.text-text-secondary');
    expect(deltaRow).toBeTruthy();

    fixture.componentRef.setInput('delta', 4.2);
    fixture.detectChanges();
    deltaRow = fixture.nativeElement.querySelector('.text-gain');
    expect(deltaRow).toBeTruthy();

    fixture.componentRef.setInput('delta', -4.2);
    fixture.detectChanges();
    deltaRow = fixture.nativeElement.querySelector('.text-loss');
    expect(deltaRow).toBeTruthy();
  });

  it('should size the loading skeleton to the loaded value line height (cmn-2xl: 1.5rem font-size * 1.25 line-height)', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const skeleton: HTMLElement | null = fixture.nativeElement.querySelector('cmn-skeleton > div');
    expect(skeleton?.style.height).toBe('1.875rem');
  });
});

describe('StatCardComponent locale', () => {
  it('should format a numeric value in the app LOCALE_ID', async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
      providers: [{provide: LOCALE_ID, useValue: 'uk-UA'}],
    }).compileComponents();
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Balance');
    fixture.componentRef.setInput('value', 18981.48);
    fixture.componentRef.setInput('currency', 'UAH');
    fixture.detectChanges();
    const plain = fixture.componentInstance.displayValue().replace(/[\u00a0\u202f]/g, ' ');
    expect(plain).toBe('18 981,48 ₴');
  });
});
