import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {MoneyPipe} from './money.pipe';
import {NumberDisplayPipe} from './number.pipe';

@Component({
  selector: 'cmn-money-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe, NumberDisplayPipe],
  template: `
    <dl class="flex flex-col gap-cmn-2 p-cmn-6 bg-surface-bg">
      @for (row of rows; track row.label) {
        <div class="flex gap-cmn-4">
          <dt class="w-48 text-text-secondary">{{ row.label }}</dt>
          <dd class="tabular-nums">
            {{ row.amount | cmnMoney: row.currency : {locale: locale(), delta: row.delta} : '-' }}
          </dd>
        </div>
      }
      <div class="flex gap-cmn-4">
        <dt class="w-48 text-text-secondary">USD next to CAD</dt>
        <dd class="tabular-nums">
          {{ 1234.5 | cmnMoney: 'USD' : {locale: locale(), screenCurrencies: ['USD', 'CAD']} }}
          ·
          {{ 1234.5 | cmnMoney: 'CAD' : {locale: locale(), screenCurrencies: ['USD', 'CAD']} }}
        </dd>
      </div>
      <div class="flex gap-cmn-4">
        <dt class="w-48 text-text-secondary">Number · percent delta</dt>
        <dd class="tabular-nums">
          {{ 18981.48 | cmnNumber: {locale: locale()} }} ·
          {{ 0.023 | cmnNumber: {locale: locale(), percent: true, delta: true, fractionDigits: 1} }}
        </dd>
      </div>
    </dl>
  `,
})
class MoneyShowcaseComponent {
  public readonly locale = input('en-IE');

  protected readonly rows: {
    label: string;
    amount: number | null;
    currency: string;
    delta?: boolean;
  }[] = [
    {label: 'Euro', amount: 18981.48, currency: 'EUR'},
    {label: 'Hryvnia', amount: 18981.48, currency: 'UAH'},
    {label: 'Negative dollars', amount: -1234.5, currency: 'USD'},
    {label: 'Yen (no decimals)', amount: 1234, currency: 'JPY'},
    {label: 'Gain', amount: 120, currency: 'EUR', delta: true},
    {label: 'Loss', amount: -35.5, currency: 'EUR', delta: true},
    {label: 'No change', amount: 0, currency: 'EUR', delta: true},
    {label: 'Missing → fallback', amount: null, currency: 'EUR'},
  ];
}

const meta: Meta<MoneyShowcaseComponent> = {
  title: 'Pipes/Money',
  component: MoneyShowcaseComponent,
};

export default meta;
type Story = StoryObj<MoneyShowcaseComponent>;

/** English (Ireland): symbol first, comma grouping. */
export const EnglishIreland: Story = {args: {locale: 'en-IE'}};

/** Ukrainian: symbol after, space grouping, comma decimals. */
export const Ukrainian: Story = {args: {locale: 'uk-UA'}};
