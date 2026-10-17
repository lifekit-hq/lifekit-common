import {componentWrapperDecorator, type Meta, type StoryObj} from '@storybook/angular';

interface StoryArgs {
  text: string;
}

const LOG = [
  '14:02:11 session 7f3a started in /work/devclaw',
  '14:02:12 > npm ci',
  '14:02:41 added 1204 packages in 29s',
  '14:02:42 > npm run test',
  '14:03:07 Test Files  42 passed (42)',
  '14:03:07      Tests  311 passed (311)',
  '14:03:08 pushed fm/lc-link-codeblock',
].join('\n');

const LONG_LOG = Array.from(
  {length: 40},
  (_, i) => `${String(i + 1).padStart(2, '0')} ${LOG.split('\n')[i % 7]}`
).join('\n');

const UNBROKEN =
  'fetch https://registry.example.com/@lifekit-hq/tokens/-/tokens-3.6.0.tgz?integrity=sha512-9d1f0c2b7a4e5f6a8b3c0d1e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0 failed';

/**
 * `cmn-code-block` is the shared log and code block from `@lifekit-hq/tokens/base.css`, for a
 * `<pre>` holding a log, JSON or a brief. It is a class on the native `<pre>`, so the app keeps
 * its own text interpolation and pipes. The text is monospace and wraps, breaking a long unbroken
 * token anywhere, so the block never widens the page. Set `--cmn-code-block-max-height` to cap it;
 * it then scrolls inside its own box, which needs `tabindex="0"` and an `aria-label` so the
 * keyboard can scroll it. `cmn-code-block--bare` drops the box.
 */
const meta: Meta<StoryArgs> = {
  title: 'Primitives/Code block',
  tags: ['autodocs'],
  args: {text: LOG},
  parameters: {layout: 'padded'},
  render: args => ({
    props: args,
    template: '<pre class="cmn-code-block">{{ text }}</pre>',
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {};

/** A long log capped at 12rem: it scrolls in its own box, and Tab reaches it. */
export const CappedHeight: Story = {
  args: {text: LONG_LOG},
  render: args => ({
    props: args,
    template: `
      <pre
        class="cmn-code-block"
        style="--cmn-code-block-max-height: 12rem"
        tabindex="0"
        aria-label="Session log"
      >{{ text }}</pre>
    `,
  }),
};

/** For a block inside a section that already frames it. */
export const Bare: Story = {
  render: args => ({
    props: args,
    template: `
      <section class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
        <h3 class="mb-cmn-2 font-headline text-cmn-sm font-semibold text-text-primary">Brief</h3>
        <pre class="cmn-code-block cmn-code-block--bare">{{ text }}</pre>
      </section>
    `,
  }),
};

/** A line with no break points wraps inside the 390px phone instead of widening the page. */
export const LongLinePhone: Story = {
  args: {text: UNBROKEN},
  decorators: [componentWrapperDecorator(story => `<div class="w-[326px]">${story}</div>`)],
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

export const Dark: Story = {
  decorators: [
    componentWrapperDecorator(story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`),
  ],
  globals: {theme: 'dark'},
};
