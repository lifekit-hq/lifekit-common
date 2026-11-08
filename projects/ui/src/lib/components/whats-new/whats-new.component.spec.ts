import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {type AsyncStateStatus} from '../async-state/async-state.component';
import {WhatsNewComponent} from './whats-new.component';
import {WHATS_NEW_FIXTURE} from './whats-new.fixtures';
import {type WhatsNewVersion} from './whats-new.model';

describe('WhatsNewComponent', () => {
  let fixture: ComponentFixture<WhatsNewComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({imports: [WhatsNewComponent]}).compileComponents();
    fixture = TestBed.createComponent(WhatsNewComponent);
  });

  function render(versions: WhatsNewVersion[], status: AsyncStateStatus = 'success'): HTMLElement {
    fixture.componentRef.setInput('versions', versions);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function release(el: HTMLElement, version: string): HTMLElement {
    const found = el.querySelector<HTMLElement>(`[data-whats-new-version="${version}"]`);
    expect(found, `release ${version}`).not.toBeNull();
    return found as HTMLElement;
  }

  it('lists the releases newest first, each with its version', () => {
    const el = render(WHATS_NEW_FIXTURE.versions);

    expect(
      Array.from(el.querySelectorAll('[data-whats-new-version]')).map(section =>
        section.getAttribute('data-whats-new-version')
      )
    ).toEqual(['4.5.0', '4.4.2', '4.4.0', '4.3.0']);
  });

  it('shows a release’s date as a time element', () => {
    const time = release(render(WHATS_NEW_FIXTURE.versions), '4.5.0').querySelector('time');

    expect(time?.getAttribute('datetime')).toBe('2026-11-02');
    expect(time?.textContent).toContain('2026');
  });

  it('draws the lines of a release, and folds its changes shut under them', () => {
    const section = release(render(WHATS_NEW_FIXTURE.versions), '4.4.2');

    expect(section.querySelectorAll('[data-whats-new-note]')).toHaveLength(1);
    expect(section.querySelector('details')?.open).toBe(false);
  });

  it('opens the change fold of a release that has no lines', () => {
    const section = release(render(WHATS_NEW_FIXTURE.versions), '4.4.0');

    expect(section.querySelectorAll('[data-whats-new-note]')).toHaveLength(0);
    expect(section.querySelector('details')?.open).toBe(true);
    expect(section.querySelectorAll('details li')).toHaveLength(3);
  });

  it('says so for a release with neither lines nor changes', () => {
    const section = release(render(WHATS_NEW_FIXTURE.versions), '4.3.0');

    expect(section.textContent).toContain('No changes to show for this version.');
    expect(section.querySelector('details')).toBeNull();
  });

  it('draws a release with no date without a time element', () => {
    const el = render([{version: '1.0.0', date: null, notes: [], changes: ['Add a thing']}]);

    expect(el.querySelector('time')).toBeNull();
  });

  it('shows the empty state when there are no releases', () => {
    expect(render([]).textContent).toContain('Nothing to show yet');
  });

  it('shows the error with a Retry that reports retry', () => {
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);
    const el = render([], 'error');

    expect(el.textContent).toContain("Couldn't load what's new. Try again.");
    el.querySelector<HTMLButtonElement>('cmn-button button')?.click();
    expect(retried).toBe(1);
  });
});
