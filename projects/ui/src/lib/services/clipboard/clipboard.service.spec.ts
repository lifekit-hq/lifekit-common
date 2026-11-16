import {Clipboard} from '@angular/cdk/clipboard';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ToastService} from '../../components/toast/toast.service';
import {CmnClipboardService} from './clipboard.service';

describe('CmnClipboardService', () => {
  let service: CmnClipboardService;
  const cdkCopy = vi.fn<(text: string) => boolean>();
  const success = vi.fn();
  const error = vi.fn();

  function stubNavigator(writeText: ((text: string) => Promise<void>) | undefined): void {
    vi.stubGlobal('navigator', {clipboard: writeText ? {writeText} : undefined});
  }

  beforeEach(() => {
    cdkCopy.mockReset().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        {provide: Clipboard, useValue: {copy: cdkCopy}},
        {provide: ToastService, useValue: {success, error}},
      ],
    });
    service = TestBed.inject(CmnClipboardService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    success.mockReset();
    error.mockReset();
  });

  it('copies through navigator.clipboard and leaves the CDK path alone', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator(writeText);
    expect(await service.copy('abc')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
    expect(cdkCopy).not.toHaveBeenCalled();
  });

  it('falls back to the CDK when navigator.clipboard is missing', async () => {
    stubNavigator(undefined);
    expect(await service.copy('abc')).toBe(true);
    expect(cdkCopy).toHaveBeenCalledWith('abc');
  });

  it('falls back to the CDK when navigator.clipboard refuses', async () => {
    stubNavigator(vi.fn().mockRejectedValue(new Error('denied')));
    expect(await service.copy('abc')).toBe(true);
    expect(cdkCopy).toHaveBeenCalledWith('abc');
  });

  it('resolves false when neither path works', async () => {
    stubNavigator(undefined);
    cdkCopy.mockReturnValue(false);
    expect(await service.copy('abc')).toBe(false);
  });

  it('shows the success message only when one is given and the copy worked', async () => {
    stubNavigator(vi.fn().mockResolvedValue(undefined));
    await service.copy('abc');
    expect(success).not.toHaveBeenCalled();
    await service.copy('abc', {success: 'Copied'});
    expect(success).toHaveBeenCalledWith('Copied');
    expect(error).not.toHaveBeenCalled();
  });

  it('shows the failure message when neither path works', async () => {
    stubNavigator(undefined);
    cdkCopy.mockReturnValue(false);
    await service.copy('abc', {success: 'Copied', failure: 'Could not copy'});
    expect(error).toHaveBeenCalledWith('Could not copy');
    expect(success).not.toHaveBeenCalled();
  });
});
