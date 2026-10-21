import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ChangeDetectionStrategy, Component, LOCALE_ID, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {type AsyncStateStatus} from '../async-state/async-state.component';
import {
  AllocationBarComponent,
  type AllocationSegment,
  type AllocationSegmentClick,
} from './allocation-bar.component';

const SEGMENTS: AllocationSegment[] = [
  {label: 'Investments', value: 6200, color: 'var(--color-asset-equity)'},
  {label: 'Cash', value: 3000, color: 'var(--color-asset-cash)'},
  {label: 'Crypto', value: 800, color: 'var(--color-asset-crypto)'},
];

const PROVIDERS = [provideHttpClient(withXhr()), provideHttpClientTesting()];

/** Each legend row's readouts (label, percent, amount), space-joined. */
function rows(root: HTMLElement): string[] {
  return [...root.querySelectorAll('li')].map(li =>
    [...li.querySelectorAll('span')]
      .map(span => span.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
  );
}

function bar(root: HTMLElement): HTMLElement {
  const el = root.querySelector<HTMLElement>('[data-testid="allocation-bar"]');
  if (!el) {
    throw new Error('allocation bar not rendered');
  }
  return el;
}

describe('AllocationBarComponent', () => {
  let fixture: ComponentFixture<AllocationBarComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllocationBarComponent],
      providers: PROVIDERS,
    }).compileComponents();
    fixture = TestBed.createComponent(AllocationBarComponent);
    fixture.componentRef.setInput('segments', SEGMENTS);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('lists each segment as label, percent and amount', () => {
    expect(rows(root)).toEqual([
      'Investments 62% $6,200.00',
      'Cash 30% $3,000.00',
      'Crypto 8% $800.00',
    ]);
  });

  it('sizes each bar segment by its share and paints it in its colour', () => {
    const parts = [...bar(root).children] as HTMLElement[];
    const grows = parts.map(p => Number(p.style.flexGrow));
    expect(grows[0]).toBeCloseTo(62);
    expect(grows[1]).toBeCloseTo(30);
    expect(grows[2]).toBeCloseTo(8);
    expect(parts[1].style.backgroundColor).toBe('var(--color-asset-cash)');
  });

  it('fills the bar when the values total less than one', () => {
    fixture.componentRef.setInput('segments', [
      {label: 'Cash', value: 0.3},
      {label: 'Crypto', value: 0.2},
    ]);
    fixture.detectChanges();
    const grows = ([...bar(root).children] as HTMLElement[]).map(p => Number(p.style.flexGrow));
    expect(grows[0] + grows[1]).toBeGreaterThanOrEqual(1);
    expect(grows[0] / grows[1]).toBeCloseTo(1.5);
  });

  it('names the bar with every segment and its share', () => {
    fixture.componentRef.setInput('label', 'Where it is');
    fixture.detectChanges();
    expect(bar(root).getAttribute('role')).toBe('img');
    expect(bar(root).getAttribute('aria-label')).toBe(
      'Where it is: Investments 62%, Cash 30%, Crypto 8%'
    );
    expect(root.querySelector('ul')?.getAttribute('aria-label')).toBe('Where it is');
  });

  it('falls back to the categorical chart series when a segment has no colour', () => {
    fixture.componentRef.setInput('segments', [
      {label: 'A', value: 1},
      {label: 'B', value: 1},
    ]);
    fixture.detectChanges();
    const colours = ([...bar(root).children] as HTMLElement[]).map(p => p.style.backgroundColor);
    expect(colours[0]).toBe('var(--color-chart-series-1)');
    expect(colours[1]).toMatch(/^var\(--color-chart-series-\d\)$/);
    expect(colours[1]).not.toBe(colours[0]);
  });

  it('keeps a sliver under 1% readable instead of rounding it to 0%', () => {
    fixture.componentRef.setInput('segments', [
      {label: 'Investments', value: 9960},
      {label: 'Crypto', value: 40},
    ]);
    fixture.detectChanges();
    expect(rows(root)[1]).toContain('0.4%');
  });

  it('formats money in the given currency with the narrow symbol', () => {
    fixture.componentRef.setInput('currency', 'UAH');
    fixture.detectChanges();
    expect(rows(root)[0]).toContain('₴6,200.00');
  });

  it('draws only positive segments and keeps their input index', () => {
    fixture.componentRef.setInput('segments', [
      {label: 'Debt', value: -500},
      {label: 'Cash', value: 300},
      {label: 'Empty', value: 0},
    ]);
    fixture.detectChanges();
    expect(rows(root)).toEqual(['Cash 100% $300.00']);
    expect(bar(root).children).toHaveLength(1);
    // Colour follows the input position, so a segment keeps it when a neighbour drops out.
    expect((bar(root).children[0] as HTMLElement).style.backgroundColor).not.toBe(
      'var(--color-chart-series-1)'
    );
  });

  it('shows the empty state when nothing is positive', () => {
    fixture.componentRef.setInput('segments', [{label: 'Cash', value: 0}]);
    fixture.componentRef.setInput('emptyMessage', 'No holdings yet');
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="allocation-bar"]')).toBeNull();
    expect(root.textContent).toContain('No holdings yet');
  });

  it('shows the error in place of the bar when a first load fails', () => {
    fixture.componentRef.setInput('segments', []);
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('errorMessage', 'Could not load balances');
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="allocation-bar"]')).toBeNull();
    expect(root.textContent).toContain('Could not load balances');
  });

  it('keeps the bar under the error banner when a refresh fails', () => {
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('errorMessage', 'Could not refresh');
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="allocation-bar"]')).toBeTruthy();
    expect(root.textContent).toContain('Could not refresh');
  });

  it('renders the legend as plain text when segmentClick is unbound', () => {
    expect(root.querySelector('button')).toBeNull();
  });
});

