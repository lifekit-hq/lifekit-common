import {DialogConfig, DialogRef} from '@angular/cdk/dialog';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDialogBareContainerComponent} from './dialog-bare-container.component';

describe('CmnDialogBareContainerComponent', () => {
  // The CDK container binds `id` from its config, clearing the `rootN` id TestBed's teardown
  // finds hosts by, so each host would stay in the page the next spec files run in.
  const hosts: HTMLElement[] = [];

  function create(): ComponentFixture<CmnDialogBareContainerComponent> {
    const fixture = TestBed.createComponent(CmnDialogBareContainerComponent);
    hosts.push(fixture.nativeElement as HTMLElement);
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CmnDialogBareContainerComponent],
      providers: [
        {provide: DialogConfig, useValue: new DialogConfig()},
        {provide: DialogRef, useValue: {close: vi.fn()}},
      ],
    });
  });

  afterEach(() => {
    hosts.splice(0).forEach(host => host.remove());
  });

  it('renders no chrome — dialogs that draw their own overlay get a bare outlet', () => {
    const fixture = create();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('section')).toBeNull();
    expect(host.querySelector('header')).toBeNull();
    expect(host.textContent?.trim()).toBe('');
  });

  it('still behaves as a CDK dialog container', () => {
    const fixture = create();
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeInstanceOf(CmnDialogBareContainerComponent);
  });
});
