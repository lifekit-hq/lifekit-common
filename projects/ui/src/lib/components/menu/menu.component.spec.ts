import {
  DOWN_ARROW,
  END,
  ESCAPE,
  HOME,
  LEFT_ARROW,
  RIGHT_ARROW,
  TAB,
  UP_ARROW,
} from '@angular/cdk/keycodes';
import {OverlayContainer} from '@angular/cdk/overlay';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {MenuComponent, type MenuHeader, type MenuItem} from './menu.component';

// The CDK key managers read `keyCode`, which a synthetic event only carries when given one.
const KEY_CODES = new Map<string, number>([
  ['Tab', TAB],
  ['Escape', ESCAPE],
  ['End', END],
  ['Home', HOME],
  ['ArrowLeft', LEFT_ARROW],
  ['ArrowUp', UP_ARROW],
  ['ArrowRight', RIGHT_ARROW],
  ['ArrowDown', DOWN_ARROW],
]);

const MENU_ITEMS: MenuItem[] = [
  {id: 'settings', label: 'Settings', icon: 'Settings2'},
  {id: 'logout', label: 'Log out', icon: 'LogOut', destructive: true},
];

describe('MenuComponent', () => {
  let fixture: ComponentFixture<MenuComponent>;
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    fixture.componentRef.setInput('items', MENU_ITEMS);
    fixture.componentRef.setInput('ariaLabel', 'Account menu');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    overlayContainer.ngOnDestroy();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open when the trigger is clicked', () => {
    const trigger = fixture.debugElement.query(By.css('button'));
    trigger.triggerEventHandler('click', new MouseEvent('click'));
    fixture.detectChanges();

    expect(overlayContainer.getContainerElement().textContent).toContain('Settings');
    expect(overlayContainer.getContainerElement().textContent).toContain('Log out');
  });

  it('should lift off the page with a shadow and a hairline border', () => {
    fixture.debugElement
      .query(By.css('button'))
      .triggerEventHandler('click', new MouseEvent('click'));
    fixture.detectChanges();

    const menu = overlayContainer.getContainerElement().querySelector('[role="menu"]');
    expect(menu?.classList).toContain('shadow-cmn-lg');
    expect(menu?.classList).toContain('border');
    expect(menu?.classList).toContain('border-border-default');
  });

  it('should ring the focused item, not just tint it', () => {
    fixture.debugElement
      .query(By.css('button'))
      .triggerEventHandler('click', new MouseEvent('click'));
    fixture.detectChanges();

    const item = overlayContainer.getContainerElement().querySelector('[role="menuitem"]');
    expect(item?.classList).toContain('focus-visible:ring-2');
    expect(item?.classList).toContain('focus-visible:ring-inset');
  });

  it('should emit the selected item and close the menu', () => {
    const selected: MenuItem[] = [];
    fixture.componentInstance.itemSelect.subscribe(item => selected.push(item));

    fixture.debugElement
      .query(By.css('button'))
      .triggerEventHandler('click', new MouseEvent('click'));
    fixture.detectChanges();

    const menuButtons = overlayContainer.getContainerElement().querySelectorAll('button');
    menuButtons[1]?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    fixture.detectChanges();

    expect(selected).toEqual([{id: 'logout', label: 'Log out', icon: 'LogOut', destructive: true}]);
    expect(overlayContainer.getContainerElement().textContent).toBe('');
  });

  it('should close on Escape', () => {
    fixture.debugElement
      .query(By.css('button'))
      .triggerEventHandler('click', new MouseEvent('click'));
    fixture.detectChanges();

    const overlayPane = overlayContainer.getContainerElement().querySelector('.cdk-overlay-pane');
    overlayPane?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();

    expect(overlayContainer.getContainerElement().textContent).toBe('');
  });

  describe('identity header and separators', () => {
    const HEADER: MenuHeader = {title: 'Ada Lovelace', subtitle: 'ada@example.com'};

    function open(): HTMLElement {
      fixture.debugElement
        .query(By.css('button'))
        .triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
      return overlayContainer.getContainerElement();
    }

    it('should show the header inside the menu, as text and not as an item', () => {
      fixture.componentRef.setInput('header', HEADER);
      fixture.detectChanges();

      const menu = open().querySelector('[role="menu"]');
      const header = menu?.querySelector('[data-menu-header]');
      expect(header?.textContent).toContain('Ada Lovelace');
      expect(header?.textContent).toContain('ada@example.com');
      expect(header?.getAttribute('role')).toBe('presentation');
      expect(menu?.querySelectorAll('[role="menuitem"]').length).toBe(MENU_ITEMS.length);
    });

    it('should not turn the header into a button, so a click on it does not select', () => {
      const selected: MenuItem[] = [];
      fixture.componentInstance.itemSelect.subscribe(item => selected.push(item));
      fixture.componentRef.setInput('header', HEADER);
      fixture.detectChanges();

      open().querySelector<HTMLElement>('[data-menu-header]')?.click();
      fixture.detectChanges();

      expect(selected).toEqual([]);
      expect(overlayContainer.getContainerElement().textContent).toContain('Settings');
    });

    it('should name the menu after the header text', () => {
      fixture.componentRef.setInput('header', HEADER);
      fixture.detectChanges();

      expect(open().querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
        'Ada Lovelace, ada@example.com'
      );
    });

    it('should leave the menu unnamed and headerless without a header', () => {
      const menu = open().querySelector('[role="menu"]');
      expect(menu?.hasAttribute('aria-label')).toBe(false);
      expect(menu?.querySelector('[data-menu-header]')).toBeNull();
    });

    it('should draw a separator before an item that asks for one', () => {
      fixture.componentRef.setInput('items', [
        {id: 'a', label: 'A'},
        {id: 'b', label: 'B', separatorBefore: true},
      ]);
      fixture.detectChanges();

      const menu = open().querySelector('[role="menu"]');
      const children = Array.from(menu?.children ?? []).map(
        child => child.getAttribute('role') ?? child.tagName
      );
      expect(children).toEqual(['menuitem', 'separator', 'menuitem']);
    });

    it('should draw no separator above the first item', () => {
      fixture.componentRef.setInput('items', [{id: 'a', label: 'A', separatorBefore: true}]);
      fixture.detectChanges();

      expect(open().querySelector('[role="separator"]')).toBeNull();
    });
  });

  describe('keyboard (APG menu button)', () => {
    const ITEMS: MenuItem[] = [
      {id: 'profile', label: 'Profile'},
      {id: 'settings', label: 'Settings'},
      {id: 'billing', label: 'Billing', disabled: true},
      {id: 'logout', label: 'Log out'},
    ];

    let trigger: HTMLButtonElement;

    beforeEach(() => {
      fixture.componentRef.setInput('items', ITEMS);
      fixture.detectChanges();
      trigger = fixture.nativeElement.querySelector('button');
      trigger.focus();
    });

    async function settle(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
    }

    function press(key: string, target: EventTarget = document.activeElement ?? document.body) {
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          keyCode: KEY_CODES.get(key),
          bubbles: true,
          cancelable: true,
        })
      );
      fixture.detectChanges();
    }

    function focusedLabel(): string | undefined {
      return document.activeElement?.textContent?.trim();
    }

    async function openFromKeyboard(): Promise<void> {
      // Enter and Space reach a button as a click with no pointer detail.
      trigger.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}));
      await settle();
    }

    it('should keep every item out of the page tab order', async () => {
      await openFromKeyboard();
      const items = overlayContainer.getContainerElement().querySelectorAll('[role="menuitem"]');
      items.forEach(item => expect(item.getAttribute('tabindex')).toBe('-1'));
    });

    it('should open on the first item from Enter or Space', async () => {
      await openFromKeyboard();
      expect(focusedLabel()).toBe('Profile');
    });

    it('should open on the first item from ArrowDown on the trigger', async () => {
      press('ArrowDown', trigger);
      await settle();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(focusedLabel()).toBe('Profile');
    });

    it('should open on the last item from ArrowUp on the trigger', async () => {
      press('ArrowUp', trigger);
      await settle();
      expect(focusedLabel()).toBe('Log out');
    });

    it('should open on the panel, not an item, from a pointer click', async () => {
      trigger.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
      await settle();
      expect(document.activeElement?.getAttribute('role')).toBe('menu');

      press('ArrowDown');
      expect(focusedLabel()).toBe('Profile');
    });

    it('should move to the last item on ArrowUp from the panel', async () => {
      trigger.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
      await settle();
      press('ArrowUp');
      expect(focusedLabel()).toBe('Log out');
    });

    it('should move with the arrow keys, skip disabled items and wrap', async () => {
      await openFromKeyboard();
      press('ArrowDown');
      expect(focusedLabel()).toBe('Settings');
      press('ArrowDown');
      expect(focusedLabel()).toBe('Log out');
      press('ArrowDown');
      expect(focusedLabel()).toBe('Profile');
      press('ArrowUp');
      expect(focusedLabel()).toBe('Log out');
    });

    it('should jump to the first and last items on Home and End', async () => {
      await openFromKeyboard();
      press('End');
      expect(focusedLabel()).toBe('Log out');
      press('Home');
      expect(focusedLabel()).toBe('Profile');
    });

    it('should move to the next item starting with a typed character', async () => {
      vi.useFakeTimers();
      try {
        await openFromKeyboard();
        press('l');
        vi.advanceTimersByTime(250);
        expect(focusedLabel()).toBe('Log out');
        press('s');
        vi.advanceTimersByTime(250);
        expect(focusedLabel()).toBe('Settings');
      } finally {
        vi.useRealTimers();
      }
    });

    it('should return focus to the trigger on Escape', async () => {
      await openFromKeyboard();
      press('Escape');
      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('should close and return focus to the trigger on Tab', async () => {
      await openFromKeyboard();
      press('Tab');
      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('should return focus to the trigger after choosing an item', async () => {
      const selected: MenuItem[] = [];
      fixture.componentInstance.itemSelect.subscribe(item => selected.push(item));
      await openFromKeyboard();
      press('ArrowDown');
      (document.activeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(selected.map(item => item.id)).toEqual(['settings']);
      expect(document.activeElement).toBe(trigger);
    });

    it('should return focus to the trigger when the backdrop is clicked', async () => {
      await openFromKeyboard();
      overlayContainer
        .getContainerElement()
        .querySelector<HTMLElement>('.cdk-overlay-backdrop')
        ?.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('should leave other keys on the trigger alone', () => {
      press('a', trigger);
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });
});
