import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, type Mock, vi} from 'vitest';
import {userEvent} from 'vitest/browser';

import {type CmnRowSwipeAction, ListItemRowComponent} from './list-item-row.component';

describe('ListItemRowComponent', () => {
  let fixture: ComponentFixture<ListItemRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItemRowComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ListItemRowComponent);
    fixture.componentRef.setInput('label', 'Netflix');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be a block host', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).toContain('block');
  });

  it('should render the label text', () => {
    const row: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(row.textContent).toContain('Netflix');
  });

  it('should not render a sublabel by default', () => {
    const labelWrapper: HTMLElement = fixture.nativeElement.querySelector('.flex-1');
    const divs: NodeListOf<HTMLElement> = labelWrapper.querySelectorAll('div');
    expect(divs.length).toBe(1);
  });

  it('should render the sublabel when provided', () => {
    fixture.componentRef.setInput('sublabel', 'Video streaming');
    fixture.detectChanges();
    const labelWrapper: HTMLElement = fixture.nativeElement.querySelector('.flex-1');
    const divs: NodeListOf<HTMLElement> = labelWrapper.querySelectorAll('div');
    expect(divs.length).toBe(2);
    expect(divs[1].textContent?.trim()).toBe('Video streaming');
  });

  function rowEl(): HTMLElement {
    return fixture.nativeElement.querySelector('div');
  }

  function labelEl(): HTMLElement {
    return fixture.nativeElement.querySelector('.flex-1 > div');
  }

  it('should not fade the row or mute its avatar by default', () => {
    expect(rowEl().className).not.toContain('opacity');
    expect(rowEl().className).not.toContain('grayscale');
    expect(labelEl().classList).toContain('text-text-primary');
  });

  it('should recolour the label instead of fading the row when dimmed', () => {
    fixture.componentRef.setInput('sublabel', 'Video streaming');
    fixture.componentRef.setInput('dimmed', true);
    fixture.detectChanges();
    expect(rowEl().className).not.toContain('opacity');
    expect(labelEl().classList).toContain('text-text-secondary');
    expect(labelEl().classList).not.toContain('text-text-primary');
    const sublabel: HTMLElement = fixture.nativeElement.querySelectorAll('.flex-1 > div')[1];
    // The sublabel keeps its readable grade: a disabled-grade colour would fall under 4.5:1.
    expect(sublabel.classList).toContain('text-text-secondary');
    expect(sublabel.classList).not.toContain('text-text-disabled');
  });

  it('should desaturate the avatar slot when dimmed, never fade it under its text contrast', () => {
    fixture.componentRef.setInput('dimmed', true);
    fixture.detectChanges();
    expect(rowEl().className).toContain('[&>[avatar]]:grayscale');
    expect(rowEl().className).not.toContain('opacity');
  });

  it('should restore the full-strength colours when dimmed changes back to false', () => {
    fixture.componentRef.setInput('dimmed', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('dimmed', false);
    fixture.detectChanges();
    expect(rowEl().className).not.toContain('[&>[avatar]]');
    expect(labelEl().classList).toContain('text-text-primary');
  });

  it('should have the flex layout classes on the row div', () => {
    const row: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(row.classList).toContain('flex');
    expect(row.classList).toContain('items-center');
    expect(row.classList).toContain('px-cmn-4');
    expect(row.classList).toContain('py-cmn-3');
  });

  it('should draw the hairline divider on the host, where last: sees the sibling rows', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).toContain('border-b');
    expect(host.classList).toContain('border-border-default');
    expect(host.className).toContain('last:border-b-0');
    expect(rowEl().className).not.toContain('border-b');
  });

  it('should render no trailing action by default', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('should render a plain row, not a button, by default', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(rowEl().className).not.toContain('cursor-pointer');
    expect(rowEl().className).not.toContain('focus-visible:ring-2');
  });
});

