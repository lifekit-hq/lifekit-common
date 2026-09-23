import type {Meta, StoryObj} from '@storybook/angular';
import {concat, delay, Observable, of} from 'rxjs';

import {ChatComponent} from './chat.component';
import type {CmnChatMessage, CmnChatStreamEvent, CmnChatStreamFn} from './chat.model';

const DELTA_DELAY_MS = 60;

function fakeStream(reply: string): CmnChatStreamFn {
  return () =>
    concat(
      ...reply
        .split(' ')
        .map(word =>
          of<CmnChatStreamEvent>({type: 'text', delta: `${word} `}).pipe(delay(DELTA_DELAY_MS))
        )
    );
}

const failingStream: CmnChatStreamFn = () =>
  of<CmnChatStreamEvent>({type: 'error', message: 'The agent is unavailable right now.'}).pipe(
    delay(DELTA_DELAY_MS)
  );

const neverStream: CmnChatStreamFn = () => new Observable<CmnChatStreamEvent>(() => void 0);

const HISTORY: CmnChatMessage[] = [
  {role: 'user', text: 'How much did I spend on groceries last month?'},
  {role: 'ai', text: 'You spent **$412.80** across 17 transactions, 8% below your budget.'},
];

const meta: Meta<ChatComponent> = {
  title: 'Components/Chat/Chat',
  component: ChatComponent,
  tags: ['autodocs'],
  render: args => ({
    props: args,
    template: `
      <div class="h-[30rem] w-full max-w-2xl overflow-hidden rounded-cmn-lg border border-border-default">
        <cmn-chat
          [history]="history"
          [stream]="stream"
          [placeholder]="placeholder"
          [introMessage]="introMessage"
        />
      </div>
    `,
  }),
  args: {
    history: [],
    stream: fakeStream('Here is what I found in your ledger.'),
    placeholder: 'Ask…',
    introMessage: '',
  },
};

export default meta;
type Story = StoryObj<ChatComponent>;

/** A fresh thread with nothing said yet. */
export const Empty: Story = {};

/** An empty thread that greets the user first. */
export const WithIntroMessage: Story = {
  args: {introMessage: 'Ask me anything about your accounts, budgets or transactions.'},
};

/** A thread resumed from preloaded history. */
export const WithHistory: Story = {
  args: {history: HISTORY},
};

/** Send a message to watch the reply stream in token by token. */
export const Streaming: Story = {
  args: {
    history: HISTORY,
    stream: fakeStream(
      'Looking at March: groceries came to $412.80 over 17 transactions, which is 8% under budget.'
    ),
  },
};

/** The transport fails mid-turn — the error surfaces in the thread. */
export const StreamError: Story = {
  args: {history: HISTORY, stream: failingStream},
};

/** A turn that never resolves — the loading bubble stays up. */
export const Pending: Story = {
  args: {history: HISTORY, stream: neverStream},
};

/** A custom prompt in the composer. */
export const CustomPlaceholder: Story = {
  args: {placeholder: 'Ask about a transaction…'},
};