@Component({
  imports: [AllocationBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-allocation-bar
      [segments]="segments()"
      [status]="status()"
      (retry)="retries = retries + 1"
      (segmentClick)="clicks.push($event)"
      retryable
    />
  `,
})
class BoundHostComponent {
  public readonly segments = signal<AllocationSegment[]>(SEGMENTS);
  public readonly status = signal<AsyncStateStatus>('success');
  public readonly clicks: AllocationSegmentClick[] = [];
  public retries = 0;
}

describe('AllocationBarComponent with outputs bound', () => {
  let fixture: ComponentFixture<BoundHostComponent>;
  let host: BoundHostComponent;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoundHostComponent],
      providers: PROVIDERS,
    }).compileComponents();
    fixture = TestBed.createComponent(BoundHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('turns each legend row into a touch-sized button that emits its segment', () => {
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('li > button')];
    expect(buttons).toHaveLength(3);
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].classList).toContain('min-h-cmn-touch');
    expect(buttons[1].getAttribute('aria-label')).toBe('Cash, 30%, $3,000.00');
    buttons[1].click();
    expect(host.clicks).toEqual([{index: 1, label: 'Cash', value: 3000}]);
  });

  it('emits the input index of a segment drawn after a dropped one', () => {
    host.segments.set([
      {label: 'Empty', value: 0},
      {label: 'Cash', value: 300},
    ]);
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('li > button')?.click();
    expect(host.clicks).toEqual([{index: 1, label: 'Cash', value: 300}]);
  });

  it('offers Retry on an error and emits retry', () => {
    host.status.set('error');
    fixture.detectChanges();
    const retry = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Retry');
    retry?.click();
    expect(host.retries).toBe(1);
  });

  it('holds the skeleton back for a fast first load, then shows one shaped like the bar', async () => {
    vi.useFakeTimers();
    const first = TestBed.createComponent(BoundHostComponent);
    first.componentInstance.segments.set([]);
    first.componentInstance.status.set('loading');
    first.detectChanges();
    const el: HTMLElement = first.nativeElement;
    expect(el.querySelector('.cmn-skeleton-sweep')).toBeNull();

    await vi.advanceTimersByTimeAsync(200);
    first.detectChanges();
    // One bar plus three legend rows of swatch, label and amount.
    expect(el.querySelectorAll('.cmn-skeleton-sweep')).toHaveLength(10);
    expect(el.querySelector('[data-testid="allocation-bar"]')).toBeNull();
  });

  it('keeps the bar on screen while a refresh loads', async () => {
    vi.useFakeTimers();
    host.status.set('loading');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(200);
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="allocation-bar"]')).toBeTruthy();
    expect(root.querySelector('.cmn-skeleton-sweep')).toBeNull();
  });
});

describe('AllocationBarComponent locale', () => {
  it('formats percent and money with the app LOCALE_ID', async () => {
    await TestBed.configureTestingModule({
      imports: [AllocationBarComponent],
      providers: [...PROVIDERS, {provide: LOCALE_ID, useValue: 'de-DE'}],
    }).compileComponents();
    const fixture = TestBed.createComponent(AllocationBarComponent);
    fixture.componentRef.setInput('segments', [{label: 'Cash', value: 1234.5}]);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).querySelector('li')?.textContent ?? '';
    expect(text.replace(/\s+/g, ' ')).toContain('1.234,50 €');
    expect(text.replace(/\s+/g, ' ')).toContain('100 %');
  });
});
