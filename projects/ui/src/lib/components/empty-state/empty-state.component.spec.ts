import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {EmptyStateComponent} from './empty-state.component';

describe('EmptyStateComponent — inputs', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'Nothing here yet.');
    fixture.componentRef.setInput('subMessage', 'Connect an account first.');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the message text', () => {
    const p: HTMLElement | null = fixture.nativeElement.querySelector('p');
    expect(p?.textContent?.trim()).toBe('Nothing here yet.');
  });

  it('should reject a blank body instead of rendering an empty paragraph', () => {
    expect(() => {
      fixture.componentRef.setInput('subMessage', '  ');
    }).toThrow(/non-empty body/);
  });

  it('should render the body as a second paragraph', () => {
    const paragraphs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[1].textContent?.trim()).toBe('Connect an account first.');
  });

  it('should not render an icon element when icon is null', () => {
    const icon = fixture.nativeElement.querySelector('cmn-icon, lucide-icon');
    expect(icon).toBeNull();
  });

  it('should render an icon element when icon input is provided', () => {
    fixture.componentRef.setInput('icon', 'CheckCircle2');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('cmn-icon');
    expect(icon).toBeTruthy();
  });

  it('should apply iconClass to the icon element', () => {
    fixture.componentRef.setInput('icon', 'CheckCircle2');
    fixture.componentRef.setInput('iconClass', 'text-status-success');
    fixture.detectChanges();
    const icon: HTMLElement | null = fixture.nativeElement.querySelector('cmn-icon');
    expect(icon?.className).toContain('text-status-success');
  });

  it('should span its column without a box in the card variant', () => {
    const host: HTMLElement = fixture.nativeElement;
    const body: HTMLElement = host.querySelector('div') as HTMLElement;
    expect(host.className).toContain('w-full');
    expect(body.className).toContain('px-cmn-6');
    expect(body.className).not.toContain('border');
    expect(body.className).not.toContain('bg-surface-card');
  });

  it('should render a compact body in the bare variant', () => {
    fixture.componentRef.setInput('variant', 'bare');
    fixture.detectChanges();
    const body: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(body.className).toContain('py-cmn-6');
    expect(body.className).not.toContain('py-cmn-12');
  });

  it('should not render action buttons by default', () => {
    expect(fixture.nativeElement.querySelector('cmn-button')).toBeNull();
  });

  it('should render the primary action and emit action on click', () => {
    let emitted = 0;
    fixture.componentInstance.action.subscribe(() => emitted++);
    fixture.componentRef.setInput('actionLabel', 'Clear filter');
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent?.trim()).toBe('Clear filter');
    buttons[0].click();
    expect(emitted).toBe(1);
  });

  it('should render the secondary action after the primary and emit secondaryAction', () => {
    let emitted = 0;
    fixture.componentInstance.secondaryAction.subscribe(() => emitted++);
    fixture.componentRef.setInput('actionLabel', 'Clear filter');
    fixture.componentRef.setInput('secondaryLabel', 'Show all time');
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('button');
    expect(Array.from(buttons).map(b => b.textContent?.trim())).toEqual([
      'Clear filter',
      'Show all time',
    ]);
    buttons[1].click();
    expect(emitted).toBe(1);
  });

  it('should keep a long unbroken title inside the column', () => {
    fixture.componentRef.setInput('message', 'x'.repeat(200));
    fixture.detectChanges();
    const p: HTMLElement = fixture.nativeElement.querySelector('p');
    expect(p.className).toContain('break-words');
  });

  it('should default to the first-use kind with no live region', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-kind')).toBe('first-use');
    expect(host.querySelector('div')?.hasAttribute('role')).toBe(false);
  });

  it('should announce the no-results kind politely as a status', () => {
    fixture.componentRef.setInput('kind', 'no-results');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-kind')).toBe('no-results');
    expect(host.querySelector('div')?.getAttribute('role')).toBe('status');
  });

  it('should announce the error kind as an alert and tint its icon', () => {
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('icon', 'CircleAlert');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-kind')).toBe('error');
    expect(host.querySelector('div')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('cmn-icon')?.className).toContain('text-status-error');
  });

  it('should let iconClass override the error tint', () => {
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('icon', 'CircleAlert');
    fixture.componentRef.setInput('iconClass', 'text-status-warning');
    fixture.detectChanges();
    const icon: HTMLElement | null = fixture.nativeElement.querySelector('cmn-icon');
    expect(icon?.className).toContain('text-status-warning');
    expect(icon?.className).not.toContain('text-status-error');
  });

  it('should not tint the icon outside the error kind', () => {
    fixture.componentRef.setInput('kind', 'no-results');
    fixture.componentRef.setInput('icon', 'Search');
    fixture.detectChanges();
    const icon: HTMLElement | null = fixture.nativeElement.querySelector('cmn-icon');
    expect(icon?.className).not.toContain('text-status-error');
  });

  it('should render icon in card variant', () => {
    fixture.componentRef.setInput('icon', 'AlertCircle');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('cmn-icon');
    expect(icon).toBeTruthy();
  });

  it('should render icon identically in bare variant', () => {
    fixture.componentRef.setInput('variant', 'bare');
    fixture.componentRef.setInput('icon', 'AlertCircle');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('cmn-icon');
    expect(icon).toBeTruthy();
  });
});

@Component({
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-empty-state message="No items found" subMessage="Connect an account to start.">
      <button cta data-testid="cta-button" type="button">Connect Now</button>
    </cmn-empty-state>
  `,
})
class EmptyStateCtaHostComponent {}

describe('EmptyStateComponent — CTA slot projection', () => {
  let fixture: ComponentFixture<EmptyStateCtaHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateCtaHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateCtaHostComponent);
    fixture.detectChanges();
  });

  it('should project CTA slot content into the body', () => {
    const cta: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="cta-button"]'
    );
    expect(cta).toBeTruthy();
    expect(cta?.textContent?.trim()).toBe('Connect Now');
  });

  it('should render CTA content inside the empty-state wrapper', () => {
    const emptyState: HTMLElement | null = fixture.nativeElement.querySelector('cmn-empty-state');
    const cta: HTMLElement | null = emptyState?.querySelector('[data-testid="cta-button"]') ?? null;
    expect(cta).toBeTruthy();
  });
});

@Component({
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-empty-state
      message="No items found"
      subMessage="Connect an account to start."
      variant="bare"
    >
      <button cta data-testid="bare-cta" type="button">Action</button>
    </cmn-empty-state>
  `,
})
class EmptyStateBareCtaHostComponent {}

describe('EmptyStateComponent — CTA slot projection in bare variant', () => {
  let fixture: ComponentFixture<EmptyStateBareCtaHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateBareCtaHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateBareCtaHostComponent);
    fixture.detectChanges();
  });

  it('should project CTA slot content in bare variant', () => {
    const cta: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="bare-cta"]');
    expect(cta).toBeTruthy();
    expect(cta?.textContent?.trim()).toBe('Action');
  });
});

@Component({
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-empty-state message="No items found" subMessage="Connect an account to start.">
      <button secondary data-testid="secondary" type="button">Widen period</button>
    </cmn-empty-state>
  `,
})
class EmptyStateSecondaryHostComponent {}

describe('EmptyStateComponent — secondary slot projection', () => {
  it('should project the secondary slot', async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateSecondaryHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(EmptyStateSecondaryHostComponent);
    fixture.detectChanges();
    const el: HTMLElement | null = fixture.nativeElement.querySelector(
      'cmn-empty-state [data-testid="secondary"]'
    );
    expect(el?.textContent?.trim()).toBe('Widen period');
  });
});
