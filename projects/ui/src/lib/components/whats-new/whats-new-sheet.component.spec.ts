import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {describe, expect, it, vi} from 'vitest';

import {type AsyncStateStatus} from '../async-state/async-state.component';
import {CMN_DRAWER_DATA} from '../drawer/drawer-config';
import {WHATS_NEW_FIXTURE} from './whats-new.fixtures';
import {type WhatsNewVersion} from './whats-new.model';
import {WhatsNewSheetComponent, type WhatsNewSheetData} from './whats-new-sheet.component';

describe('WhatsNewSheetComponent', () => {
  function create(data: WhatsNewSheetData): HTMLElement {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [WhatsNewSheetComponent],
      providers: [{provide: CMN_DRAWER_DATA, useValue: data}],
    });
    const fixture = TestBed.createComponent(WhatsNewSheetComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists the releases it is handed and follows them as they arrive', () => {
    const versions = signal<WhatsNewVersion[]>([]);
    const status = signal<AsyncStateStatus>('success');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [WhatsNewSheetComponent],
      providers: [{provide: CMN_DRAWER_DATA, useValue: {versions, status, retry: vi.fn()}}],
    });
    const fixture = TestBed.createComponent(WhatsNewSheetComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('[data-whats-new-version]')).toHaveLength(0);

    versions.set(WHATS_NEW_FIXTURE.versions);
    fixture.detectChanges();

    expect(el.querySelectorAll('[data-whats-new-version]')).toHaveLength(4);
  });

  it('hands Retry to the service', () => {
    const retry = vi.fn();
    const el = create({versions: signal([]), status: signal<AsyncStateStatus>('error'), retry});

    el.querySelector<HTMLButtonElement>('cmn-button button')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
