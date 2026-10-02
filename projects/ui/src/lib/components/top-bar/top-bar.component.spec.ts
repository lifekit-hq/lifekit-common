import {OverlayContainer} from '@angular/cdk/overlay';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

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
    ['Denys Taran', 'DT'],
    ['Denys', 'D'],
    ['', '?'],
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
});
