import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {beforeEach, describe, expect, it} from 'vitest';

import {InstitutionAvatarComponent} from '../institution-avatar/institution-avatar.component';
import {DisclosureRowComponent} from './disclosure-row.component';

describe('DisclosureRowComponent', () => {
  let fixture: ComponentFixture<DisclosureRowComponent>;

  const toggleButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
  const bodyEl = (): HTMLElement => {
    const id = toggleButton().getAttribute('aria-controls');
    return fixture.nativeElement.querySelector(`#${id}`);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisclosureRowComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DisclosureRowComponent);
    fixture.componentRef.setInput('label', 'Chase Bank');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have display:block on the host element', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.style.display).toBe('block');
  });

  it('should render the label in the toggle button', () => {
    const toggle: HTMLElement = fixture.nativeElement.querySelector('button');
    expect(toggle.textContent).toContain('Chase Bank');
  });

  it('should not render sublabel by default', () => {
    const lines: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('button .block');
    expect(lines.length).toBe(1);
  });

  it('should render sublabel when provided', () => {
    fixture.componentRef.setInput('sublabel', '3 accounts connected');
    fixture.detectChanges();
    const lines: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('button .block');
    expect(lines.length).toBe(2);
    expect(lines[1].textContent?.trim()).toBe('3 accounts connected');
  });

  it('should not render institution avatar when avatarName is null', () => {
    const avatar = fixture.debugElement.query(By.directive(InstitutionAvatarComponent));
    expect(avatar).toBeNull();
  });

  it('should render institution avatar when avatarName is provided', () => {
    fixture.componentRef.setInput('avatarName', 'Chase Bank');
    fixture.detectChanges();
    const avatar = fixture.debugElement.query(By.directive(InstitutionAvatarComponent));
    expect(avatar).toBeTruthy();
    expect(avatar.componentInstance.name()).toBe('Chase Bank');
  });

  it('should render no status dot on the avatar by default', () => {
    fixture.componentRef.setInput('avatarName', 'Chase Bank');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="avatar-status"]')).toBeNull();
  });

  it('should pass avatarStatus and avatarStatusLabel through to the avatar', () => {
    fixture.componentRef.setInput('avatarName', 'Chase Bank');
    fixture.componentRef.setInput('avatarStatus', 'error');
    fixture.componentRef.setInput('avatarStatusLabel', 'Reconnect needed');
    fixture.detectChanges();
    const dot: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="avatar-status"]'
    );
    expect(dot?.className).toContain('bg-status-error');
    expect(dot?.getAttribute('aria-label')).toBe('Reconnect needed');
  });

  it('should not render the amount block by default', () => {
    const amountEl: HTMLElement | null = fixture.nativeElement.querySelector('.tabular-nums');
    expect(amountEl).toBeNull();
  });

  it('should render a formatted amount when amount is provided', () => {
    fixture.componentRef.setInput('amount', 1234.5);
    fixture.detectChanges();
    const amountEl: HTMLElement | null = fixture.nativeElement.querySelector('.tabular-nums');
    expect(amountEl).toBeTruthy();
    expect(amountEl?.textContent?.trim()).toContain('1,234.50');
  });

  it('should not render currency text when currency is null', () => {
    fixture.componentRef.setInput('amount', 1000);
    fixture.detectChanges();
    const amountText =
      fixture.nativeElement.querySelector('.tabular-nums')?.textContent?.trim() ?? '';
    expect(amountText).not.toContain('USD');
  });

  it('should render currency before the amount when both are provided', () => {
    fixture.componentRef.setInput('amount', 5000);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();
    const amountText =
      fixture.nativeElement.querySelector('.tabular-nums')?.textContent?.trim() ?? '';
    expect(amountText).toContain('USD');
    expect(amountText.indexOf('USD')).toBeLessThan(amountText.indexOf('5,000.00'));
  });

  it('should render the chevron SVG icon', () => {
    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('should be open by default', () => {
    expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
    expect(bodyEl().hidden).toBe(false);
  });

  it('should be closed when open input is false', () => {
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
    expect(bodyEl().hidden).toBe(true);
  });

  it('should re-open when open input changes back to true', () => {
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(bodyEl().hidden).toBe(false);
  });

  it('should toggle the body when the button is pressed', () => {
    toggleButton().click();
    fixture.detectChanges();
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
    expect(bodyEl().hidden).toBe(true);
    toggleButton().click();
    fixture.detectChanges();
    expect(bodyEl().hidden).toBe(false);
  });

  it('should point the button at the body it controls', () => {
    expect(toggleButton().getAttribute('aria-controls')).toBe(bodyEl().id);
  });
});

@Component({
  imports: [DisclosureRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-disclosure-row label="Chase Bank">
      <span status data-testid="status">Active</span>
      <button actions data-testid="action">Disconnect</button>
      <div data-testid="body">Account details here</div>
    </cmn-disclosure-row>
  `,
})
class DisclosureRowHostComponent {}

describe('DisclosureRowComponent — content projection', () => {
  let fixture: ComponentFixture<DisclosureRowHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisclosureRowHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DisclosureRowHostComponent);
    fixture.detectChanges();
  });

  it('should project status content into the row', () => {
    const status: HTMLElement | null =
      fixture.nativeElement.querySelector('[data-testid="status"]');
    expect(status).toBeTruthy();
    expect(status?.textContent?.trim()).toBe('Active');
  });

  it('should project actions content next to the toggle, not inside it', () => {
    const action: HTMLElement | null =
      fixture.nativeElement.querySelector('[data-testid="action"]');
    expect(action).toBeTruthy();
    expect(action?.textContent?.trim()).toBe('Disconnect');
    expect(action?.closest('button[aria-expanded]')).toBeNull();
  });

  it('should project default slot content into the body', () => {
    const body: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="body"]');
    expect(body).toBeTruthy();
    expect(body?.textContent?.trim()).toBe('Account details here');
  });
});
