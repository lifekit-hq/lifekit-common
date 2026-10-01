import {componentWrapperDecorator, type Meta, type StoryObj} from '@storybook/angular';

import {MonthStepperComponent} from './month-stepper.component';

const OCT_2026 = new Date(2026, 9, 1);

const darkSurface = componentWrapperDecorator(
  story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`
);

const meta: Meta<MonthStepperComponent> = {
  title: 'Components/Month Stepper',
  component: MonthStepperComponent,
  tags: ['autodocs'],
  args: {value: OCT_2026, locale: 'en-US'},
};

export default meta;
type Story = StoryObj<MonthStepperComponent>;

/** Click the chevrons, or focus the control and use the left / right arrow keys. */
export const Default: Story = {};

export const Dark: Story = {
  decorators: [darkSurface],
  globals: {theme: 'dark'},
};

/** `min` and `max` disable the control at either end; here the range is Sep-Oct 2026. */
export const Bounded: Story = {
  args: {min: new Date(2026, 8, 1), max: OCT_2026},
};

export const BoundedDark: Story = {
  decorators: [darkSurface],
  ...Bounded,
  globals: {theme: 'dark'},
};

export const Localized: Story = {
  args: {locale: 'uk-UA'},
};