describe('ListItemRowComponent — action mode', () => {
  let fixture: ComponentFixture<ListItemRowComponent>;
  let activated: Mock<() => void>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItemRowComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ListItemRowComponent);
    fixture.componentRef.setInput('label', 'Manual holding');
    fixture.componentRef.setInput('sublabel', 'Opens the editor');
    fixture.componentRef.setInput('action', true);
    activated = vi.fn<() => void>();
    fixture.componentInstance.activated.subscribe(activated);
    fixture.detectChanges();
  });

  function buttonEl(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('should render the whole row as one native button', () => {
    const button = buttonEl();
    expect(button).toBeTruthy();
    expect(button.type).toBe('button');
    expect(button.hasAttribute('role')).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(1);
    expect(button.textContent).toContain('Manual holding');
    expect(button.textContent).toContain('Opens the editor');
  });

  it('should keep the row layout and add the focus ring and pressed state', () => {
    const button = buttonEl();
    for (const cls of ['flex', 'items-center', 'px-cmn-4', 'py-cmn-3', 'w-full']) {
      expect(button.classList).toContain(cls);
    }
    expect(button.className).toContain('focus-visible:ring-border-focus');
    expect(button.className).toContain('active:bg-surface-raised');
    expect(button.querySelector('.flex-1 > div')?.classList).toContain('text-text-primary');
  });

  it('should emit activated on click', async () => {
    await userEvent.click(buttonEl());
    expect(activated).toHaveBeenCalledTimes(1);
  });

  it('should emit activated on Enter and on Space', async () => {
    buttonEl().focus();
    await userEvent.keyboard('{Enter}');
    expect(activated).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    expect(activated).toHaveBeenCalledTimes(2);
  });

  it('should still dim an action row', () => {
    fixture.componentRef.setInput('dimmed', true);
    fixture.detectChanges();
    expect(buttonEl().className).toContain('[&>[avatar]]:grayscale');
    expect(buttonEl().querySelector('.flex-1 > div')?.classList).toContain('text-text-secondary');
  });

  it('should fall back to a plain row when action turns off', () => {
    fixture.componentRef.setInput('action', false);
    fixture.detectChanges();
    expect(buttonEl()).toBeNull();
    expect(fixture.nativeElement.querySelector('div')?.textContent).toContain('Manual holding');
  });
});

