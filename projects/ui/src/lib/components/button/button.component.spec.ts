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
    ['secondary', 'border-border-default'],
    ['destructive', 'bg-status-error'],
  ])('applies the "%s" variant classes', (variant, expected) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(button()?.className).toContain(expected);
  });

  it.each<[ButtonSize, string, 'sm' | 'md']>([
    ['sm', 'text-cmn-sm', 'sm'],
    ['md', 'text-cmn-md', 'sm'],
    ['lg', 'text-cmn-lg', 'md'],
  ])('sizes the button and its icon for "%s"', (size, textClass, iconSize) => {
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    expect(button()?.className).toContain(textClass);
    expect(fixture.componentInstance.iconSize()).toBe(iconSize);
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
});
