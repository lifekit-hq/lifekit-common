import {FocusMonitor} from '@angular/cdk/a11y';
import {OverlayContainer} from '@angular/cdk/overlay';
import {ChangeDetectionStrategy, Component, signal, viewChild} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ButtonComponent} from '../../components/button/button.component';
import {TooltipDirective, type TooltipPlacement} from './tooltip.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, TooltipDirective],
  template: `
    <div style="padding: 2rem">
      <button
        [cmnTooltip]="text()"
        [cmnTooltipPlacement]="placement()"
        [cmnTooltipDisabled]="disabled()"
        type="button"
        data-trigger
      >
        Export
      </button>
      <button type="button" data-other>Elsewhere</button>
      <cmn-button cmnTooltip="Removes the account and its history" data-wrapper>
        Delete
      </cmn-button>
      <span
        [style.width]="truncatedWidth()"
        style="display: inline-block; overflow: hidden; white-space: nowrap"
        cmnTooltip="Allied Irish Banks current account"
        cmnTooltipTruncatedOnly
        tabindex="0"
        data-truncated
      >
        Allied Irish Banks current account
      </span>
    </div>
  `,
})
class HostComponent {
  public readonly text = signal('Download the ledger as CSV');
  public readonly placement = signal<TooltipPlacement>('top');
  public readonly disabled = signal(false);
  public readonly truncatedWidth = signal('4rem');
  public readonly tooltip = viewChild.required(TooltipDirective);
}

