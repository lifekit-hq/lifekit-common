import {ChangeDetectionStrategy, Component} from '@angular/core';
import {provideRouter, RouterOutlet, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {AppLayoutComponent} from '../app-layout/app-layout.component';
import {CardComponent} from '../card/card.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {PageComponent} from '../page/page.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {DisclosureRowComponent} from './disclosure-row.component';

const FILLER_ROWS = 14;
const BODY_ROWS = 3;

const NAV_ITEMS: NavItem[] = [
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts'},
];

/** A page long enough to scroll, ending in a collapsed section the owner opens in place. */
@Component({
  selector: 'cmn-story-disclosure-page',
  imports: [CardComponent, DisclosureRowComponent, ListItemRowComponent, PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page>
      <cmn-card padding="none">
        @for (row of filler; track row) {
          <cmn-list-item-row [label]="'Account ' + row" sublabel="Checking" />
        }
      </cmn-card>
      <cmn-card class="mt-cmn-6 block" padding="none">
        <cmn-disclosure-row
          [open]="false"
          label="Closed accounts (3)"
          sublabel="No longer syncing · not in your totals"
        >
          <ul class="bg-surface-bg">
            @for (row of body; track row) {
              <li class="border-t border-border-default px-cmn-4 py-cmn-3">
                <span class="block text-cmn-sm text-text-primary">Closed account {{ row }}</span>
                <span class="block text-cmn-xs text-text-secondary">•••• 4242 · closed</span>
              </li>
            }
          </ul>
        </cmn-disclosure-row>
      </cmn-card>
    </cmn-page>
  `,
})
class DisclosurePageComponent {
  protected readonly filler = Array.from({length: FILLER_ROWS}, (_, i) => i + 1);
  protected readonly body = Array.from({length: BODY_ROWS}, (_, i) => i + 1);
}

@Component({
  selector: 'cmn-story-disclosure-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout [navItems]="navItems" [phoneOverlay]="true">
      <router-outlet />
    </cmn-app-layout>
  `,
})
class DisclosureShellComponent {
  protected readonly navItems = NAV_ITEMS;
}

/**
 * A disclosure opening in place inside the shell: the header stays exactly where it was (to the
 * pixel) and the section grows downwards. The phone suite scrolls the header into view, opens it,
 * and compares its top before and after.
 */
const meta: Meta<DisclosureShellComponent> = {
  title: 'Conformance/Disclosure In Page',
  component: DisclosureShellComponent,
  parameters: {layout: 'fullscreen'},
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: 'accounts', pathMatch: 'full'},
            {path: 'accounts', component: DisclosurePageComponent, data: {title: 'Accounts'}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
};

export default meta;

export const OpensInPlace: StoryObj<DisclosureShellComponent> = {};
