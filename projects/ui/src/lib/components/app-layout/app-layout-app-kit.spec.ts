import {BreakpointObserver} from '@angular/cdk/layout';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {provideAppVersion} from '../../tokens/app-version';
import {type CommandPaletteItem} from '../command-palette/command-palette-item.model';
import {MorePageComponent} from '../more-page/more-page.component';
import {
  ACCOUNT_SIGN_OUT_ID,
  accountMenu,
  APPEARANCE_PALETTE_ITEMS,
  type AppLayoutAccount,
  AppLayoutComponent,
  type NavItem,
  type PwaNotice,
} from './app-layout.component';

const NAV: NavItem[] = [
  {label: 'Dashboard', route: '/dashboard', icon: 'LayoutDashboard'},
  {label: 'Accounts', route: '/accounts', icon: 'Building2'},
  {label: 'Rules', route: '/rules', icon: 'ListFilter'},
];
const ACCOUNT: AppLayoutAccount = {
  label: 'Ada',
  menuItems: accountMenu({settingsRoute: '/settings'}),
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLayoutComponent, MorePageComponent],
  template: `
    <cmn-app-layout
      [navItems]="nav"
      [tabRoutes]="['/dashboard']"
      [account]="account()"
      [pwaNotices]="notices()"
      [paletteItems]="palette()"
      [paletteExtras]="extras()"
      (signOut)="signOuts = signOuts + 1"
      (paletteAction)="actions.push($event)"
      moreRoute="/more"
    >
      <cmn-more-page />
    </cmn-app-layout>
  `,
})
class HostComponent {
  public nav = NAV;
  public readonly account = signal<AppLayoutAccount | undefined>(ACCOUNT);
  public readonly notices = signal<boolean | readonly PwaNotice[]>(false);
  public readonly palette = signal<CommandPaletteItem[] | undefined>(undefined);
  public readonly extras = signal<CommandPaletteItem[]>([]);
  public signOuts = 0;
  public readonly actions: string[] = [];
}

