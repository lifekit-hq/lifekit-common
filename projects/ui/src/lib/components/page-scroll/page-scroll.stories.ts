import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {PageContainerComponent} from '../page-container/page-container.component';
import {PageScrollComponent} from './page-scroll.component';

const ROWS = Array.from({length: 40}, (_, i) => i + 1);

const meta: Meta<PageScrollComponent> = {
  title: 'Components/PageScroll',
  component: PageScrollComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({imports: [ListItemRowComponent, PageContainerComponent, PageScrollComponent]}),
  ],
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<PageScrollComponent>;

const TEMPLATE = `
  <div class="h-[480px]">
    <cmn-page-container spacing="none" fill>
      <p class="pb-cmn-4 text-cmn-sm text-text-secondary">Content above the list stays put.</p>
      <cmn-page-scroll [label]="label">
        @for (row of rows; track row) {
          <cmn-list-item-row [label]="'Row ' + row" sublabel="Scheduled" />
        }
      </cmn-page-scroll>
    </cmn-page-container>
  </div>
`;

/**
 * Inside `cmn-page-container fill` it takes the height left under the content above it and scrolls
 * its rows; the page itself does not scroll. Here a 480px box stands in for the app shell's page frame.
 */
export const Default: Story = {
  args: {label: 'Events'},
  render: args => ({props: {...args, rows: ROWS}, template: TEMPLATE}),
};

/** A short list leaves the region unscrolled; it still occupies the free space. */
export const FewRows: Story = {
  args: {label: 'Events'},
  render: args => ({props: {...args, rows: ROWS.slice(0, 3)}, template: TEMPLATE}),
};
