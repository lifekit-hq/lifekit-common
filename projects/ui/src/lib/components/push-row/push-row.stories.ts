import {signal} from '@angular/core';
import {PUSH_BACKEND, type PushBackend, PushSubscriptionService} from '@lifekit-hq/core/pwa';
import type {Meta, StoryObj} from '@storybook/angular';
import {applicationConfig} from '@storybook/angular';

import {PushRowComponent} from './push-row.component';

interface FakePush {
  isSupported?: boolean;
  requiresInstall?: boolean;
  permission?: 'default' | 'granted' | 'denied';
  subscribed?: boolean;
}

const fakeSubscription = (): PushSubscription =>
  ({endpoint: 'https://push.example/1'}) as unknown as PushSubscription;

const backend: PushBackend = {
  publicKey: () => Promise.resolve('story-key'),
  register: () => Promise.resolve(),
  unregister: () => Promise.resolve(),
};

/** A stand-in for the browser half, so each state renders without a service worker. */
function withPush(state: FakePush = {}): ReturnType<typeof applicationConfig> {
  const subscription = signal(state.subscribed ? fakeSubscription() : null);
  const fake = {
    isSupported: signal(state.isSupported ?? true),
    requiresInstall: signal(state.requiresInstall ?? false),
    permission: signal(state.permission ?? 'default'),
    subscription,
    subscribe: () => {
      subscription.set(fakeSubscription());
      return Promise.resolve({endpoint: 'https://push.example/1'});
    },
    unsubscribe: () => {
      subscription.set(null);
      return Promise.resolve();
    },
  };
  return applicationConfig({
    providers: [
      {provide: PushSubscriptionService, useValue: fake},
      {provide: PUSH_BACKEND, useValue: backend},
    ],
  });
}

const meta: Meta<PushRowComponent> = {
  title: 'Components/Push row',
  component: PushRowComponent,
  tags: ['autodocs'],
  args: {appName: 'Finance Sentry'},
};

export default meta;
type Story = StoryObj<PushRowComponent>;

/** Not subscribed yet: press the switch to turn notifications on. */
export const Off: Story = {decorators: [withPush()]};

/** This device is subscribed; press the switch to turn it off. */
export const On: Story = {decorators: [withPush({subscribed: true, permission: 'granted'})]};

/** The browser permission is blocked, so only browser settings can change it. */
export const Denied: Story = {decorators: [withPush({permission: 'denied'})]};

/** iPhone and iPad deliver push only to an installed app. */
export const InstallFirst: Story = {
  decorators: [withPush({requiresInstall: true, isSupported: false})],
};

/** No service worker or no push support in this browser. */
export const Unavailable: Story = {decorators: [withPush({isSupported: false})]};
