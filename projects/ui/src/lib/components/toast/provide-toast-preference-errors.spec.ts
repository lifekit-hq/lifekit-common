import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {PREFERENCE_SAVE_ERROR_HANDLER} from '@lifekit-hq/core/preferences';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  DEFAULT_PREFERENCE_SAVE_ERROR_MESSAGE,
  provideToastPreferenceErrors,
} from './provide-toast-preference-errors';
import {ToastService} from './toast.service';

const FAILURE = {error: new Error('boom'), errorCode: null, fields: ['appearance']};

describe('provideToastPreferenceErrors', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(
    ...args: Parameters<typeof provideToastPreferenceErrors>
  ): ReturnType<typeof vi.fn> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideToastPreferenceErrors(...args),
      ],
    });
    return vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
  }

  it('shows the default error toast when a preference save fails', () => {
    const error = setup();
    TestBed.inject(PREFERENCE_SAVE_ERROR_HANDLER)(FAILURE);
    expect(error).toHaveBeenCalledWith(DEFAULT_PREFERENCE_SAVE_ERROR_MESSAGE);
  });

  it('shows a custom message when one is given', () => {
    const error = setup('Theme not saved.');
    TestBed.inject(PREFERENCE_SAVE_ERROR_HANDLER)(FAILURE);
    expect(error).toHaveBeenCalledWith('Theme not saved.');
  });
});
