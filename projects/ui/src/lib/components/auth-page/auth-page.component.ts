import {ChangeDetectionStrategy, Component, input} from '@angular/core';

import {AppMarkComponent} from '../app-mark/app-mark.component';
import {CardComponent} from '../card/card.component';

/**
 * The frame of a page a signed-out user sees: the app's mark, a title, one lead sentence, the
 * content (a button, an alert, a form) and a footer for the legal links. One centred card on the
 * page ground, the same on a phone and a desktop, in place of each app's own frame.
 *
 * - The component is the page's `main` landmark, and `title` is its one `h1`.
 * - Project the content into the default slot and the legal links into `[footer]`; give each link
 *   `cmn-link cmn-hit-slop` so it presses at 44px on a phone.
 * - The mark is the app's own, set once with `provideAppMark()`.
 * - It owns no sign-in: a passkey or a redirect to the identity provider is the app's.
 */
@Component({
  selector: 'cmn-auth-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppMarkComponent, CardComponent],
  host: {class: 'block'},
  template: `
    <main class="flex min-h-dvh w-full flex-col items-center justify-center px-cmn-4 py-cmn-8">
      <cmn-card [elevated]="true" class="w-full max-w-sm" padding="lg">
        <div class="flex flex-col items-center gap-cmn-3 text-center">
          <cmn-app-mark />
          <h1 class="mt-cmn-2 text-cmn-xl font-semibold text-text-primary text-balance break-words">
            {{ title() }}
          </h1>
          @if (lead()) {
            <p class="text-cmn-sm text-text-secondary text-pretty break-words">{{ lead() }}</p>
          }
        </div>
        <div class="mt-cmn-6 flex empty:hidden flex-col gap-cmn-3">
          <ng-content />
        </div>
      </cmn-card>
      <div
        class="mt-cmn-4 flex empty:hidden w-full max-w-sm flex-wrap items-center justify-center gap-x-cmn-4 gap-y-cmn-1 text-cmn-xs text-text-secondary"
      >
        <ng-content select="[footer]" />
      </div>
    </main>
  `,
})
export class AuthPageComponent {
  /** The page's heading. */
  public readonly title = input.required<string>();
  /** One sentence under the title; leave empty for none. */
  public readonly lead = input<string>('');
}
