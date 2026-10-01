import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {SwUpdate, type VersionEvent} from '@angular/service-worker';
import {Subject} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {AppUpdateService} from './app-update.service';

describe('AppUpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<unknown>;
  let swUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<unknown>;
    activateUpdate: ReturnType<typeof vi.fn>;
    checkForUpdate: ReturnType<typeof vi.fn>;
  };
  let fakeDocument: EventTarget & {
    visibilityState: string;
    location: {reload: ReturnType<typeof vi.fn>};
  };

  function create(enabled: boolean): AppUpdateService {
    swUpdate.isEnabled = enabled;
    TestBed.configureTestingModule({
      providers: [
        {provide: SwUpdate, useValue: swUpdate},
        {provide: DOCUMENT, useValue: fakeDocument},
      ],
    });
    return TestBed.inject(AppUpdateService);
  }

  function setVisibility(state: 'visible' | 'hidden'): void {
    fakeDocument.visibilityState = state;
    fakeDocument.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    unrecoverable = new Subject<unknown>();
    swUpdate = {
      isEnabled: true,
      versionUpdates,
      unrecoverable,
      activateUpdate: vi.fn().mockResolvedValue(true),
      checkForUpdate: vi.fn().mockResolvedValue(false),
    };
    fakeDocument = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
      location: {reload: vi.fn()},
    });
  });

  it('starts with no update ready', () => {
    expect(create(true).updateReady()).toBe(false);
  });

  it('sets updateReady on VERSION_READY only', () => {
    const service = create(true);
    versionUpdates.next({type: 'VERSION_DETECTED', version: {hash: 'a'}});
    expect(service.updateReady()).toBe(false);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: {hash: 'a'},
      latestVersion: {hash: 'b'},
    });
    expect(service.updateReady()).toBe(true);
  });

  it('activates the update before reloading', async () => {
    const service = create(true);
    await service.reload();
    expect(swUpdate.activateUpdate).toHaveBeenCalledOnce();
    expect(fakeDocument.location.reload).toHaveBeenCalledOnce();
    expect(swUpdate.activateUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      fakeDocument.location.reload.mock.invocationCallOrder[0]
    );
  });

  it('reloads on unrecoverable state', () => {
    create(true);
    unrecoverable.next({type: 'UNRECOVERABLE_STATE', reason: 'broken'});
    expect(fakeDocument.location.reload).toHaveBeenCalledOnce();
  });

  it('checks for an update when the document becomes visible', () => {
    create(true);
    setVisibility('hidden');
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(swUpdate.checkForUpdate).toHaveBeenCalledOnce();
  });

  it('swallows checkForUpdate failures', async () => {
    swUpdate.checkForUpdate.mockRejectedValue(new Error('offline'));
    create(true);
    expect(() => setVisibility('visible')).not.toThrow();
    await Promise.resolve();
  });

  it('stops listening once destroyed', () => {
    create(true);
    TestBed.resetTestingModule();
    setVisibility('visible');
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('is inert when the service worker is disabled', async () => {
    const service = create(false);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: {hash: 'a'},
      latestVersion: {hash: 'b'},
    });
    unrecoverable.next({type: 'UNRECOVERABLE_STATE', reason: 'x'});
    setVisibility('visible');
    await service.reload();
    expect(service.updateReady()).toBe(false);
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
    expect(swUpdate.activateUpdate).not.toHaveBeenCalled();
    expect(fakeDocument.location.reload).not.toHaveBeenCalled();
  });
});
