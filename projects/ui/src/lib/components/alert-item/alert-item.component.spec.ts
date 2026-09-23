import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {AlertItemComponent, type AlertItemSeverity} from './alert-item.component';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('AlertItemComponent', () => {
  let fixture: ComponentFixture<AlertItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertItemComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertItemComponent);
    fixture.componentRef.setInput('title', 'Sync failed');
  });

  function row(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
  }

  function dismissButton(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Dismiss"]');
  }

  function unreadDot(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('span.rounded-full');
  }

  it.each<[AlertItemSeverity, string, string]>([
    ['error', 'var(--color-status-error)', 'CircleAlert'],
    ['warning', 'var(--color-status-warning)', 'TriangleAlert'],
    ['info', 'var(--color-status-info)', 'Info'],
  ])('maps severity "%s" to its color and icon', (severity, color, icon) => {
    fixture.componentRef.setInput('severity', severity);
    fixture.detectChanges();
    expect(fixture.componentInstance.color()).toBe(color);
    expect(fixture.componentInstance.resolvedIcon()).toBe(icon);
  });

  it('lets an explicit icon override the severity default', () => {
    fixture.componentRef.setInput('icon', 'Bell');
    fixture.detectChanges();
    expect(fixture.componentInstance.resolvedIcon()).toBe('Bell');
  });

  it('shows an unread dot and emits read on the first click only', () => {
    let reads = 0;
    fixture.componentInstance.read.subscribe(() => reads++);
    fixture.detectChanges();

    expect(unreadDot()).not.toBeNull();
    row().click();
    expect(reads).toBe(1);

    fixture.componentRef.setInput('isRead', true);
    fixture.detectChanges();
    expect(unreadDot()).toBeNull();

    row().click();
    expect(reads).toBe(1);
  });

  it('dismisses without also marking the item read', () => {
    let reads = 0;
    let dismissals = 0;
    fixture.componentInstance.read.subscribe(() => reads++);
    fixture.componentInstance.dismissed.subscribe(() => dismissals++);
    fixture.detectChanges();

    dismissButton()?.click();
    expect(dismissals).toBe(1);
    expect(reads).toBe(0);
  });

  it('hides the dismiss affordance when dismissible is off', () => {
    fixture.componentRef.setInput('dismissible', false);
    fixture.detectChanges();
    expect(dismissButton()).toBeNull();
  });

  it.each<[number, string]>([
    [30_000, 'just now'],
    [5 * MINUTE, '5m ago'],
    [3 * HOUR, '3h ago'],
    [2 * DAY, '2d ago'],
  ])('formats a timestamp %ims old as "%s"', (ageMs, expected) => {
    fixture.componentRef.setInput('timestamp', new Date(Date.now() - ageMs));
    fixture.detectChanges();
    expect(fixture.componentInstance.relativeTime()).toBe(expected);
  });

  it('accepts an ISO string and a numeric timestamp', () => {
    fixture.componentRef.setInput('timestamp', new Date(Date.now() - 5 * MINUTE).toISOString());
    fixture.detectChanges();
    expect(fixture.componentInstance.relativeTime()).toBe('5m ago');

    fixture.componentRef.setInput('timestamp', Date.now() - 3 * HOUR);
    fixture.detectChanges();
    expect(fixture.componentInstance.relativeTime()).toBe('3h ago');
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['an empty string', ''],
    ['an unparseable string', 'not-a-date'],
  ])('renders no relative time for %s', (_label, value) => {
    fixture.componentRef.setInput('timestamp', value);
    fixture.detectChanges();
    expect(fixture.componentInstance.relativeTime()).toBe('');
  });

  it('renders the optional badge, reference and description slots only when set', () => {
    fixture.componentRef.setInput('message', 'Monobank returned 502.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('cmn-tag')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Monobank returned 502.');

    fixture.componentRef.setInput('badgeLabel', 'error');
    fixture.componentRef.setInput('referenceLabel', 'JOB-14');
    fixture.componentRef.setInput('description', 'Bank sync');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('cmn-tag')?.textContent?.trim()
    ).toBe('error');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('JOB-14');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Bank sync');
  });
});
