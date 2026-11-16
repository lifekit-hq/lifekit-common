import {ChangeDetectionStrategy, Component} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {provideAppMark} from '../../providers/provide-app-mark';
import {GOLDEN_DESKTOP, GOLDEN_PHONE, GOLDEN_VIEWPORTS} from '../page/golden-screen';
import {StatusPageComponent} from './status-page.component';

/**
 * The golden status screens: the signed-out and no-access routes of an app, outside its shell. A
 * route is just `<cmn-status-page>` with a preset, no layout classes of its own; the `status` page
 * kind owns the width, the vertical centring and the card.
 */
@Component({
  selector: 'cmn-golden-signed-out-page',
  imports: [StatusPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<cmn-status-page preset="signed-out" />',
})
class SignedOutPageComponent {}

@Component({
  selector: 'cmn-golden-no-access-page',
  imports: [StatusPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<cmn-status-page preset="no-access" />',
})
class NoAccessPageComponent {}

const meta: Meta = {
  title: 'Templates/Status',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: {options: GOLDEN_VIEWPORTS},
  },
  decorators: [applicationConfig({providers: [provideAppMark('bk', {followSeed: false})]})],
};

export default meta;
type Story = StoryObj;

const signedOut: Story = {
  render: () => ({
    template: '<cmn-golden-signed-out-page />',
    moduleMetadata: {imports: [SignedOutPageComponent]},
  }),
};

const noAccess: Story = {
  render: () => ({
    template: '<cmn-golden-no-access-page />',
    moduleMetadata: {imports: [NoAccessPageComponent]},
  }),
};

export const Phone: Story = {...signedOut, globals: GOLDEN_PHONE};

export const PhoneDark: Story = {...signedOut, globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {...signedOut, globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {...signedOut, globals: {...GOLDEN_DESKTOP, theme: 'dark'}};

export const PhoneNoAccess: Story = {...noAccess, globals: GOLDEN_PHONE};

export const PhoneNoAccessDark: Story = {...noAccess, globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const DesktopNoAccess: Story = {...noAccess, globals: GOLDEN_DESKTOP};

export const DesktopNoAccessDark: Story = {
  ...noAccess,
  globals: {...GOLDEN_DESKTOP, theme: 'dark'},
};
