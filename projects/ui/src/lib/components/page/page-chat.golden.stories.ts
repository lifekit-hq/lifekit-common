import {ChangeDetectionStrategy, Component} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';
import {EMPTY} from 'rxjs';

import {ChatComponent} from '../chat/chat.component';
import type {CmnChatMessage} from '../chat/chat.model';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

interface Session {
  readonly id: number;
  readonly label: string;
  readonly note: string;
}

const TODAY: readonly Session[] = [
  {id: 1, label: 'What is due this week?', note: 'Just now'},
  {id: 2, label: 'Who has the most open tasks?', note: '9:12'},
];

const EARLIER: readonly Session[] = [
  {id: 3, label: 'Plan the move to the new house', note: 'Tuesday'},
  {id: 4, label: 'Birthday party checklist for Maya', note: 'Last week'},
  {id: 5, label: 'Split the chores between four people', note: 'Last week'},
];

const HISTORY: CmnChatMessage[] = [
  {role: 'user', text: 'What is due this week?'},
  {
    role: 'ai',
    text: 'Seven tasks are due this week, two of them overdue: **Call the dentist about the crown** (Alex) and **Book the boiler service** (Sam).',
  },
  {role: 'user', text: 'Move the boiler service to Friday.'},
  {role: 'ai', text: 'Done. The boiler service is now due on Friday, still assigned to Sam.'},
];

/**
 * The golden chat screen: the chat template, one conversation filling the page under the title.
 * The earlier sessions are not on the page: the Sessions button beside the title opens them in a
 * drawer (a bottom sheet on a phone, a side panel from md), so nothing but the conversation sits
 * on the page's one left edge.
 */
@Component({
  selector: 'cmn-golden-chat-page',
  imports: [ChatComponent, ListItemRowComponent, ListSectionComponent, PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page #page kind="chat">
      <cmn-chat
        [history]="history"
        [stream]="stream"
        class="min-h-0 flex-1"
        introMessage="Ask me anything about your household's tasks."
        placeholder="Ask about your tasks…"
      />
      <cmn-list-section cmnPageSessions heading="Today">
        @for (session of today; track session.id) {
          <cmn-list-item-row
            [label]="session.label"
            [sublabel]="session.note"
            [action]="true"
            (activated)="page.closeSessions()"
          />
        }
      </cmn-list-section>
      <cmn-list-section cmnPageSessions heading="Earlier">
        @for (session of earlier; track session.id) {
          <cmn-list-item-row
            [label]="session.label"
            [sublabel]="session.note"
            [action]="true"
            (activated)="page.closeSessions()"
          />
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class ChatPageComponent {
  protected readonly history = HISTORY;
  protected readonly today = TODAY;
  protected readonly earlier = EARLIER;
  protected readonly stream = (): typeof EMPTY => EMPTY;
}

/**
 * Golden screens for the chat template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/Chat',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: goldenProviders([
        {path: 'tasks', component: ChatPageComponent, data: {title: 'Ask Tasks'}},
      ]),
    }),
  ],
  args: {start: '/tasks', notice: false},
};

export default meta;
type Story = StoryObj<GoldenShellComponent>;

export const Phone: Story = {globals: GOLDEN_PHONE};

export const PhoneDark: Story = {globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {globals: {...GOLDEN_DESKTOP, theme: 'dark'}};
