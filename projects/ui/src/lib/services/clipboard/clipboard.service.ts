import {Clipboard} from '@angular/cdk/clipboard';
import {inject, Injectable} from '@angular/core';

import {ToastService} from '../../components/toast/toast.service';

/** What to say when a copy lands or does not; a message that is left out shows nothing. */
export interface CmnCopyOptions {
  readonly success?: string;
  readonly failure?: string;
}

/** Shown where a copy failed and the person has to take the text by hand. */
export const CMN_COPY_FALLBACK_HINT = 'Couldn’t copy. Select the text and copy it yourself.';

/**
 * Copies text to the clipboard behind one call: `navigator.clipboard` where the browser allows it
 * (a secure context, with permission), the CDK's selection-based copy where it does not. Resolves
 * to whether either worked, and reports it as a toast when the caller gives a message. A control
 * that shows its own state, such as `cmn-copy-button`, passes none.
 */
@Injectable({providedIn: 'root'})
export class CmnClipboardService {
  private readonly cdkClipboard = inject(Clipboard);
  private readonly toast = inject(ToastService);

  public async copy(text: string, options: CmnCopyOptions = {}): Promise<boolean> {
    const copied = (await this.viaNavigator(text)) || this.cdkClipboard.copy(text);
    if (copied && options.success) {
      this.toast.success(options.success);
    } else if (!copied && options.failure) {
      this.toast.error(options.failure);
    }
    return copied;
  }

  private async viaNavigator(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
