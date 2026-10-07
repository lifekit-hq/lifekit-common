import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {CmnPageActionsService} from './page-actions.service';

describe('CmnPageActionsService', () => {
  it('should deliver a press only to subscribers of that action id', () => {
    const actions = TestBed.inject(CmnPageActionsService);
    const adds: void[] = [];
    const shares: void[] = [];
    actions.on('add').subscribe(() => adds.push(undefined));
    actions.on('share').subscribe(() => shares.push(undefined));

    actions.press('add');
    actions.press('add');
    actions.press('other');

    expect(adds.length).toBe(2);
    expect(shares.length).toBe(0);
  });

  it('should not replay presses from before the subscription', () => {
    const actions = TestBed.inject(CmnPageActionsService);
    actions.press('add');
    const adds: void[] = [];
    actions.on('add').subscribe(() => adds.push(undefined));
    expect(adds.length).toBe(0);
  });
});
