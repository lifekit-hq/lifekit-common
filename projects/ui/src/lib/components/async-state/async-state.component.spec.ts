import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  AsyncStateComponent,
  type AsyncStateErrorPlacement,
  type AsyncStateStatus,
} from './async-state.component';

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
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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

  it('shows content, not the empty message, before the first load settles', () => {
    host.isEmpty.set(true);
    fixture.detectChanges();
    expect(projected()).not.toBeNull();
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

@Component({
  imports: [AsyncStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-async-state
      [status]="status()"
      [errorMessage]="errorMessage()"
      [errorPlacement]="errorPlacement()"
      [isEmpty]="isEmpty()"
    >
      <div class="row-skeleton" skeleton>Row-shaped skeleton</div>
      <div class="rich-empty" empty>
        <button (click)="connects = connects + 1" class="cta" type="button">Connect</button>
      </div>
      <button (click)="retries = retries + 1" class="retry" type="button" error-action>
        Retry
      </button>
      <p class="projected">Loaded content</p>
    </cmn-async-state>
  `,
})
class SlottedHostComponent {
  public readonly status = signal<AsyncStateStatus>('idle');
  public readonly errorMessage = signal('');
  public readonly errorPlacement = signal<AsyncStateErrorPlacement>('replace');
  public readonly isEmpty = signal(false);
  public retries = 0;
  public connects = 0;
}

describe('AsyncStateComponent slots', () => {
  let fixture: ComponentFixture<SlottedHostComponent>;
  let host: SlottedHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SlottedHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(SlottedHostComponent);
    host = fixture.componentInstance;
  });

  function query(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  function render(status: AsyncStateStatus, patch: Partial<{isEmpty: boolean}> = {}): void {
    host.status.set(status);
    host.isEmpty.set(patch.isEmpty ?? false);
    fixture.detectChanges();
  }

  it('renders the projected skeleton instead of the default bars while loading', () => {
    render('loading');
    expect(query('.row-skeleton')).not.toBeNull();
    expect(query('cmn-skeleton')).toBeNull();
    expect(query('.projected')).toBeNull();
  });

  it('keeps every slot out of the content state', () => {
    render('success');
    expect(query('.projected')).not.toBeNull();
    expect(query('.row-skeleton')).toBeNull();
    expect(query('.rich-empty')).toBeNull();
    expect(query('.retry')).toBeNull();
  });

  it('renders the projected empty state, not the default line, on an empty success', () => {
    render('success', {isEmpty: true});
    expect(query('.rich-empty')).not.toBeNull();
    expect(query('.projected')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('No data available.');
  });

  it('wires the empty-state call to action to the caller', () => {
    render('success', {isEmpty: true});
    query('.cta')?.click();
    expect(host.connects).toBe(1);
  });

  it('never shows the projected empty state while loading', () => {
    render('loading', {isEmpty: true});
    expect(query('.rich-empty')).toBeNull();
  });

  it('renders the error action inside the error alert and wires it to the caller', () => {
    host.errorMessage.set('Could not load accounts');
    render('error');

    const retry = query('cmn-alert .retry');
    expect(retry).not.toBeNull();
    expect(query('cmn-alert')?.textContent).toContain('Could not load accounts');
    retry?.click();
    expect(host.retries).toBe(1);
  });

  it('replaces the content with the alert by default', () => {
    render('error');
    expect(query('cmn-alert')).not.toBeNull();
    expect(query('.projected')).toBeNull();
    expect(query('cmn-alert')?.className).toBe('');
  });

  it('keeps the content under a persistent banner when the error sits above', () => {
    host.errorPlacement.set('above');
    render('error');

    const alertEl = query('cmn-alert');
    expect(alertEl?.classList.contains('mb-cmn-6')).toBe(true);
    expect(alertEl?.classList.contains('block')).toBe(true);
    const content = query('.projected') as HTMLElement;
    expect(
      (alertEl as HTMLElement).compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows the banner alone, not an empty state, when a failed refresh has no data', () => {
    host.errorPlacement.set('above');
    render('error', {isEmpty: true});
    expect(query('cmn-alert')).not.toBeNull();
    expect(query('.rich-empty')).toBeNull();
    expect(query('.projected')).toBeNull();
  });

  it('re-projects the content after a banner clears', () => {
    host.errorPlacement.set('above');
    render('error');
    render('loading');
    render('success');
    expect(query('.projected')).not.toBeNull();
    expect(query('cmn-alert')).toBeNull();
  });
});

@Component({
  imports: [AsyncStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-async-state
      [status]="status()"
      [errorMessage]="errorMessage()"
      [errorPlacement]="errorPlacement()"
      [isEmpty]="isEmpty()"
      [offline]="offline()"
      [lastSynced]="lastSynced()"
      [retryable]="retryable()"
      [emptySubMessage]="emptySubMessage()"
      (retry)="retries = retries + 1"
    >
      <p class="projected">Loaded content</p>
    </cmn-async-state>
  `,
})
class StatePatternHostComponent {
  public readonly status = signal<AsyncStateStatus>('idle');
  public readonly errorMessage = signal('');
  public readonly errorPlacement = signal<AsyncStateErrorPlacement>('replace');
  public readonly isEmpty = signal(false);
  public readonly offline = signal(false);
  public readonly lastSynced = signal<Date | number | string | null>(null);
  public readonly retryable = signal(false);
  public readonly emptySubMessage = signal<string | null>(null);
  public retries = 0;
}

describe('AsyncStateComponent state pattern', () => {
  let fixture: ComponentFixture<StatePatternHostComponent>;
  let host: StatePatternHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatePatternHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(StatePatternHostComponent);
    host = fixture.componentInstance;
  });

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => root().textContent ?? '';
  const query = (selector: string): HTMLElement | null => root().querySelector(selector);

  function render(status: AsyncStateStatus, patch: Partial<{isEmpty: boolean}> = {}): void {
    host.status.set(status);
    host.isEmpty.set(patch.isEmpty ?? false);
    fixture.detectChanges();
  }

  function retryButton(): HTMLButtonElement | null {
    return root().querySelector('button');
  }

  describe('retry', () => {
    it('has no built-in Retry unless the page opts in', () => {
      render('error');
      expect(retryButton()).toBeNull();
    });

    it('emits retry from a Retry button inside the error alert', () => {
      host.retryable.set(true);
      render('error');

      const button = query('[role="alert"] button');
      expect(button?.textContent?.trim()).toBe('Retry');
      button?.click();
      expect(host.retries).toBe(1);
    });

    it('keeps the Retry button reachable by keyboard and at a touch-sized target', () => {
      host.retryable.set(true);
      render('error');

      const button = retryButton();
      expect(button?.type).toBe('button');
      expect(button?.tabIndex).toBe(0);
      expect(button?.disabled).toBe(false);
      expect(button?.classList.contains('min-h-cmn-touch')).toBe(true);
    });

    it('does not render Retry in the content state', () => {
      host.retryable.set(true);
      render('success');
      expect(retryButton()).toBeNull();
    });
  });

  describe('error is never empty', () => {
    it('shows the error, not the empty message, when a failed load has no data', () => {
      host.errorPlacement.set('above');
      render('error', {isEmpty: true});

      expect(query('[role="alert"]')).not.toBeNull();
      expect(text()).not.toContain('No data available.');
    });

    it('replaces an empty region with the alert on a failed first load', () => {
      render('error', {isEmpty: true});
      expect(query('[role="alert"]')).not.toBeNull();
      expect(text()).not.toContain('No data available.');
      expect(query('.projected')).toBeNull();
    });
  });

  describe('offline', () => {
    it('shows an offline panel with the last sync time, not the empty message, when empty', () => {
      host.offline.set(true);
      host.lastSynced.set(new Date());
      render('success', {isEmpty: true});

      const panel = query('[role="status"]');
      expect(panel?.textContent).toContain("You're offline");
      expect(panel?.textContent).toContain('Last synced');
      expect(text()).not.toContain('No data available.');
      expect(query('.projected')).toBeNull();
    });

    it('shows the offline panel, not the error alert, when the first load failed offline', () => {
      host.offline.set(true);
      host.lastSynced.set(new Date());
      render('error');

      expect(query('[role="alert"]')).toBeNull();
      expect(query('[role="status"]')?.textContent).toContain("You're offline");
      expect(query('.projected')).toBeNull();
    });

    it('shows the offline panel when an error banner would sit above an empty region', () => {
      host.offline.set(true);
      host.errorPlacement.set('above');
      render('error', {isEmpty: true});

      expect(query('[role="alert"]')).toBeNull();
      expect(query('[role="status"]')?.textContent).toContain("You're offline");
      expect(text()).not.toContain('No data available.');
    });

    it('keeps the content under an offline banner when there is something to show', () => {
      host.offline.set(true);
      host.lastSynced.set(new Date());
      render('success');

      const banner = query('cmn-alert');
      expect(banner?.textContent).toContain("You're offline");
      expect(banner?.textContent).toContain('Last synced');
      expect(banner?.querySelector('[role="status"]')).not.toBeNull();
      expect(query('.projected')).not.toBeNull();
    });

    it('keeps the content under the offline banner when a refresh failed above it', () => {
      host.offline.set(true);
      host.errorPlacement.set('above');
      render('error');

      expect(query('[role="alert"]')).toBeNull();
      expect(query('cmn-alert')?.textContent).toContain("You're offline");
      expect(query('.projected')).not.toBeNull();
    });

    it('keeps showing the skeleton while loading, under the offline banner', () => {
      host.offline.set(true);
      render('loading');

      expect(query('cmn-alert')?.textContent).toContain("You're offline");
      expect(query('cmn-skeleton')).not.toBeNull();
    });

    it('reads "Not synced yet" when the region never synced', () => {
      host.offline.set(true);
      render('error');
      expect(text()).toContain('Not synced yet');
    });

    it('treats an unparseable sync time as never synced', () => {
      host.offline.set(true);
      host.lastSynced.set('not a date');
      render('error');
      expect(text()).toContain('Not synced yet');
    });

    it('adds the date when the last sync was not today', () => {
      host.offline.set(true);
      host.lastSynced.set(new Date(2020, 0, 15, 9, 30));
      render('error');
      expect(text()).toMatch(/Last synced .*2020/);
    });

    it('accepts epoch milliseconds and ISO strings', () => {
      host.offline.set(true);
      host.lastSynced.set(Date.now());
      render('error');
      expect(text()).toContain('Last synced');

      host.lastSynced.set(new Date().toISOString());
      fixture.detectChanges();
      expect(text()).toContain('Last synced');
    });

    it('offers Retry on the offline panel and on the banner', () => {
      host.offline.set(true);
      host.retryable.set(true);
      render('error');
      retryButton()?.click();
      expect(host.retries).toBe(1);

      render('success');
      expect(query('cmn-alert button')).not.toBeNull();
      query('cmn-alert button')?.click();
      expect(host.retries).toBe(2);
    });

    it('goes back to the content when the device comes back online', () => {
      host.offline.set(true);
      render('success', {isEmpty: false});
      host.offline.set(false);
      fixture.detectChanges();

      expect(query('cmn-alert')).toBeNull();
      expect(query('.projected')).not.toBeNull();
    });
  });

  describe('loading', () => {
    it('announces loading to assistive tech without adding visible text', () => {
      render('loading');
      const status = query('[role="status"]');
      expect(status?.textContent?.trim()).toBe('Loading');
      expect(status?.classList.contains('sr-only')).toBe(true);
    });

    it('is not announced when idle or loaded', () => {
      render('success');
      expect(query('[role="status"]')).toBeNull();
    });
  });

  describe('empty', () => {
    it('renders the default empty message through the shared empty state', () => {
      render('success', {isEmpty: true});
      expect(query('cmn-empty-state')?.textContent).toContain('No data available.');
    });

    it('passes a sub-message to the empty state', () => {
      host.emptySubMessage.set('Add a transaction to get started.');
      render('success', {isEmpty: true});
      expect(query('cmn-empty-state')?.textContent).toContain('Add a transaction to get started.');
    });
  });
});
