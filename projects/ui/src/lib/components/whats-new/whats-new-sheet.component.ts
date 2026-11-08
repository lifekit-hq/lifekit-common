import {ChangeDetectionStrategy, Component, inject, type Signal} from '@angular/core';

import {type AsyncStateStatus} from '../async-state/async-state.component';
import {CMN_DRAWER_DATA} from '../drawer/drawer-config';
import {WhatsNewComponent} from './whats-new.component';
import {type WhatsNewVersion} from './whats-new.model';

/** What `CmnWhatsNewService.open()` hands the sheet: live signals, so a late fetch fills it in. */
export interface WhatsNewSheetData {
  versions: Signal<WhatsNewVersion[]>;
  status: Signal<AsyncStateStatus>;
  retry: () => void;
}

/** The body of the What's new sheet: `cmn-whats-new` in the drawer's padding. Opened by the service, never placed by an app. */
@Component({
  selector: 'cmn-whats-new-sheet',
  imports: [WhatsNewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-whats-new
      [status]="data.status()"
      [versions]="data.versions()"
      (retry)="data.retry()"
      class="block p-cmn-4 md:p-cmn-6"
    />
  `,
})
export class WhatsNewSheetComponent {
  protected readonly data = inject(CMN_DRAWER_DATA) as WhatsNewSheetData;
}