const HOVER_SHOW_DELAY_MS = 300;
const HOVER_HIDE_DELAY_MS = 100;
const LONG_PRESS_MS = 500;

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let focusMonitor: FocusMonitor;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    focusMonitor = TestBed.inject(FocusMonitor);
    container = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  function el(selector: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;
  }

  function trigger(): HTMLElement {
    return el('[data-trigger]');
  }

  function bubble(): HTMLElement | null {
    return container.querySelector('cmn-tooltip-panel');
  }

  function pointer(target: Element, type: string, pointerType = 'mouse'): void {
    target.dispatchEvent(new PointerEvent(type, {pointerType, bubbles: type === 'pointerdown'}));
  }

  function hover(target: Element = trigger()): void {
    pointer(target, 'pointerenter');
    vi.advanceTimersByTime(HOVER_SHOW_DELAY_MS);
  }

  function pressEscape(target: Element = trigger()): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    target.dispatchEvent(event);
    return event;
  }

  describe('aria-describedby', () => {
    it('describes the trigger with the text before the tooltip is ever shown', () => {
      const ids = trigger().getAttribute('aria-describedby')?.split(' ') ?? [];
      const description = ids.map(id => document.getElementById(id)).find(Boolean);
      expect(description?.textContent).toBe('Download the ledger as CSV');
      expect(description?.getAttribute('role')).toBe('tooltip');
    });

    it('follows the text when it changes', () => {
      fixture.componentInstance.text.set('Download as PDF');
      fixture.detectChanges();
      const id = trigger().getAttribute('aria-describedby') ?? '';
      expect(document.getElementById(id)?.textContent).toBe('Download as PDF');
    });

    it('drops the description when disabled or empty', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      expect(trigger().hasAttribute('aria-describedby')).toBe(false);

      fixture.componentInstance.disabled.set(false);
      fixture.componentInstance.text.set('  ');
      fixture.detectChanges();
      expect(trigger().hasAttribute('aria-describedby')).toBe(false);
    });

    it('describes the control a wrapper renders, and shows on focus inside it', () => {
      const wrapper = el('[data-wrapper]');
      const control = wrapper.querySelector('button') as HTMLElement;
      expect(wrapper.hasAttribute('aria-describedby')).toBe(false);
      const id = control.getAttribute('aria-describedby') ?? '';
      expect(document.getElementById(id)?.textContent).toBe('Removes the account and its history');

      focusMonitor.focusVia(control, 'keyboard');
      expect(bubble()?.textContent?.trim()).toBe('Removes the account and its history');
    });

    it('hides the visible bubble from screen readers, which already have the description', () => {
      hover();
      expect(bubble()?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('hover', () => {
    it('shows after the pointer rests on the trigger', () => {
      pointer(trigger(), 'pointerenter');
      expect(bubble()).toBeNull();
      vi.advanceTimersByTime(HOVER_SHOW_DELAY_MS);
      expect(bubble()?.textContent?.trim()).toBe('Download the ledger as CSV');
    });

    it('never shows when the pointer only passes over the trigger', () => {
      pointer(trigger(), 'pointerenter');
      pointer(trigger(), 'pointerleave');
      vi.advanceTimersByTime(HOVER_SHOW_DELAY_MS);
      expect(bubble()).toBeNull();
    });

    it('hides shortly after the pointer leaves', () => {
      hover();
      pointer(trigger(), 'pointerleave');
      expect(bubble()).not.toBeNull();
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS);
      expect(bubble()).toBeNull();
    });

    it('stays while the pointer moves onto the bubble, and hides once it leaves that too', () => {
      hover();
      const pane = bubble()?.parentElement as HTMLElement;
      pointer(trigger(), 'pointerleave');
      pointer(pane, 'pointerenter');
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS * 10);
      expect(bubble()).not.toBeNull();

      pointer(pane, 'pointerleave');
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS);
      expect(bubble()).toBeNull();
    });

    it('updates the shown text in place', () => {
      hover();
      fixture.componentInstance.text.set('Download as PDF');
      fixture.detectChanges();
      expect(bubble()?.textContent?.trim()).toBe('Download as PDF');
    });

    it('hides when the text empties or the tooltip is disabled while shown', () => {
      hover();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      expect(bubble()).toBeNull();

      hover();
      expect(bubble()).toBeNull();
    });
  });

  describe('keyboard focus', () => {
    it('shows at once on keyboard focus and hides on blur', () => {
      focusMonitor.focusVia(trigger(), 'keyboard');
      expect(bubble()).not.toBeNull();

      el('[data-other]').focus();
      expect(bubble()).toBeNull();
    });

    it('does not show when a mouse click focuses the trigger', () => {
      focusMonitor.focusVia(trigger(), 'mouse');
      expect(bubble()).toBeNull();
    });

    it('keeps showing while focused after the pointer leaves', () => {
      hover();
      focusMonitor.focusVia(trigger(), 'keyboard');
      pointer(trigger(), 'pointerleave');
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS);
      expect(bubble()).not.toBeNull();
    });
  });

  describe('Escape', () => {
    it('dismisses without moving focus', () => {
      focusMonitor.focusVia(trigger(), 'keyboard');
      const event = pressEscape();
      expect(bubble()).toBeNull();
      expect(document.activeElement).toBe(trigger());
      expect(event.defaultPrevented).toBe(true);
    });

    it('stops at the tooltip, so an overlay beneath it does not close too', () => {
      const outer = vi.fn();
      document.addEventListener('keydown', outer);
      focusMonitor.focusVia(trigger(), 'keyboard');
      pressEscape();
      document.removeEventListener('keydown', outer);
      expect(outer).not.toHaveBeenCalled();
    });

    it('dismisses a hover-only tooltip', () => {
      hover();
      pressEscape(document.body);
      expect(bubble()).toBeNull();
    });

    it('stays dismissed until hover and focus leave and come back', () => {
      focusMonitor.focusVia(trigger(), 'keyboard');
      pressEscape();
      hover();
      expect(bubble()).toBeNull();

      pointer(trigger(), 'pointerleave');
      el('[data-other]').focus();
      focusMonitor.focusVia(trigger(), 'keyboard');
      expect(bubble()).not.toBeNull();
    });

    it('shows again after Escape dismissed it while the pointer was on the bubble', () => {
      hover();
      const pane = bubble()?.parentElement as HTMLElement;
      pointer(trigger(), 'pointerleave');
      pointer(pane, 'pointerenter');
      pressEscape(pane);
      expect(bubble()).toBeNull();

      hover();
      pointer(trigger(), 'pointerleave');
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS);
      hover();
      expect(bubble()).not.toBeNull();

      pointer(trigger(), 'pointerleave');
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS);
      expect(bubble()).toBeNull();
    });

    it('shows on the first hover after Escape dismissed it from under the pointer', () => {
      // A browser fires no pointerleave for a bubble removed from under the pointer.
      hover();
      const pane = bubble()?.parentElement as HTMLElement;
      pointer(trigger(), 'pointerleave');
      pointer(pane, 'pointerenter');
      pressEscape(pane);
      expect(bubble()).toBeNull();

      hover();
      expect(bubble()).not.toBeNull();
    });

    it('keeps the dismissal while the pointer stays on the trigger', () => {
      hover();
      pressEscape(trigger());
      expect(bubble()).toBeNull();

      hover();
      expect(bubble()).toBeNull();
    });

    it('ignores other keys and Escape with a modifier', () => {
      focusMonitor.focusVia(trigger(), 'keyboard');
      trigger().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      trigger().dispatchEvent(
        new KeyboardEvent('keydown', {key: 'Escape', shiftKey: true, bubbles: true})
      );
      expect(bubble()).not.toBeNull();
    });
  });

  describe('touch', () => {
    it('never shows on a tap', () => {
      pointer(trigger(), 'pointerenter', 'touch');
      pointer(trigger(), 'pointerdown', 'touch');
      pointer(trigger(), 'pointerup', 'touch');
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(bubble()).toBeNull();
    });

    it('shows on a long press and the next touch dismisses it', () => {
      pointer(trigger(), 'pointerdown', 'touch');
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(bubble()).not.toBeNull();

      pointer(trigger(), 'pointerup', 'touch');
      pointer(trigger(), 'pointerleave', 'touch');
      expect(bubble()).not.toBeNull();

      pointer(el('[data-other]'), 'pointerdown', 'touch');
      expect(bubble()).toBeNull();
    });

    it('cancels the long press when the finger lifts or slides off', () => {
      pointer(trigger(), 'pointerdown', 'touch');
      pointer(trigger(), 'pointercancel', 'touch');
      pointer(trigger(), 'pointerdown', 'touch');
      pointer(trigger(), 'pointerleave', 'touch');
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(bubble()).toBeNull();
    });
  });

  describe('placement', () => {
    function gap(placement: TooltipPlacement): {host: DOMRect; pane: DOMRect} {
      fixture.componentInstance.placement.set(placement);
      fixture.detectChanges();
      focusMonitor.focusVia(trigger(), 'keyboard');
      const pane = (bubble()?.parentElement as HTMLElement).getBoundingClientRect();
      return {host: trigger().getBoundingClientRect(), pane};
    }

    it('sits below the trigger for bottom', () => {
      const {host, pane} = gap('bottom');
      expect(pane.top).toBeGreaterThanOrEqual(host.bottom);
    });

    it('sits after the trigger for end', () => {
      const {host, pane} = gap('end');
      expect(pane.left).toBeGreaterThanOrEqual(host.right);
    });

    it('moves when the placement changes while shown', () => {
      gap('bottom');
      fixture.componentInstance.placement.set('end');
      fixture.detectChanges();
      const pane = (bubble()?.parentElement as HTMLElement).getBoundingClientRect();
      expect(pane.left).toBeGreaterThanOrEqual(trigger().getBoundingClientRect().right);
    });
  });

  describe('truncated only (guardrail T5)', () => {
    function truncated(): HTMLElement {
      return el('[data-truncated]');
    }

    it('shows the full value on hover and focus while the text is cut off', () => {
      hover(truncated());
      expect(bubble()?.textContent?.trim()).toBe('Allied Irish Banks current account');
      pointer(truncated(), 'pointerleave');
      vi.advanceTimersByTime(HOVER_HIDE_DELAY_MS);

      focusMonitor.focusVia(truncated(), 'keyboard');
      expect(bubble()?.textContent?.trim()).toBe('Allied Irish Banks current account');
    });

    it('stays hidden when the text fits', () => {
      fixture.componentInstance.truncatedWidth.set('40rem');
      fixture.detectChanges();
      focusMonitor.focusVia(truncated(), 'keyboard');
      expect(bubble()).toBeNull();
    });

    it('adds no description, since the full text is already the accessible name', () => {
      expect(truncated().hasAttribute('aria-describedby')).toBe(false);
    });
  });

  it('removes the bubble when the trigger is destroyed', () => {
    hover();
    expect(fixture.componentInstance.tooltip().isVisible).toBe(true);
    fixture.destroy();
    expect(bubble()).toBeNull();
  });
});
