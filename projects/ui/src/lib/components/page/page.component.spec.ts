import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router, RouterOutlet, type Routes} from '@angular/router';
import {beforeEach, describe, expect, it} from 'vitest';

import {AppLayoutComponent} from '../app-layout/app-layout.component';
import {PageFrameService} from '../app-layout/page-frame';
import {PAGE_TEMPLATES, PageComponent, type PageKind} from './page.component';

describe('PageComponent', () => {
  @Component({
    imports: [PageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-page [kind]="kind()" [title]="title()" [fill]="fill()">
        <p class="first">First block</p>
        <p class="second">Second block</p>
      </cmn-page>
    `,
  })
  class HostComponent {
    public readonly kind = signal<PageKind>('list');
    public readonly title = signal('Tasks');
    public readonly fill = signal(false);
  }

  let fixture: ComponentFixture<HostComponent>;
  const page = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('cmn-page') as HTMLElement;
  const frame = (): HTMLElement => page().firstElementChild as HTMLElement;
  const column = (): HTMLElement => page().querySelector('[data-cmn-page-column]') as HTMLElement;
  const title = (): HTMLElement | null => page().querySelector('h1');

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('marks its kind, list by default, for the screen check', () => {
    expect(page().getAttribute('data-cmn-page')).toBe('list');
    expect(page().classList).toContain('block');
  });

  it('owns the frame: the 1200px cap, centred, with the page gutter on every side', () => {
    for (const cls of ['mx-auto', 'w-full', 'max-w-[1200px]', 'p-cmn-page-gutter']) {
      expect(frame().classList).toContain(cls);
    }
  });

  it('draws the large title on the left edge with the title gap under it', () => {
    expect(title()?.textContent?.trim()).toBe('Tasks');
    expect(title()?.hasAttribute('data-cmn-page-title')).toBe(true);
    expect(title()?.classList).toContain('mb-cmn-title-gap');
    expect(title()?.parentElement).toBe(frame());
    expect(title()?.nextElementSibling).toBe(column());
  });

  it('draws no title when there is none to show', () => {
    fixture.componentInstance.title.set('');
    fixture.detectChanges();
    expect(title()).toBeNull();
    expect(frame().firstElementChild).toBe(column());
  });

  it('stacks the projected blocks a section apart in the list reading width', () => {
    expect(column().classList).toContain('max-w-[640px]');
    expect(column().classList).toContain('gap-cmn-section-gap');
    expect(column().classList).toContain('flex-col');
    expect(column().querySelector('.first')).not.toBeNull();
    expect(column().querySelector('.second')).not.toBeNull();
  });

  it.each([
    ['detail', 'max-w-[720px]'],
    ['form', 'max-w-[640px]'],
    ['settings', 'max-w-[720px]'],
  ] as const)('marks a %s page and gives its one column the %s reading width', (kind, width) => {
    fixture.componentInstance.kind.set(kind);
    fixture.detectChanges();
    expect(page().getAttribute('data-cmn-page')).toBe(kind);
    expect(page().querySelectorAll('[data-cmn-page-column]')).toHaveLength(1);
    expect(column().classList).toContain(width);
    expect(column().classList).toContain('gap-cmn-section-gap');
    for (const other of Object.values(PAGE_TEMPLATES)) {
      if (other.column !== width) {
        expect(column().classList).not.toContain(other.column);
      }
    }
  });

  it('keeps every single-column kind inside the 640 to 720px reading band', () => {
    for (const template of Object.values(PAGE_TEMPLATES).filter(each => !each.rail)) {
      const width = Number(/max-w-\[(\d+)px\]/.exec(template.column)?.[1]);
      expect(width).toBeGreaterThanOrEqual(640);
      expect(width).toBeLessThanOrEqual(720);
    }
  });

  it('draws no rail and leaves rail blocks out on a single-column kind', () => {
    expect(page().querySelector('[data-cmn-page-column="rail"]')).toBeNull();
  });

  it('becomes a full-height column that the shell bounds when it fills', () => {
    expect(page().hasAttribute('data-cmn-fill')).toBe(false);
    fixture.componentInstance.fill.set(true);
    fixture.detectChanges();
    expect(page().hasAttribute('data-cmn-fill')).toBe(true);
    expect(page().classList).toContain('min-h-full');
    expect(frame().classList).toContain('flex-1');
    expect(column().classList).toContain('flex-1');
    expect(column().classList).toContain('min-h-0');
  });
});

describe('PageComponent overview', () => {
  @Component({
    imports: [PageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-page [kind]="kind()" [fill]="fill()" title="This week">
        <div class="stats">Stats</div>
        @if (rail()) {
          <section cmnPageRail class="coming-up">Coming up</section>
        }
        <section class="due">Due today</section>
        @if (rail()) {
          <section cmnPageRail class="people">People</section>
        }
      </cmn-page>
    `,
  })
  class OverviewHostComponent {
    public readonly kind = signal<PageKind>('overview');
    public readonly rail = signal(true);
    public readonly fill = signal(false);
  }

  let fixture: ComponentFixture<OverviewHostComponent>;
  const page = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('cmn-page') as HTMLElement;
  const columns = (): HTMLElement[] =>
    Array.from(page().querySelectorAll('[data-cmn-page-column]'));
  const main = (): HTMLElement => columns()[0];
  const rail = (): HTMLElement =>
    page().querySelector('[data-cmn-page-column="rail"]') as HTMLElement;
  const classesOf = (el: Element): string[] =>
    Array.from(el.children).map(child => child.className);

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewHostComponent);
    fixture.detectChanges();
  });

  it('marks an overview page with a main column and a rail, in that order', () => {
    expect(page().getAttribute('data-cmn-page')).toBe('overview');
    expect(columns().map(column => column.getAttribute('data-cmn-page-column'))).toEqual([
      '',
      'rail',
    ]);
    expect(main().parentElement).toBe(rail().parentElement);
    expect(page().querySelector('h1')?.nextElementSibling).toBe(main().parentElement);
  });

  it('projects the blocks marked cmnPageRail into the rail and the rest into the main column', () => {
    expect(classesOf(main())).toEqual(['stats', 'due']);
    expect(classesOf(rail())).toEqual(['coming-up', 'people']);
  });

  it('runs the main column the frame wide, with no reading width, and the rail 320px from xl', () => {
    for (const cls of ['flex-col', 'gap-cmn-section-gap', 'xl:flex-1', 'xl:min-w-0']) {
      expect(main().classList).toContain(cls);
    }
    expect(Array.from(main().classList).some(cls => cls.startsWith('max-w-'))).toBe(false);
    for (const cls of ['flex-col', 'gap-cmn-section-gap', 'xl:w-[320px]', 'xl:shrink-0']) {
      expect(rail().classList).toContain(cls);
    }
  });

  it('stacks the rail under the main column, a section apart, and puts it beside from xl', () => {
    const row = main().parentElement as HTMLElement;
    for (const cls of [
      'cmn-page-columns',
      'flex',
      'flex-col',
      'gap-cmn-section-gap',
      'xl:flex-row',
      'xl:items-start',
    ]) {
      expect(row.classList).toContain(cls);
    }
  });

  it('leaves the rail empty, so it takes no room, when the page marks no block for it', () => {
    fixture.componentInstance.rail.set(false);
    fixture.detectChanges();
    expect(rail().classList).toContain('empty:hidden');
    expect(rail().matches(':empty')).toBe(true);
    expect(classesOf(main())).toEqual(['stats', 'due']);
  });

  it('keeps the main blocks when the kind changes to one without a rail', () => {
    fixture.componentInstance.kind.set('list');
    fixture.detectChanges();
    expect(columns()).toHaveLength(1);
    expect(classesOf(main())).toEqual(['stats', 'due']);
    expect(main().classList).toContain(PAGE_TEMPLATES.list.column);
  });

  it('lets the main column and the rail take the remaining height when it fills', () => {
    fixture.componentInstance.fill.set(true);
    fixture.detectChanges();
    const row = main().parentElement as HTMLElement;
    expect(row.classList).toContain('flex-1');
    expect(row.classList).toContain('min-h-0');
    expect(main().classList).toContain('flex-1');
  });
});

