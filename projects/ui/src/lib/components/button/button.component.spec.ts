import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  ButtonComponent,
  type ButtonSize,
  type ButtonType,
  type ButtonVariant,
} from './button.component';

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
  });

  function button(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button');
  }

  it.each<[ButtonVariant, string]>([
    ['primary', 'bg-accent-default'],
    ['secondary', 'bg-cmn-btn-secondary'],
    ['tertiary', 'border-accent-default'],
    ['ghost', 'text-accent-default'],
    ['destructive', 'bg-status-error'],
    ['danger-tertiary', 'border-status-error'],
    ['danger-ghost', 'text-status-error'],
  ])('applies the "%s" variant classes', (variant, expected) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(button()?.className).toContain(expected);
  });

  it.each<[ButtonSize, string, 'sm' | 'md']>([
    ['sm', 'min-h-cmn-size-sm', 'sm'],
    ['md', 'min-h-cmn-control-h', 'sm'],
    ['lg', 'min-h-cmn-16', 'md'],
  ])('sizes the button and its icon for "%s"', (size, heightClass, iconSize) => {
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    // Carbon's 32 / 48 / 64px, with its 14px label at every size.
    expect(button()?.className).toContain(heightClass);
    expect(button()?.className).toContain('text-cmn-sm');
    expect(fixture.componentInstance.iconSize()).toBe(iconSize);
  });

  it("is square, with Carbon's inset focus ring and a border on every kind", () => {
    fixture.detectChanges();
    const className = button()?.className ?? '';
    expect(className).toContain('rounded-cmn-role-control');
    expect(className).toMatch(/(^| )border( |$)/);
    expect(className).toContain('border-transparent');
    expect(className).toContain('focus:border-border-focus');
    expect(className).toContain('focus:shadow-cmn-focus-inset');
  });

  it('gives the md button at least the control height the md field beside it has', () => {
    fixture.detectChanges();
    expect(button()?.className).toContain('min-h-cmn-control-h');
    // A one-line label plus this padding stays under the control height, border included, so the
    // outlined tertiary is as tall as the primary beside it.
    expect(button()?.className).toContain('py-cmn-2');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(button()?.className).not.toContain('min-h-cmn-control-h');
  });

  it.each<ButtonType>(['button', 'submit', 'reset'])('forwards type "%s"', type => {
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
    expect(button()?.getAttribute('type')).toBe(type);
  });

  it('emits clicked with the originating event', () => {
    const events: MouseEvent[] = [];
    fixture.componentInstance.clicked.subscribe(e => events.push(e));
    fixture.detectChanges();

    button()?.click();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('click');
  });

  it('marks the button disabled and swallows clicks', () => {
    let count = 0;
    fixture.componentInstance.clicked.subscribe(() => count++);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(button()?.disabled).toBe(true);
    expect(button()?.getAttribute('aria-disabled')).toBe('true');
    expect(button()?.className).toContain('cursor-not-allowed');

    button()?.click();
    expect(count).toBe(0);
  });

  it('treats loading as busy-and-disabled without claiming aria-disabled', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(button()?.disabled).toBe(true);
    expect(button()?.getAttribute('aria-busy')).toBe('true');
    expect(button()?.getAttribute('aria-disabled')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.animate-spin')).not.toBeNull();
  });

  it('keeps a loading button at full opacity so its label stays legible', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(button()?.className).not.toContain('opacity-50');
    expect(button()?.className).toContain('pointer-events-none');
  });

  it('draws a disabled button in its own colours, never the variant dimmed', () => {
    const drawn = {
      primary: ['bg-surface-raised', 'text-text-secondary'],
      secondary: ['bg-surface-raised', 'text-text-secondary'],
      tertiary: ['bg-transparent', 'border-border-default', 'text-text-secondary'],
      ghost: ['bg-transparent', 'text-text-secondary'],
      destructive: ['bg-surface-raised', 'text-text-secondary'],
      'danger-tertiary': ['bg-transparent', 'border-border-default', 'text-text-secondary'],
      'danger-ghost': ['bg-transparent', 'text-text-secondary'],
    } as const;
    fixture.componentRef.setInput('disabled', true);
    for (const [variant, classes] of Object.entries(drawn)) {
      fixture.componentRef.setInput('variant', variant);
      fixture.detectChanges();
      const className = button()?.className ?? '';
      for (const name of classes) {
        expect(className).toContain(name);
      }
      expect(className).not.toMatch(/opacity-|bg-accent-default|bg-status-error/);
      expect(className).toContain('pointer-events-none');
    }
  });

  it('drops aria-busy when not loading', () => {
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-busy')).toBeNull();
  });

  it('renders a prefix icon by default and a suffix icon on request', () => {
    fixture.componentRef.setInput('icon', 'ArrowRight');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('cmn-icon')).not.toBeNull();

    fixture.componentRef.setInput('iconPosition', 'suffix');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('cmn-icon')).not.toBeNull();
  });

  it('replaces the icon with the spinner while loading', () => {
    fixture.componentRef.setInput('icon', 'ArrowRight');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll('cmn-icon');
    expect(icons).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('.animate-spin')).not.toBeNull();
  });

  it('moves a consumer aria-label from the host onto the native button', () => {
    fixture.componentRef.setInput('aria-label', 'Send message');
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-label')).toBe('Send message');
    expect((fixture.nativeElement as HTMLElement).hasAttribute('aria-label')).toBe(false);
  });

  it('leaves the native button unnamed when no aria-label is given', () => {
    fixture.detectChanges();
    expect(button()?.hasAttribute('aria-label')).toBe(false);
  });
});
