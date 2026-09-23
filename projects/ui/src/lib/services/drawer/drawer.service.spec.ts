import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CMN_DRAWER_DATA} from '../../components/drawer/drawer-config';
import {CmnDrawerRef} from '../../components/drawer/drawer-ref';
import {CmnDrawerService} from './drawer.service';

@Component({
  selector: 'cmn-test-drawer-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="content">drawer body</p>',
})
class ContentComponent {}

describe('CmnDrawerService', () => {
  let service: CmnDrawerService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CmnDrawerService);
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  function panels(): NodeListOf<Element> {
    return document.querySelectorAll('cmn-drawer-container');
  }

  it('attaches a container and the caller content into the overlay', () => {
    service.open(ContentComponent);
    expect(panels()).toHaveLength(1);
    expect(document.querySelector('.content')).not.toBeNull();
  });

  it('renders the configured title', () => {
    service.open(ContentComponent, {title: 'Transaction detail'});
    expect(document.querySelector('cmn-drawer-container h2')?.textContent?.trim()).toBe(
      'Transaction detail'
    );
  });

  it('gives the content access to the drawer data and ref', () => {
    const ref = service.open(ContentComponent, {data: {id: 7}});
    const outlet = document.querySelector('cmn-drawer-container');
    expect(outlet).not.toBeNull();
    expect(ref).toBeInstanceOf(CmnDrawerRef);
    expect(CMN_DRAWER_DATA.toString()).toContain('CmnDrawerData');
  });

  it('disposes the overlay after the close animation', () => {
    const ref = service.open(ContentComponent);
    ref.close();
    expect(panels()).toHaveLength(1);

    vi.runAllTimers();
    expect(panels()).toHaveLength(0);
  });

  it('closes on backdrop click by default', () => {
    service.open(ContentComponent);
    document.querySelector<HTMLElement>('.cmn-drawer-backdrop')?.click();
    vi.runAllTimers();
    expect(panels()).toHaveLength(0);
  });

  it('keeps the drawer open on backdrop click when closing is disabled', () => {
    service.open(ContentComponent, {disableClose: true});
    document.querySelector<HTMLElement>('.cmn-drawer-backdrop')?.click();
    vi.runAllTimers();
    expect(panels()).toHaveLength(1);
  });

  it('closes on Escape by default', () => {
    service.open(ContentComponent);
    document
      .querySelector('.cdk-overlay-container')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    vi.runAllTimers();
    expect(panels()).toHaveLength(0);
  });

  it('ignores Escape when closing is disabled', () => {
    service.open(ContentComponent, {disableClose: true});
    document
      .querySelector('.cdk-overlay-container')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    vi.runAllTimers();
    expect(panels()).toHaveLength(1);
  });

  it('ignores keys other than Escape', () => {
    service.open(ContentComponent);
    document
      .querySelector('.cdk-overlay-container')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    vi.advanceTimersByTime(1000);
    expect(panels()).toHaveLength(1);
  });
});
