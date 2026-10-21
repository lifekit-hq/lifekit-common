import {ChangeDetectionStrategy, Component} from '@angular/core';
import {provideRouter, RouterLink} from '@angular/router';
import {
  applicationConfig,
  componentWrapperDecorator,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

@Component({
  selector: 'cmn-link-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="flex max-w-prose flex-col gap-cmn-4 text-cmn-sm text-text-primary">
      <p>
        <a class="cmn-link cmn-link--underlined" href="#project">Accent</a>
        — the default: an in-app or outside link.
      </p>
      <p>
        <a class="cmn-link cmn-link--underlined" routerLink="/goals/42">Router link</a>
        — the class sits on a real anchor, so
        <code class="font-mono text-cmn-xs">routerLink</code> still works.
      </p>
      <p>
        <a
          class="cmn-link cmn-link--underlined"
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
          >External link</a
        >
        — opens in a new tab.
      </p>
      <p>
        <a class="cmn-link cmn-link--primary cmn-link--underlined font-semibold" href="#row"
          >Primary text</a
        >
        — a title that links, such as a row or card heading.
      </p>
      <p class="text-text-secondary">
        <a class="cmn-link cmn-link--secondary cmn-link--underlined" href="#sub">Secondary text</a>
        — a quiet link inside secondary text.
      </p>
      <p class="text-text-secondary">
        <a class="cmn-link cmn-link--inherit cmn-link--underlined" href="#inherit"
          >Inherited colour</a
        >
        — takes the colour of the text around it.
      </p>
      <p>
        <a class="cmn-link cmn-link--underlined" href="#prose">Underlined</a>
        — required for a link inside prose, so colour is not the only cue.
      </p>
    </div>
  `,
})
class LinkShowcaseComponent {}

@Component({
  selector: 'cmn-link-in-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="max-w-prose text-cmn-md text-text-primary">
      The review asked for two changes. See
      <a class="cmn-link cmn-link--underlined" href="#pr">pull request 412</a>
      for the diff and the
      <a class="cmn-link cmn-link--underlined" href="#thread">comment thread</a>
      for the discussion.
    </p>
  `,
})
class LinkInTextComponent {}

@Component({
  selector: 'cmn-link-in-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-sm p-cmn-4">
      <div
        class="flex flex-col gap-cmn-2 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
      >
        <div class="flex items-center justify-between">
          <p class="font-headline text-cmn-sm font-semibold text-text-primary">Session 7f3a</p>
          <a class="cmn-link cmn-hit-slop text-cmn-xs" href="#goal">Goal</a>
        </div>
        <p class="text-cmn-xs text-text-secondary">Opened a pull request 3 minutes ago.</p>
      </div>
    </div>
  `,
})
class LinkInCardComponent {}

/**
 * `cmn-link` is the shared text link from `@lifekit-hq/tokens/base.css`: the accent colour, an
 * underline on hover and a `--color-border-focus` ring on keyboard focus (Tab to a link to see
 * it). It is a class, not an element, because it styles the native `<a>` the app owns: a router
 * link needs the anchor in the app's own template, which a custom element would hide in its
 * shadow tree. It sets colour and decoration only, so size and weight stay with the text around
 * it. Modifiers: `cmn-link--primary`, `--secondary` and `--inherit` pick the text colour, and
 * `--underlined` keeps the underline on. A link placed inside prose must use `--underlined`, so
 * it is not told apart by colour alone; every link on this page sits in a sentence, so each
 * carries it.
 */
const meta: Meta<LinkShowcaseComponent> = {
  title: 'Primitives/Link',
  component: LinkShowcaseComponent,
  tags: ['autodocs'],
  decorators: [applicationConfig({providers: [provideRouter([])]})],
  parameters: {layout: 'padded'},
};

export default meta;
type Story = StoryObj<LinkShowcaseComponent>;

/** Every colour variant on one page, each inside a sentence and so with `--underlined`. */
export const Variants: Story = {};

/** A link inside prose must use `--underlined`, so it is not told apart by colour alone. */
export const InRunningText: Story = {
  render: () => ({
    template: '<cmn-link-in-text />',
    moduleMetadata: {imports: [LinkInTextComponent]},
  }),
};

/**
 * A small link in a card on a phone: `cmn-hit-slop` grows the press area to 44px without moving
 * or resizing the link.
 */
export const PhoneHitArea: Story = {
  render: () => ({
    template: '<cmn-link-in-card />',
    moduleMetadata: {imports: [LinkInCardComponent]},
  }),
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

export const Dark: Story = {
  decorators: [
    componentWrapperDecorator(story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`),
  ],
  globals: {theme: 'dark'},
};
