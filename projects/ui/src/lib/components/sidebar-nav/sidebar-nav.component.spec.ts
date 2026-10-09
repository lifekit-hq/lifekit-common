import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';

import type {NavItem} from './sidebar-nav.component';
import {SidebarNavComponent} from './sidebar-nav.component';

const ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SidebarNavComponent],
  template: `
    <cmn-sidebar-nav
      [items]="items"
      [versionDot]="dot()"
      [rail]="rail"
      (versionClick)="clicks = clicks + 1"
      versionLabel="v1.15.0 · Release notes"
    />
  `,
})
class ListeningHostComponent {
  public readonly items = ITEMS;
  public readonly dot = signal(false);
  public rail = false;
  public clicks = 0;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SidebarNavComponent],
  template: '<cmn-sidebar-nav [items]="items" [versionDot]="true" versionLabel="v1.15.0" />',
})
class SilentHostComponent {
  public readonly items = ITEMS;
}

describe('SidebarNavComponent', () => {
  let fixture: ComponentFixture<SidebarNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNavComponent, ListeningHostComponent, SilentHostComponent],
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
  describe('version footer', () => {
    function footerButton(root: HTMLElement): HTMLButtonElement | null {
      return root.querySelector<HTMLButtonElement>('aside > button');
    }

    it('should render nothing without a version label', () => {
      expect(fixture.nativeElement.querySelector('aside > button')).toBeNull();
      expect(fixture.nativeElement.querySelector('aside > div:last-child')).toBeNull();
    });

    it('should stay static text, with no button and no dot, when nothing listens to versionClick', () => {
      const host = TestBed.createComponent(SilentHostComponent);
      host.detectChanges();
      const el = host.nativeElement as HTMLElement;
      expect(footerButton(el)).toBeNull();
      expect(el.querySelector('.cmn-badge-indicator')).toBeNull();
      const footer = el.querySelector('aside > div:last-child');
      expect(footer?.textContent?.trim()).toBe('v1.15.0');
    });

    it('should become a button named by its label that emits versionClick', () => {
      const host = TestBed.createComponent(ListeningHostComponent);
      host.detectChanges();
      const button = footerButton(host.nativeElement);
      expect(button?.type).toBe('button');
      expect(button?.textContent?.trim()).toBe('v1.15.0 · Release notes');

      button?.click();
      button?.click();
      expect(host.componentInstance.clicks).toBe(2);
    });

    it('should show the dot only while versionDot is set, and say so to assistive tech', () => {
      const host = TestBed.createComponent(ListeningHostComponent);
      host.detectChanges();
      const el = host.nativeElement as HTMLElement;
      expect(el.querySelector('.cmn-badge-indicator')).toBeNull();
      expect(footerButton(el)?.textContent).not.toContain('new');

      host.componentInstance.dot.set(true);
      host.detectChanges();
      expect(el.querySelector('aside > button .cmn-badge-indicator')).not.toBeNull();
      expect(footerButton(el)?.textContent).toContain('(new)');
    });

    it('should keep the button, its name and its dot when the sidebar is a rail', () => {
      const host = TestBed.createComponent(ListeningHostComponent);
      host.componentInstance.dot.set(true);
      host.componentInstance.rail = true;
      host.detectChanges();
      const el = host.nativeElement as HTMLElement;
      const button = footerButton(el);
      expect(button?.getAttribute('aria-label')).toBe('v1.15.0 · Release notes (new)');
      expect(button?.getAttribute('title')).toBe('v1.15.0 · Release notes');
      expect(button?.textContent).not.toContain('v1.15.0');
      expect(button?.querySelector('.cmn-badge-indicator')).not.toBeNull();

      host.componentInstance.dot.set(false);
      host.detectChanges();
      expect(footerButton(el)?.getAttribute('aria-label')).toBe('v1.15.0 · Release notes');
    });

    it('should take versionClickable over listener detection', () => {
      fixture.componentRef.setInput('versionLabel', 'v1.15.0');
      fixture.componentRef.setInput('versionClickable', true);
      fixture.detectChanges();
      expect(footerButton(fixture.nativeElement)).not.toBeNull();

      fixture.componentRef.setInput('versionClickable', false);
      fixture.detectChanges();
      expect(footerButton(fixture.nativeElement)).toBeNull();
    });
  });
});
