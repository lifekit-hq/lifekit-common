import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import {takeUntilDestroyed, toObservable, toSignal} from '@angular/core/rxjs-interop';
import {type SafeHtml} from '@angular/platform-browser';
import {
  type icons,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  type LucideIconProviderInterface,
} from 'lucide-angular';
import {of, switchMap} from 'rxjs';

import {CmnIconRegistry} from '../../services/icon-registry/icon-registry.service';
import {CMN_LUCIDE_ICONS} from './lucide-icon-set';

export type IconSize = 'sm' | 'md' | 'lg';
export type LucideIconName = keyof typeof icons;
export type IconName = LucideIconName | (string & {});

/**
 * The icons `<cmn-icon>` renders: the generated subset the library and the apps use
 * (`lucide-icon-set.ts`), plus whatever the app registered with `provideLucideIcons`. Registering the
 * subset instead of lucide-angular's whole `icons` map keeps the other ~1,600 icons out of every
 * consumer bundle. The component-level provider shadows the app-level one, so the app's providers
 * are read from the parent injector and kept.
 */
function cmnLucideIconProviders(): LucideIconProviderInterface[] {
  const inherited = inject(LUCIDE_ICONS, {skipSelf: true, optional: true}) as
    LucideIconProviderInterface | LucideIconProviderInterface[] | null;
  return [new LucideIconProvider(CMN_LUCIDE_ICONS), ...(inherited ? [inherited].flat() : [])];
}

const warnedUnregisteredIcons = new Set<string>();

function warnUnregisteredIcon(name: string): void {
  if (!isDevMode() || warnedUnregisteredIcons.has(name)) {
    return;
  }
  warnedUnregisteredIcons.add(name);
  console.warn(
    `<cmn-icon> has no icon named "${name}": it is outside the library's generated Lucide subset and the icons the app registered, so it renders empty. Register it with provideLucideIcons or add it to scripts/icon-set/consumers.json.`
  );
}

const SIZE_PX: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

@Component({
  selector: 'cmn-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  providers: [
    {
      // lucide-icon injects an array of providers; the token's declared type is the element type.
      provide: LUCIDE_ICONS,
      useFactory: cmnLucideIconProviders,
    },
  ],
  template: `
    @if (customSvg(); as svg) {
      <span
        [innerHTML]="svg"
        [style.display]="'inline-flex'"
        [style.width.px]="resolvedSize()"
        [style.height.px]="resolvedSize()"
        [style.color]="color()"
        [attr.aria-hidden]="ariaLabel() ? null : 'true'"
        [attr.aria-label]="ariaLabel() || null"
        [attr.role]="ariaLabel() ? 'img' : null"
        class="cmn-icon-custom"
      ></span>
    } @else if (isLucide()) {
      <lucide-icon
        [name]="name()"
        [size]="resolvedSize()"
        [color]="color()"
        [attr.aria-hidden]="ariaLabel() ? null : 'true'"
        [attr.aria-label]="ariaLabel() || null"
        [attr.role]="ariaLabel() ? 'img' : null"
      />
    } @else {
      <span
        [style.display]="'inline-block'"
        [style.width.px]="resolvedSize()"
        [style.height.px]="resolvedSize()"
        [attr.aria-hidden]="ariaLabel() ? null : 'true'"
        [attr.aria-label]="ariaLabel() || null"
        [attr.role]="ariaLabel() ? 'img' : null"
      ></span>
    }
  `,
})
export class IconComponent {
  private readonly registry = inject(CmnIconRegistry);
  private readonly lucideProviders = [inject(LUCIDE_ICONS)].flat();

  public readonly name = input.required<IconName>();
  public readonly size = input<IconSize>('md');
  public readonly color = input<string>('currentColor');
  public readonly ariaLabel = input<string>('');

  public readonly resolvedSize = computed(() => SIZE_PX[this.size()]);
  public readonly isLucide = computed(() => {
    const name = this.name();
    return (
      Object.prototype.hasOwnProperty.call(CMN_LUCIDE_ICONS, name) ||
      this.lucideProviders.some(provider => provider.hasIcon(name))
    );
  });

  protected readonly customSvg = toSignal<SafeHtml | null>(
    toObservable(this.name).pipe(
      switchMap(n => (this.registry.has(n) ? this.registry.resolve(n) : of(null))),
      takeUntilDestroyed()
    ),
    {initialValue: null}
  );

  public constructor() {
    effect(() => {
      const name = this.name();
      if (!this.isLucide() && !this.registry.has(name)) {
        warnUnregisteredIcon(name);
      }
    });
  }
}
