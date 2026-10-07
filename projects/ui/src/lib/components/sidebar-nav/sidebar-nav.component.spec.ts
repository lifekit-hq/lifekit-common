import {type ComponentFixture, TestBed} from '@angular/core/testing';

import type {NavItem} from './sidebar-nav.component';
import {SidebarNavComponent} from './sidebar-nav.component';

const ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
];

describe('SidebarNavComponent', () => {
  let fixture: ComponentFixture<SidebarNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNavComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nav item labels when expanded', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Dashboard');
    expect(text).toContain('Accounts');
  });

  it('should show the Lifekit brand by default', () => {
    expect(fixture.nativeElement.textContent).toContain('Lifekit');
  });

  it('should show a custom brand instead of the default', () => {
    fixture.componentRef.setInput('brand', 'Acme Console');
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Acme Console');
    expect(text).not.toContain('Lifekit');
  });

  it('should switch width on collapse without tweening it', () => {
    const aside = (fixture.nativeElement as HTMLElement).querySelector('aside');
    expect(aside?.classList).toContain('w-60');
    expect(aside?.className).not.toContain('transition-[width]');
    fixture.componentInstance.toggleCollapsed();
    fixture.detectChanges();
    expect(aside?.classList).toContain('w-16');
    expect(aside?.className).not.toContain('transition-[width]');
  });

  it('should collapse when toggle is clicked', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[title="Collapse sidebar"]'
    );
    btn?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.collapsed()).toBe(true);
  });

  it('should give the collapse control an accessible name that tracks its state', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Collapse sidebar"]'
    );
    expect(btn?.getAttribute('aria-expanded')).toBe('true');
    btn?.click();
    fixture.detectChanges();
    expect(btn?.getAttribute('aria-label')).toBe('Expand sidebar');
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('should emit navClick when a nav item is clicked', () => {
    const emitted: NavItem[] = [];
    fixture.componentInstance.navClick.subscribe((item: NavItem) => emitted.push(item));
    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('nav button');
    buttons[0]?.click();
    expect(emitted.length).toBe(1);
    expect(emitted[0].route).toBe('/dashboard');
  });

  describe('as a rail', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rail', true);
      fixture.detectChanges();
    });

    it('should collapse to icons, titled by label, with no brand text', () => {
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('aside')?.classList).toContain('w-16');
      expect(host.textContent).not.toContain('Dashboard');
      expect(host.textContent).not.toContain('Lifekit');
      expect(host.querySelector('nav button')?.getAttribute('title')).toBe('Dashboard');
    });

    it('should offer no toggle to widen it', () => {
      expect(fixture.nativeElement.querySelector('button[aria-label$="sidebar"]')).toBeNull();
    });

    it('should give the reader their own collapsed choice back once it is no longer a rail', () => {
      fixture.componentRef.setInput('rail', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('aside')?.classList).toContain('w-60');
      fixture.componentInstance.toggleCollapsed();
      fixture.componentRef.setInput('rail', true);
      fixture.componentRef.setInput('rail', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('aside')?.classList).toContain('w-16');
    });
  });
});