@Component({
  imports: [ListItemRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-list-item-row label="Spotify">
      <div avatar data-testid="avatar">SP</div>
      <div meta data-testid="meta">Next: Jan 1</div>
      <div amount data-testid="amount">$9.99</div>
      <div actions data-testid="actions">
        <button>Dismiss</button>
      </div>
    </cmn-list-item-row>
  `,
})
class ListItemRowHostComponent {}

describe('ListItemRowComponent — content projection', () => {
  let fixture: ComponentFixture<ListItemRowHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItemRowHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ListItemRowHostComponent);
    fixture.detectChanges();
  });

  it('should project avatar slot content', () => {
    const avatar: HTMLElement | null =
      fixture.nativeElement.querySelector('[data-testid="avatar"]');
    expect(avatar).toBeTruthy();
    expect(avatar?.textContent?.trim()).toBe('SP');
  });

  it('should project meta slot content', () => {
    const meta: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="meta"]');
    expect(meta).toBeTruthy();
    expect(meta?.textContent?.trim()).toBe('Next: Jan 1');
  });

  it('should project amount slot content', () => {
    const amount: HTMLElement | null =
      fixture.nativeElement.querySelector('[data-testid="amount"]');
    expect(amount).toBeTruthy();
    expect(amount?.textContent?.trim()).toBe('$9.99');
  });

  it('should project actions slot content', () => {
    const actions: HTMLElement | null =
      fixture.nativeElement.querySelector('[data-testid="actions"]');
    expect(actions).toBeTruthy();
    const btn: HTMLButtonElement | null = actions?.querySelector('button') ?? null;
    expect(btn?.textContent?.trim()).toBe('Dismiss');
  });
});

@Component({
  imports: [ListItemRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-list-item-row
      [action]="action"
      (activated)="activated = activated + 1"
      (trailingAction)="trailing = trailing + 1"
      label="Oat milk"
      trailingIcon="Ellipsis"
    />
    <cmn-list-item-row label="Bananas" trailingIcon="Ellipsis" trailingLabel="Item options" />
  `,
})
class TrailingHostComponent {
  public action = false;
  public activated = 0;
  public trailing = 0;
}

describe('ListItemRowComponent — trailing action', () => {
  let fixture: ComponentFixture<TrailingHostComponent>;

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('cmn-list-item-row'));
  }

  function trailingOf(row: HTMLElement): HTMLButtonElement {
    return row.querySelector('button[aria-label]') as HTMLButtonElement;
  }

  function create(action: boolean): void {
    fixture = TestBed.createComponent(TrailingHostComponent);
    fixture.componentInstance.action = action;
    fixture.detectChanges();
  }

  it('draws a borderless, touch-sized icon button at the row end', () => {
    create(false);
    const button = trailingOf(rows()[0]);
    expect(button.type).toBe('button');
    expect(button.className).toContain('size-cmn-touch');
    expect(button.className).toContain('text-text-secondary');
    expect(button.className).not.toMatch(/(^|\s)border(\s|-)/);
    expect(button.textContent?.trim()).toBe('');
    expect(button.querySelector('cmn-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(rows()[0].querySelector('div')?.lastElementChild).toBe(button);
  });

  it('names the action after the row unless a label is given', () => {
    create(false);
    expect(trailingOf(rows()[0]).getAttribute('aria-label')).toBe('More for Oat milk');
    expect(trailingOf(rows()[1]).getAttribute('aria-label')).toBe('Item options');
  });

  it('emits trailingAction on press without activating a plain row', async () => {
    create(false);
    await userEvent.click(trailingOf(rows()[0]));
    expect(fixture.componentInstance.trailing).toBe(1);
    expect(fixture.componentInstance.activated).toBe(0);
  });

  it('sits beside an action row button, never inside it', async () => {
    create(true);
    const row = rows()[0];
    const buttons = Array.from(row.querySelectorAll('button'));
    expect(buttons.length).toBe(2);
    const [rowButton, trailing] = buttons;
    expect(rowButton.contains(trailing)).toBe(false);
    expect(rowButton.className).toContain('flex-1');
    await userEvent.click(trailing);
    expect(fixture.componentInstance.trailing).toBe(1);
    expect(fixture.componentInstance.activated).toBe(0);
    await userEvent.click(rowButton);
    expect(fixture.componentInstance.activated).toBe(1);
  });
});

@Component({
  imports: [ListItemRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-list-item-row
      [swipeLeading]="leading"
      [swipeTrailing]="trailing"
      [action]="true"
      (swipeLeadingAction)="log.push('leading')"
      (swipeTrailingAction)="log.push('trailing')"
      (activated)="log.push('activated')"
      label="Oat milk"
    />
    <button id="elsewhere" type="button">Elsewhere</button>
  `,
})
class SwipeHostComponent {
  public leading: CmnRowSwipeAction | null = {label: 'Done', icon: 'Check', tone: 'positive'};
  public trailing: CmnRowSwipeAction | null = {label: 'Remove', icon: 'Trash2', tone: 'danger'};
  public log: string[] = [];
}

describe('ListItemRowComponent — swipe actions', () => {
  const TRAY_PX = 80;
  let fixture: ComponentFixture<SwipeHostComponent>;

  function create(host: Partial<SwipeHostComponent> = {}): void {
    fixture = TestBed.createComponent(SwipeHostComponent);
    Object.assign(fixture.componentInstance, host);
    fixture.detectChanges();
    // The unit run loads no Tailwind: give each tray the width its classes would.
    fixture.nativeElement
      .querySelectorAll('[class*="absolute"]')
      .forEach((tray: HTMLElement) => (tray.style.width = `${TRAY_PX}px`));
  }

  function surface(): HTMLElement {
    return fixture.nativeElement.querySelector('.touch-pan-y');
  }

  function trayButton(name: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`button[aria-label^="${name}"]`);
  }

  function touch(type: string, x: number, y = 0): void {
    surface().dispatchEvent(
      new PointerEvent(type, {clientX: x, clientY: y, pointerType: 'touch', bubbles: true})
    );
    fixture.detectChanges();
  }

  function swipeBy(x: number): void {
    touch('pointerdown', 0);
    touch('pointermove', x);
    touch('pointerup', x);
  }

  it('draws a row with no swipe action exactly as before', () => {
    const plain = TestBed.createComponent(ListItemRowComponent);
    plain.componentRef.setInput('label', 'Oat milk');
    plain.detectChanges();
    expect(plain.nativeElement.querySelector('.touch-pan-y')).toBeNull();
    expect(plain.nativeElement.querySelectorAll('button').length).toBe(0);
  });

  it('keeps a tray button for each action, named by the row, with the visible word first', () => {
    create();
    expect(trayButton('Done').getAttribute('aria-label')).toBe('Done Oat milk');
    expect(trayButton('Done').textContent).toContain('Done');
    expect(trayButton('Remove').getAttribute('aria-label')).toBe('Remove Oat milk');
    expect(trayButton('Remove').className).toContain('bg-status-error');
    expect(trayButton('Done').className).toContain('bg-status-success');
  });

  it('draws a neutral action in the accent when it names no tone', () => {
    create({leading: {label: 'Read', icon: 'Check'}, trailing: null});
    expect(trayButton('Read').className).toContain('bg-accent-default');
    expect(fixture.nativeElement.querySelectorAll('[class*="absolute"]').length).toBe(1);
  });

  it('slides open on a swipe toward the end and emits the leading action from its button', () => {
    create();
    swipeBy(TRAY_PX);
    expect(surface().style.transform).toBe(`translateX(${TRAY_PX}px)`);
    trayButton('Done').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.log).toEqual(['leading']);
    expect(surface().style.transform).toBe('');
  });

  it('slides open on a swipe toward the start and emits the trailing action from its button', () => {
    create();
    swipeBy(-TRAY_PX);
    expect(surface().style.transform).toBe(`translateX(-${TRAY_PX}px)`);
    trayButton('Remove').click();
    expect(fixture.componentInstance.log).toEqual(['trailing']);
  });

  it('stays shut when a swipe is short, and moves with the finger meanwhile', () => {
    create();
    touch('pointerdown', 0);
    touch('pointermove', TRAY_PX / 4);
    expect(surface().className).not.toContain('transition-transform');
    touch('pointerup', TRAY_PX / 4);
    expect(surface().style.transform).toBe('');
    expect(surface().className).toContain('transition-transform');
  });

  it('snaps instead of sliding for a reader who asked for reduced motion', () => {
    create();
    expect(surface().className).toContain('motion-reduce:transition-none');
  });

  it('does not open toward a side with no action', () => {
    create({trailing: null});
    swipeBy(-TRAY_PX);
    expect(surface().style.transform).toBe('');
  });

  it('opens when focus reaches a tray button, and shuts when focus leaves it', () => {
    create();
    trayButton('Remove').focus();
    fixture.detectChanges();
    expect(surface().style.transform).toBe(`translateX(-${TRAY_PX}px)`);
    fixture.nativeElement.querySelector('#elsewhere').focus();
    fixture.detectChanges();
    expect(surface().style.transform).toBe('');
  });

  it('shuts on Escape', () => {
    create();
    trayButton('Done').focus();
    fixture.detectChanges();
    trayButton('Done').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();
    expect(surface().style.transform).toBe('');
  });

  it('shuts when the reader touches anywhere else, but not on the row itself', () => {
    create();
    swipeBy(TRAY_PX);
    document.body.dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'touch'}));
    fixture.detectChanges();
    expect(surface().style.transform).toBe('');
  });

  it('keeps the row pressable: a plain tap activates it', async () => {
    create();
    await userEvent.click(surface().querySelector('button') as HTMLButtonElement);
    expect(fixture.componentInstance.log).toEqual(['activated']);
  });
});