describe('AppLayoutComponent app-kit glue', () => {
  let fixture: ComponentFixture<HostComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function setup(mode: 'sidebar' | 'phone' = 'sidebar'): void {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        provideAppVersion('1.2.3'),
        {provide: BreakpointObserver, useValue: new PinnedBreakpointObserver(mode)},
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  }

  /** Opens the palette with the dialog stubbed, returns the entries it was given and picks `result`. */
  function openPalette(result?: unknown): CommandPaletteItem[] {
    const open = vi.fn(() => ({
      afterClosed: () => ({subscribe: (fn: (r: unknown) => void) => fn(result)}),
      close: vi.fn(),
    }));
    vi.spyOn(TestBed.inject(CmnDialogService), 'open').mockImplementation(open as never);
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', ctrlKey: true}));
    return (open.mock.calls[0] as unknown as [unknown, {data: CommandPaletteItem[]}])[1].data;
  }

  afterEach(() => vi.restoreAllMocks());

  describe('palette', () => {
    beforeEach(() => setup());

    it('should derive pages, Settings, appearance, Sign out and the extras when paletteItems is omitted', () => {
      fixture.componentInstance.extras.set([
        {id: '_export', label: 'Export', icon: 'Download', group: 'Actions'},
      ]);
      fixture.detectChanges();
      const ids = openPalette().map(item => item.id);
      expect(ids).toEqual([
        '/dashboard',
        '/accounts',
        '/rules',
        '/settings',
        ...APPEARANCE_PALETTE_ITEMS.map(item => item.id),
        ACCOUNT_SIGN_OUT_ID,
        '_export',
      ]);
    });

    it('should leave out Sign out and Settings when the account menu has neither', () => {
      fixture.componentInstance.account.set({
        label: 'Ada',
        menuItems: accountMenu({signOut: false}),
      });
      fixture.detectChanges();
      const ids = openPalette().map(item => item.id);
      expect(ids).not.toContain(ACCOUNT_SIGN_OUT_ID);
      expect(ids).not.toContain('/settings');
    });

    it('should use an explicit paletteItems as the whole list', () => {
      fixture.componentInstance.palette.set([]);
      fixture.detectChanges();
      expect(openPalette()).toEqual([]);
    });

    it('should fire signOut, not paletteAction, for the Sign out entry', () => {
      openPalette({type: 'action', id: ACCOUNT_SIGN_OUT_ID});
      expect(fixture.componentInstance.signOuts).toBe(1);
      expect(fixture.componentInstance.actions).toEqual([]);
    });

    it('should still report other palette actions', () => {
      openPalette({type: 'action', id: '_export'});
      expect(fixture.componentInstance.actions).toEqual(['_export']);
    });
  });

  describe('signOut', () => {
    beforeEach(() => setup());

    it('should fire for the account menu item', () => {
      const layout = fixture.debugElement.children[0].componentInstance as AppLayoutComponent;
      (layout as unknown as {onAvatarMenuSelect(item: unknown): void}).onAvatarMenuSelect(
        ACCOUNT.menuItems.find(item => item.id === ACCOUNT_SIGN_OUT_ID)
      );
      expect(fixture.componentInstance.signOuts).toBe(1);
    });

    it('should not fire for Settings', () => {
      const layout = fixture.debugElement.children[0].componentInstance as AppLayoutComponent;
      (layout as unknown as {onAvatarMenuSelect(item: unknown): void}).onAvatarMenuSelect(
        ACCOUNT.menuItems[0]
      );
      expect(fixture.componentInstance.signOuts).toBe(0);
    });
  });

  describe('sidebar navigation', () => {
    it('should navigate on a sidebar click outside the phone', () => {
      setup('sidebar');
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
      Array.from(host().querySelectorAll<HTMLElement>('cmn-sidebar-nav button'))
        .find(button => button.textContent?.includes('Accounts'))
        ?.click();
      expect(navigate).toHaveBeenCalledWith('/accounts');
    });
  });

  describe('pwa notices', () => {
    it('should render none by default', () => {
      setup();
      expect(
        host().querySelector('lk-update-prompt, lk-offline-banner, lk-install-hint')
      ).toBeNull();
    });

    it('should render all three for true, in order', () => {
      setup();
      fixture.componentInstance.notices.set(true);
      fixture.detectChanges();
      const tags = Array.from(host().querySelectorAll('[data-cmn-notices] > *')).map(el =>
        el.tagName.toLowerCase()
      );
      expect(tags).toEqual(['lk-update-prompt', 'lk-offline-banner', 'lk-install-hint']);
      expect(customElements.get('lk-offline-banner')).toBeDefined();
    });

    it('should render only the notices named', () => {
      setup();
      fixture.componentInstance.notices.set(['offline']);
      fixture.detectChanges();
      const tags = Array.from(host().querySelectorAll('[data-cmn-notices] > *')).map(el =>
        el.tagName.toLowerCase()
      );
      expect(tags).toEqual(['lk-offline-banner']);
    });
  });

  describe('version and More page', () => {
    it('should show the provideAppVersion label in the sidebar', () => {
      setup('sidebar');
      expect(host().querySelector('cmn-sidebar-nav')?.textContent).toContain('v1.2.3');
    });

    it('should let a More page in the layout read items, account and version from it', async () => {
      setup('phone');
      await TestBed.inject(Router).navigateByUrl('/more');
      fixture.detectChanges();
      const more = host().querySelector('cmn-more-page') as HTMLElement;
      // Rules is the only nav item past the one tab; the account has Settings and Sign out.
      expect(more.querySelector('[data-more-section="nav"]')?.textContent).toContain('Accounts');
      expect(more.querySelector('[data-more-section="nav"]')?.textContent).not.toContain(
        'Dashboard'
      );
      expect(more.textContent).toContain('Settings');
      expect(more.querySelector('[data-more-version]')?.textContent).toContain('v1.2.3');
    });

    it('should fire the layout signOut from the More page Sign out row', () => {
      setup('phone');
      const rows = Array.from(host().querySelectorAll<HTMLButtonElement>('cmn-more-page button'));
      rows.find(row => row.textContent?.includes('Sign out'))?.click();
      expect(fixture.componentInstance.signOuts).toBe(1);
    });
  });
});
