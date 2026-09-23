import {DialogConfig, DialogRef} from '@angular/cdk/dialog';
import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDialogBareContainerComponent} from './dialog-bare-container.component';

describe('CmnDialogBareContainerComponent', () => {
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

  it('renders no chrome — dialogs that draw their own overlay get a bare outlet', () => {
    const fixture = TestBed.createComponent(CmnDialogBareContainerComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('section')).toBeNull();
    expect(host.querySelector('header')).toBeNull();
    expect(host.textContent?.trim()).toBe('');
  });

  it('still behaves as a CDK dialog container', () => {
    const fixture = TestBed.createComponent(CmnDialogBareContainerComponent);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeInstanceOf(CmnDialogBareContainerComponent);
  });
});
