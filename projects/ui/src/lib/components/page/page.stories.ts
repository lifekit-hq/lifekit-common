import type {Meta, StoryObj} from '@storybook/angular';

import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import type {PageKind} from './page.component';
import {PageComponent} from './page.component';

interface PageStoryArgs {
  kind: PageKind;
  title: string;
  fill: boolean;
}

/**
 * `cmn-page` on its own, outside the app shell: the frame, the title and the kind's columns (pick
 * the kind to see its reading width). The golden screens (Templates/List, Templates/Detail,
 * Templates/Form, Templates/Settings and Templates/Overview) show each kind composed in the shell
 * at the sizes the owner approves.
 */
const meta: Meta<PageStoryArgs> = {
  title: 'Components/Page',
  component: PageComponent,
  tags: ['autodocs'],
  parameters: {layout: 'fullscreen'},
  argTypes: {
    kind: {
      control: 'select',
      options: ['list', 'detail', 'form', 'settings', 'overview'] satisfies PageKind[],
    },
    fill: {control: 'boolean'},
  },
  args: {kind: 'list', title: 'Reading list', fill: false},
};

export default meta;
type Story = StoryObj<PageStoryArgs>;

/** The list template: the title on the page's left edge, then blocks a section apart. */
export const Default: Story = {
  render: args => ({
    props: args,
    moduleMetadata: {imports: [ListItemRowComponent, ListSectionComponent]},
    template: `
      <cmn-page [kind]="kind" [title]="title" [fill]="fill">
        <p class="text-cmn-sm text-text-secondary">Articles saved to read later, newest first.</p>
        <cmn-list-section heading="This week">
          <cmn-list-item-row label="How cities plan for heat" sublabel="12 min read" />
          <cmn-list-item-row label="A field guide to sourdough" sublabel="8 min read" />
          <cmn-list-item-row label="Notes on slow software" sublabel="15 min read" />
        </cmn-list-section>
        <cmn-list-section heading="Earlier">
          <cmn-list-item-row label="The quiet history of the bicycle" sublabel="20 min read" />
        </cmn-list-section>
      </cmn-page>
    `,
  }),
};

/** No title: the page starts with its first block, still in the gutter and reading width. */
export const WithoutTitle: Story = {
  ...Default,
  args: {title: ''},
};

/** A title long enough to wrap: it breaks inside the frame and the gap under it holds. */
export const LongTitle: Story = {
  ...Default,
  args: {title: 'Everything saved from the newsletters this autumn, sorted by when it arrived'},
};

/**
 * The overview template: the main column runs the frame's width, and the blocks marked
 * `cmnPageRail` sit in a 320px rail beside it from 1280px up (under it, on the same edge, below
 * that). Another kind draws no rail.
 */
export const OverviewWithRail: Story = {
  args: {kind: 'overview', title: 'This week'},
  render: args => ({
    props: args,
    moduleMetadata: {imports: [ListItemRowComponent, ListSectionComponent]},
    template: `
      <cmn-page [kind]="kind" [title]="title" [fill]="fill">
        <p class="text-cmn-sm text-text-secondary">Seven tasks are due this week, two of them overdue.</p>
        <cmn-list-section heading="Due today">
          <cmn-list-item-row label="Call the dentist about the crown" sublabel="Overdue · Alex" />
          <cmn-list-item-row label="Book the boiler service" sublabel="Today · Sam" />
        </cmn-list-section>
        <cmn-list-section cmnPageRail heading="Coming up">
          <cmn-list-item-row label="Parents' evening" sublabel="Thursday, 18:30" />
          <cmn-list-item-row label="Bin day: recycling" sublabel="Friday morning" />
        </cmn-list-section>
      </cmn-page>
    `,
  }),
};
