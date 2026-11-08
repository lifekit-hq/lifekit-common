import {BreakpointObserver} from '@angular/cdk/layout';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {BehaviorSubject} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {type CmnTile, TileGridComponent} from './tile-grid.component';
import {TilePanelDirective} from './tile-panel.directive';

function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`no ${what}`);
  }
  return value;
}

const TILES: readonly CmnTile[] = [
  {id: 'premium', label: 'Premium', headline: '£524.20'},
  {id: 'renews', label: 'Renews', headline: '14 Nov'},
  {id: 'quotes', label: 'Quotes', headline: '3'},
  {id: 'documents', label: 'Documents', headline: '2'},
  {id: 'drivers', label: 'Drivers', headline: '2'},
];

@Component({
  selector: 'cmn-tile-grid-host',
  imports: [TileGridComponent, TilePanelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button id="outside" type="button">Outside</button>
    <cmn-tile-grid [tiles]="tiles" [linkable]="linkable()" [(open)]="open" ariaLabel="Policy facts">
      <ng-template let-tile cmnTilePanel="premium">
        <p class="premium-body">Summary for {{ tile.label }}</p>
        <button class="premium-action" type="button">Evidence</button>
      </ng-template>
      <ng-template cmnTilePanel="renews"><p class="renews-body">Renewal evidence</p></ng-template>
    </cmn-tile-grid>
  `,
})
class HostComponent {
  public readonly tiles = TILES;
  public readonly open = signal<string | null>(null);
  public readonly linkable = signal(false);
}

describe('TileGridComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let wide: BehaviorSubject<{matches: boolean}>;

  const root = (): HTMLElement => fixture.nativeElement;
  const tileButtons = (): HTMLButtonElement[] =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('cmn-tile-grid > div > button'));
  const tile = (label: string): HTMLButtonElement =>
    found(
      tileButtons().find(button => button.textContent?.includes(label)),
      `tile ${label}`
    );
  const panel = (): HTMLElement | null => root().querySelector('section[role="region"]');
  /** Renders, then waits out the panel's fade so a closed panel has left the layout. */
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.all(
      root()
        .getAnimations({subtree: true})
        .map(animation => animation.finished.catch(() => undefined))
    );
    fixture.detectChanges();
  };
  const press = async (label: string): Promise<void> => {
    tile(label).click();
    await settle();
  };
  const pressEscape = async (target: HTMLElement): Promise<void> => {
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await settle();
  };
  /** The children of the grid in order: where the panel sits among the tiles. */
  const gridOrder = (): string[] =>
    Array.from(root().querySelectorAll('cmn-tile-grid > div > *')).map(child =>
      child.tagName === 'SECTION' ? 'panel' : (child.textContent?.trim().split(/\s+/)[0] ?? '')
    );

  async function create(isWide: boolean): Promise<void> {
    wide = new BehaviorSubject({matches: isWide});
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: {observe: () => wide, isMatched: () => wide.value.matches},
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('closed', () => {
    beforeEach(() => create(true));

    it('draws a button per tile with a label and a headline', () => {
      expect(tileButtons()).toHaveLength(TILES.length);
      expect(tile('Premium').textContent).toContain('£524.20');
    });

    it('marks every tile collapsed and draws no panel', () => {
      expect(tileButtons().every(b => b.getAttribute('aria-expanded') === 'false')).toBe(true);
      expect(tileButtons().every(b => !b.hasAttribute('aria-controls'))).toBe(true);
      expect(panel()).toBeNull();
    });

    it('names the tiles as a group when asked to', () => {
      expect(root().querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
        'Policy facts'
      );
    });
  });

  describe('opening', () => {
    beforeEach(() => create(true));

    it('opens the panel of the pressed tile and says so', async () => {
      await press('Premium');
      expect(tile('Premium').getAttribute('aria-expanded')).toBe('true');
      expect(tile('Premium').getAttribute('aria-controls')).toBe(panel()?.id);
      expect(panel()?.querySelector('.premium-body')?.textContent).toContain('Summary for Premium');
      expect(fixture.componentInstance.open()).toBe('premium');
    });

    it('repeats the tile in the panel header', async () => {
      await press('Premium');
      const header = panel()?.querySelector('header');
      expect(header?.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Premium £524.20'
      );
      expect(panel()?.getAttribute('aria-labelledby')).toBe(header?.querySelector('h2')?.id);
    });

    it('is exclusive: opening another tile closes the first', async () => {
      await press('Premium');
      await press('Renews');
      expect(tile('Premium').getAttribute('aria-expanded')).toBe('false');
      expect(tile('Renews').getAttribute('aria-expanded')).toBe('true');
      expect(root().querySelectorAll('section[role="region"]')).toHaveLength(1);
      expect(panel()?.querySelector('.renews-body')).not.toBeNull();
      expect(panel()?.querySelector('.premium-body')).toBeNull();
    });

    it('closes when the open tile is pressed again', async () => {
      await press('Premium');
      await press('Premium');
      expect(tile('Premium').getAttribute('aria-expanded')).toBe('false');
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('opens a tile named by the parent, with no focus move', async () => {
      fixture.componentInstance.open.set('renews');
      await settle();
      expect(tile('Renews').getAttribute('aria-expanded')).toBe('true');
      expect(panel()).not.toBeNull();
      expect(document.activeElement).not.toBe(panel());
    });

    it('draws a tile with no panel template as an empty panel with its header', async () => {
      await press('Quotes');
      expect(panel()?.querySelector('h2')?.textContent).toContain('3');
    });

    it('ignores an open id no tile has', async () => {
      fixture.componentInstance.open.set('nope');
      await settle();
      expect(panel()).toBeNull();
    });
  });

  describe('where the panel sits', () => {
    it('is under the clicked tile’s row of three on a wide screen', async () => {
      await create(true);
      await press('Premium');
      expect(gridOrder()).toEqual(['Premium', 'Renews', 'Quotes', 'panel', 'Documents', 'Drivers']);
      await press('Documents');
      expect(gridOrder()).toEqual(['Premium', 'Renews', 'Quotes', 'Documents', 'Drivers', 'panel']);
    });

    it('is under the clicked tile’s row of two on a phone', async () => {
      await create(false);
      await press('Quotes');
      expect(gridOrder()).toEqual(['Premium', 'Renews', 'Quotes', 'Documents', 'panel', 'Drivers']);
      await press('Renews');
      expect(gridOrder()).toEqual(['Premium', 'Renews', 'panel', 'Quotes', 'Documents', 'Drivers']);
    });

    it('follows a change of width while open', async () => {
      await create(true);
      await press('Premium');
      wide.next({matches: false});
      await settle();
      expect(gridOrder()).toEqual(['Premium', 'Renews', 'panel', 'Quotes', 'Documents', 'Drivers']);
    });

    it('ends the last, short row at its last tile', async () => {
      await create(false);
      await press('Drivers');
      expect(gridOrder().at(-1)).toBe('panel');
    });
  });

  describe('keyboard and screen reader', () => {
    beforeEach(() => create(true));

    it('moves focus into the panel when a tile opens it', async () => {
      await press('Premium');
      expect(document.activeElement).toBe(panel());
    });

    it('closes on Escape from inside the panel and returns focus to the tile', async () => {
      document.body.append(root());
      await press('Premium');
      await pressEscape(found(root().querySelector<HTMLElement>('.premium-action'), 'action'));
      expect(tile('Premium').getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(tile('Premium'));
      root().remove();
    });

    it('closes on Escape from a tile', async () => {
      await press('Premium');
      await pressEscape(tile('Renews'));
      expect(panel()).toBeNull();
    });

    it('lets Escape through when nothing is open', async () => {
      const outer = vi.fn();
      document.body.addEventListener('keydown', outer);
      document.body.append(root());
      await pressEscape(tile('Premium'));
      expect(outer).toHaveBeenCalled();
      document.body.removeEventListener('keydown', outer);
      root().remove();
    });

    it('does not let an Escape that closed the panel reach an enclosing overlay', async () => {
      const outer = vi.fn();
      document.body.addEventListener('keydown', outer);
      document.body.append(root());
      await press('Premium');
      await pressEscape(tile('Premium'));
      expect(outer).not.toHaveBeenCalled();
      document.body.removeEventListener('keydown', outer);
      root().remove();
    });

    it('closes from the close button, named for the tile, and returns focus to the tile', async () => {
      document.body.append(root());
      await press('Renews');
      const close = found(
        panel()?.querySelector<HTMLButtonElement>('header button'),
        'close button'
      );
      expect(close.getAttribute('aria-label')).toBe('Close Renews');
      close.click();
      await settle();
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(tile('Renews'));
      root().remove();
    });

    it('lets the tiles be reached in order with Tab (each is a native button)', () => {
      expect(tileButtons().every(b => b.type === 'button' && b.tabIndex === 0)).toBe(true);
    });
  });
});

describe('TileGridComponent linkable', () => {
  let harness: RouterTestingHarness;

  const grid = (): HTMLElement => found(harness.routeNativeElement, 'route element');
  const tile = (label: string): HTMLButtonElement =>
    found(
      Array.from(grid().querySelectorAll<HTMLButtonElement>('cmn-tile-grid > div > button')).find(
        b => b.textContent?.includes(label)
      ),
      `tile ${label}`
    );

  @Component({
    imports: [TileGridComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<cmn-tile-grid [tiles]="tiles" [linkable]="true" />',
  })
  class LinkableHostComponent {
    public readonly tiles = TILES;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{path: 'detail', component: LinkableHostComponent}])],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  it('opens the tile named by the fragment on load', async () => {
    await harness.navigateByUrl('/detail#renews');
    harness.detectChanges();
    expect(tile('Renews').getAttribute('aria-expanded')).toBe('true');
  });

  it('ignores a fragment no tile has', async () => {
    await harness.navigateByUrl('/detail#elsewhere');
    harness.detectChanges();
    expect(grid().querySelector('section')).toBeNull();
  });

  it('writes the open tile to the fragment, keeping the query, and clears it on close', async () => {
    await harness.navigateByUrl('/detail?month=nov');
    tile('Quotes').click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/detail?month=nov#quotes');
    tile('Quotes').click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/detail?month=nov');
  });

  it('follows the fragment when it changes', async () => {
    await harness.navigateByUrl('/detail#renews');
    await harness.navigateByUrl('/detail#documents');
    harness.detectChanges();
    expect(tile('Documents').getAttribute('aria-expanded')).toBe('true');
    expect(tile('Renews').getAttribute('aria-expanded')).toBe('false');
    await harness.navigateByUrl('/detail');
    harness.detectChanges();
    expect(grid().querySelector('section')).toBeNull();
  });
});

describe('TileGridComponent without a router', () => {
  it('works with linkable on, treating it as off', async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.linkable.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('cmn-tile-grid button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});
