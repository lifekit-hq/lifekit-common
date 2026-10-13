import {OverlayContainer} from '@angular/cdk/overlay';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {isRouteMenuItem, MenuComponent, type MenuHeader, type MenuItem} from './menu.component';

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
});

describe('isRouteMenuItem', () => {
  it('should treat an absolute path id as a route', () => {
    expect(isRouteMenuItem({id: '/settings', label: 'Settings'})).toBe(true);
  });

  it('should treat any other id as an action', () => {
    expect(isRouteMenuItem({id: '_signOut', label: 'Sign out'})).toBe(false);
    expect(isRouteMenuItem({id: 'settings', label: 'Settings'})).toBe(false);
  });
});