describe('PageComponent in the app shell', () => {
  /** What the list page declares as its own title. */
  const declared = signal('');

  @Component({
    selector: 'cmn-test-list-page',
    imports: [PageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-page [title]="title()">
        <div class="tall" style="height: 3000px">Rows</div>
      </cmn-page>
    `,
  })
  class ListPageComponent {
    protected readonly title = declared;
  }

  @Component({
    selector: 'cmn-test-plain-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<p>Plain</p>',
  })
  class PlainPageComponent {}

  const ROUTES: Routes = [
    {path: 'tasks', component: ListPageComponent, data: {title: 'Tasks'}},
    {path: 'declared', component: ListPageComponent},
    {path: 'plain', component: PlainPageComponent, data: {title: 'Plain'}},
  ];

  @Component({
    imports: [AppLayoutComponent, RouterOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-app-layout>
        <div cmnAppLayoutNotice class="notice">Offline</div>
        <router-outlet />
      </cmn-app-layout>
    `,
  })
  class ShellComponent {}

  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const titles = (): HTMLElement[] => Array.from(host().querySelectorAll('main h1'));
  const inlineTitle = (): HTMLElement | null =>
    host().querySelector('cmn-top-bar [data-inline-title]');

  async function go(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(ROUTES)],
    }).compileComponents();
    router = TestBed.inject(Router);
    declared.set('');
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  it('draws the route title once, inside the page, and the shell steps aside', async () => {
    await go('/tasks');
    expect(titles().length).toBe(1);
    expect(titles()[0].closest('cmn-page')).not.toBeNull();
    expect(titles()[0].textContent?.trim()).toBe('Tasks');
    expect(inlineTitle()?.textContent?.trim()).toBe('Tasks');
  });

  it('hands the title back to the shell on a page without a template', async () => {
    await go('/tasks');
    await go('/plain');
    expect(titles().length).toBe(1);
    expect(titles()[0].closest('cmn-page')).toBeNull();
    expect(titles()[0].textContent?.trim()).toBe('Plain');
  });

  it('shows the title a page declares when its route declares none, in the bar too', async () => {
    await go('/declared');
    declared.set('Inbox');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(titles().map(title => title.textContent?.trim())).toEqual(['Inbox']);
    expect(inlineTitle()?.textContent?.trim()).toBe('Inbox');
  });

  it('puts the notices above the page title, inset by the page gutter', async () => {
    await go('/tasks');
    const notices = host().querySelector('[data-cmn-notices]') as HTMLElement;
    for (const cls of ['px-cmn-page-gutter', 'max-w-[1200px]', 'mx-auto', 'bg-surface-bg']) {
      expect(notices.classList).toContain(cls);
    }
    const order = notices.compareDocumentPosition(titles()[0]);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('collapses the page’s own title into the bar once it scrolls away', async () => {
    await go('/tasks');
    const main = host().querySelector('main') as HTMLElement;
    main.style.display = 'block';
    main.style.height = '400px';
    main.style.overflowY = 'auto';
    const settle = async (): Promise<void> => {
      await new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve)))
      );
      fixture.detectChanges();
    };
    await settle();
    expect(inlineTitle()?.classList).toContain('opacity-0');
    main.scrollTop = 600;
    await settle();
    expect(inlineTitle()?.classList).not.toContain('opacity-0');
  });

  it('releases the title when the page goes', async () => {
    const frame = fixture.debugElement
      .query(debug => debug.componentInstance instanceof AppLayoutComponent)
      .injector.get(PageFrameService);
    await go('/tasks');
    expect(frame.pageOwnsTitle()).toBe(true);
    expect(frame.titleElement()).toBe(titles()[0]);
    await go('/plain');
    expect(frame.pageOwnsTitle()).toBe(false);
    expect(frame.titleElement()).toBeNull();
  });
});

describe('PageFrameService', () => {
  it('keeps a newer page’s title when an older page clears its own', () => {
    const frame = new PageFrameService();
    const older = document.createElement('h1');
    const newer = document.createElement('h1');
    frame.setTitle(older, 'Old');
    frame.setTitle(newer, 'New');
    frame.clearTitle(older);
    expect(frame.titleElement()).toBe(newer);
    expect(frame.declaredTitle()).toBe('New');
    frame.clearTitle(newer);
    expect(frame.titleElement()).toBeNull();
    expect(frame.declaredTitle()).toBe('');
  });

  it('never counts below zero owners', () => {
    const frame = new PageFrameService();
    frame.release();
    expect(frame.pageOwnsTitle()).toBe(false);
    frame.claim();
    frame.claim();
    frame.release();
    expect(frame.pageOwnsTitle()).toBe(true);
  });

  it('reads the route title from the shell it is connected to', () => {
    const frame = new PageFrameService();
    expect(frame.routeTitle()).toBe('');
    const route = signal('Tasks');
    frame.connect(() => route());
    expect(frame.routeTitle()).toBe('Tasks');
    route.set('People');
    expect(frame.routeTitle()).toBe('People');
  });
});
