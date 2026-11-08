import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {PullRefreshIndicatorComponent} from './pull-refresh-indicator.component';

function render(inputs: Record<string, unknown>): HTMLElement {
  const fixture = TestBed.createComponent(PullRefreshIndicatorComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function find(host: HTMLElement, selector: string): HTMLElement {
  const found = host.querySelector<HTMLElement>(selector);
  if (!found) {
    throw new Error(`no ${selector} in the indicator`);
  }
  return found;
}

const chip = (host: HTMLElement): HTMLElement => find(host, '[data-cmn-pull-indicator]');

describe('PullRefreshIndicatorComponent', () => {
  it('should be decorative and let touches through', () => {
    const host = render({});
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.classList).toContain('pointer-events-none');
  });

  it('should fade in with the pull and wind the arc up', () => {
    const host = render({progress: 0.5});
    expect(chip(host).style.opacity).toBe('0.5');
    expect(find(host, '.inline-flex').style.transform).toBe('rotate(135deg)');
    expect(host.querySelector('.animate-spin')).toBeNull();
  });

  it('should spin at full strength while refreshing', () => {
    const host = render({progress: 1, refreshing: true});
    expect(chip(host).style.opacity).toBe('1');
    expect(host.querySelector('.animate-spin')).not.toBeNull();
  });

  it('should be invisible while hidden, whatever the progress', () => {
    expect(chip(render({progress: 1, hidden: true})).style.opacity).toBe('0');
  });

  it('should sit in the gap the pulled content opens, centred on it', () => {
    const transform = chip(render({offset: 48})).style.transform;
    expect(transform).toContain('48px');
    expect(transform).toContain('--cmn-size-md');
  });

  it('should step in below the bar when the content does not move', () => {
    expect(chip(render({offset: 0})).style.transform).toContain('--cmn-motion-distance-sm');
  });

  it('should settle on a transition, except while a finger moves it', () => {
    expect(chip(render({})).className).toContain('duration-cmn-short');
    expect(chip(render({})).className).toContain('motion-reduce:transition-none');
    expect(chip(render({dragging: true})).className).not.toContain('duration-cmn-short');
  });
});
