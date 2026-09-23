import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {AsyncStateComponent, type AsyncStateStatus} from './async-state.component';

@Component({
  imports: [AsyncStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-async-state
      [status]="status()"
      [errorMessage]="errorMessage()"
      [isEmpty]="isEmpty()"
      [emptyMessage]="emptyMessage()"
      [skeletonRows]="skeletonRows()"
      [skeletonHeight]="skeletonHeight()"
    >
      <p class="projected">Loaded content</p>
    </cmn-async-state>
  `,
})
class HostComponent {
  public readonly status = signal<AsyncStateStatus>('idle');
  public readonly errorMessage = signal('');
  public readonly isEmpty = signal(false);
  public readonly emptyMessage = signal('No data available.');
  public readonly skeletonRows = signal(3);
  public readonly skeletonHeight = signal('1.25rem');
}

describe('AsyncStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function projected(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.projected');
  }

  function skeletons(): NodeListOf<Element> {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('cmn-skeleton');
  }

  it('projects content in the idle state — an untouched view shows its own default', () => {
    fixture.detectChanges();
    expect(projected()).not.toBeNull();
    expect(skeletons()).toHaveLength(0);
  });

  it('renders one skeleton per requested row while loading', () => {
    host.status.set('loading');
    fixture.detectChanges();
    expect(skeletons()).toHaveLength(3);
    expect(projected()).toBeNull();
  });

  it('honours a custom row count and height', () => {
    host.status.set('loading');
    host.skeletonRows.set(5);
    host.skeletonHeight.set('3rem');
    fixture.detectChanges();

    expect(skeletons()).toHaveLength(5);
    const bar = (fixture.nativeElement as HTMLElement).querySelector(
      'cmn-skeleton div'
    ) as HTMLElement;
    expect(bar.style.height).toBe('3rem');
  });

  it('shows the error message in an error alert', () => {
    host.status.set('error');
    host.errorMessage.set('Upstream timed out');
    fixture.detectChanges();

    const alertEl = (fixture.nativeElement as HTMLElement).querySelector('cmn-alert');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent).toContain('Upstream timed out');
    expect(projected()).toBeNull();
  });

  it('falls back to a generic message when the error carries none', () => {
    host.status.set('error');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Something went wrong.');
  });

  it('projects content on success', () => {
    host.status.set('success');
    fixture.detectChanges();
    expect(projected()).not.toBeNull();
  });

  it('replaces content with the empty message on an empty success', () => {
    host.status.set('success');
    host.isEmpty.set(true);
    fixture.detectChanges();

    expect(projected()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No data available.');
  });

  it('uses a caller-supplied empty message', () => {
    host.status.set('success');
    host.isEmpty.set(true);
    host.emptyMessage.set('No transactions this month.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No transactions this month.'
    );
  });
});
