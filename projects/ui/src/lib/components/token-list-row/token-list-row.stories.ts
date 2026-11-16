import type {Meta, StoryObj} from '@storybook/angular';

import {TokenListRowComponent} from './token-list-row.component';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const ago = (ms: number): Date => new Date(Date.now() - ms);

const meta: Meta<TokenListRowComponent> = {
  title: 'Components/Token list row',
  component: TokenListRowComponent,
  tags: ['autodocs'],
  args: {
    label: 'Laptop',
    prefix: 'lk_pat_4f9c',
    issuedAt: ago(12 * DAY_MS),
    lastUsedAt: ago(3 * HOUR_MS),
    revoked: false,
  },
};

export default meta;
type Story = StoryObj<TokenListRowComponent>;

export const Active: Story = {};

export const NeverUsed: Story = {args: {lastUsedAt: null}};

export const Revoked: Story = {args: {revoked: true}};

/** A revoke list: rows are separated by the host, here with hairlines. */
export const List: Story = {
  render: () => ({
    template: `
      <div style="max-width: 480px" class="divide-y divide-border-subtle">
        <cmn-token-list-row label="Laptop" prefix="lk_pat_4f9c" [issuedAt]="a" [lastUsedAt]="b" />
        <cmn-token-list-row label="Phone" prefix="lk_pat_91e0" [issuedAt]="a" />
        <cmn-token-list-row label="Old CI" prefix="lk_pat_02b8" [issuedAt]="a" [lastUsedAt]="a" [revoked]="true" />
      </div>`,
    props: {a: ago(30 * DAY_MS), b: ago(2 * HOUR_MS)},
  }),
};
