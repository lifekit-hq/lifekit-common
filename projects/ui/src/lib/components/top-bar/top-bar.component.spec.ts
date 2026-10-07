import {OverlayContainer} from '@angular/cdk/overlay';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {type PageAction} from '../app-layout/page-chrome';
import {type MenuItem} from '../menu/menu.component';
import {TopBarComponent} from './top-bar.component';

const AVATAR_MENU_ITEMS: MenuItem[] = [
  {id: '/settings', label: 'Settings', icon: 'Settings2'},
  {id: '_logout', label: 'Log out', icon: 'LogOut', destructive: true},
];

describe('TopBarComponent', () => {
  let fixture: ComponentFixture<TopBarComponent>;
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TopBarComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    fixture.componentRef.setInput('avatarMenuItems', AVATAR_MENU_ITEMS);
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the title', () => {
    fixture.componentRef.setInput('title', 'Dashboard');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Dashboard');
  });

  it('should render no heading when no title is set', () => {
    expect(fixture.nativeElement.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
  });

  it('should emit searchClick when search button is clicked', () => {
    const emitted: void[] = [];
    fixture.componentInstance.searchClick.subscribe(() => emitted.push(undefined));
    const btn = fixture.debugElement.queryAll(By.css('button'))[0];
    btn.triggerEventHandler('click', null);
    expect(emitted.length).toBe(1);
  });

  it('should give the icon buttons accessible names', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('button[aria-label="Search"]')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Toggle theme"]')).toBeTruthy();
  });

  it('should not render the theme toggle when showThemeToggle is false', () => {
    fixture.componentRef.setInput('showThemeToggle', false);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('button[aria-label="Toggle theme"]')).toBeNull();
  });

  it('should show avatar initial from avatarLabel', () => {
    fixture.componentRef.setInput('avatarLabel', 'Denys');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('D');
  });

  it.each([
    ['DT', 'DT'],
    ['dt', 'DT'],
    ['D', 'D'],
    ['Al', 'AL'],
    ['Denys', 'D'],
    ['Denys Taran', 'DT'],
    ['Al Smith', 'AS'],
    ['Denys Ivanovych Taran', 'DI'],
    ['  Denys   Taran  ', 'DT'],
    ['', '?'],
    ['   ', '?'],
  ])('should render avatar "%s" as "%s"', (label, expected) => {
    fixture.componentRef.setInput('avatarLabel', label);
    fixture.detectChanges();
    expect(fixture.componentInstance.avatarInitial()).toBe(expected);
    const trigger = fixture.nativeElement.querySelector(
      'button[aria-label="Account menu"]'
    ) as HTMLElement | null;
    expect(trigger?.textContent?.trim()).toBe(expected);
  });

  it('should render the avatar menu trigger and open the menu on click', () => {
    fixture.componentRef.setInput('avatarLabel', 'Denys');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[2]?.triggerEventHandler('click', new MouseEvent('click'));
    fixture.detectChanges();

    expect(overlayContainer.getContainerElement().textContent).toContain('Settings');
    expect(overlayContainer.getContainerElement().textContent).toContain('Log out');
  });

  it('should render a solid header with no safe-area padding by default', () => {
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    expect(header.classList).toContain('bg-surface-card');
    expect(header.className).not.toContain('safe-area-inset-top');
    expect(header.className).not.toContain('backdrop-blur');
  });

  it('should render a translucent, blurred, safe-area-padded header below md in overlay mode', () => {
    fixture.componentRef.setInput('overlay', true);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    expect(header.classList).toContain('max-md:pt-[env(safe-area-inset-top)]');
    expect(header.classList).toContain('max-md:backdrop-blur-md');
    expect(header.className).toContain('max-md:bg-[color-mix(');
    // Desktop keeps the solid surface.
    expect(header.classList).toContain('bg-surface-card');
  });

  describe('page chrome', () => {
    const ACTIONS: PageAction[] = [
      {id: 'add', label: 'Add account', icon: 'Plus'},
      {id: 'share', label: 'Share', icon: 'Share'},
    ];

    const query = (selector: string): HTMLElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector(selector);

    it('should render no back chevron by default', () => {
      expect(query('button[aria-label="Back"]')).toBeNull();
    });

    it('should render a text-less back chevron first and emit backClick', () => {
      fixture.componentRef.setInput('title', 'Account');
      fixture.componentRef.setInput('showBack', true);
      fixture.detectChanges();
      let backs = 0;
      fixture.componentInstance.backClick.subscribe(() => backs++);
      const back = query('button[aria-label="Back"]');
      expect(query('header')?.firstElementChild).toBe(back);
      expect(back?.textContent?.trim()).toBe('');
      back?.click();
      expect(backs).toBe(1);
    });

    it('should give back and actions a 44px target below md', () => {
      fixture.componentRef.setInput('showBack', true);
      fixture.componentRef.setInput('actions', ACTIONS);
      fixture.detectChanges();
      for (const button of [
        query('button[aria-label="Back"]'),
        query('button[aria-label="Share"]'),
      ]) {
        expect(button?.classList).toContain('h-11');
        expect(button?.classList).toContain('w-11');
      }
    });

    it('should render each action as a labelled icon button and emit the pressed one', () => {
      fixture.componentRef.setInput('actions', ACTIONS);
      fixture.detectChanges();
      const pressed: PageAction[] = [];
      fixture.componentInstance.actionClick.subscribe(action => pressed.push(action));
      const share = query('button[aria-label="Share"]');
      expect(share?.getAttribute('title')).toBe('Share');
      share?.click();
      expect(pressed).toEqual([ACTIONS[1]]);
    });

    it('should place actions before the search trigger', () => {
      fixture.componentRef.setInput('actions', ACTIONS);
      fixture.detectChanges();
      const labels = fixture.debugElement
        .queryAll(By.css('header > button'))
        .map(button => button.nativeElement.getAttribute('aria-label'));
      expect(labels.slice(0, 3)).toEqual(['Add account', 'Share', 'Search']);
    });

    it('should hide the inline title, as a non-heading, while the large title is in view', () => {
      fixture.componentRef.setInput('title', 'Accounts');
      fixture.componentRef.setInput('largeTitle', 'visible');
      fixture.detectChanges();
      const inline = query('[data-inline-title]');
      expect(query('h1')).toBeNull();
      expect(inline?.textContent?.trim()).toBe('Accounts');
      expect(inline?.getAttribute('aria-hidden')).toBe('true');
      expect(inline?.classList).toContain('opacity-0');
      expect(inline?.classList).toContain('motion-reduce:transition-none');
    });

    it('should fade the inline title in once the large title has collapsed', () => {
      fixture.componentRef.setInput('title', 'Accounts');
      fixture.componentRef.setInput('largeTitle', 'collapsed');
      fixture.detectChanges();
      expect(query('h1')).toBeNull();
      expect(query('[data-inline-title]')?.classList).not.toContain('opacity-0');
    });
  });
});
