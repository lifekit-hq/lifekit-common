import {firstValueFrom, lastValueFrom, type Observable, of, toArray} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {poll} from './poll';

interface Job {
  state: 'running' | 'done';
}

const INTERVAL_MS = 1000;

function sequence(values: Job[]): () => Observable<Job> {
  let i = 0;
  return () => of(values[Math.min(i++, values.length - 1)]);
}

describe('poll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires the first request immediately by default', async () => {
    const request = vi.fn(() => of<Job>({state: 'running'}));
    const first = firstValueFrom(poll(request, {intervalMs: INTERVAL_MS, isDone: () => false}));

    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(1);
    expect(await first).toEqual({state: 'running'});
  });

  it('waits one interval before the first request when startImmediately is false', async () => {
    const request = vi.fn(() => of<Job>({state: 'running'}));
    const stream = poll(request, {
      intervalMs: INTERVAL_MS,
      isDone: () => false,
      startImmediately: false,
    });
    const done = firstValueFrom(stream);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
    expect(request).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(1);
    await done;
  });

  it('keeps polling on the interval until isDone', async () => {
    const request = vi.fn(sequence([{state: 'running'}, {state: 'running'}, {state: 'done'}]));
    const collected = lastValueFrom(
      poll(request, {intervalMs: INTERVAL_MS, isDone: j => j.state === 'done'}).pipe(toArray())
    );

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    expect(await collected).toEqual([{state: 'running'}, {state: 'running'}, {state: 'done'}]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('emits the terminal value before completing — inclusive takeWhile', async () => {
    const collected = lastValueFrom(
      poll(() => of<Job>({state: 'done'}), {
        intervalMs: INTERVAL_MS,
        isDone: j => j.state === 'done',
      }).pipe(toArray())
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(await collected).toEqual([{state: 'done'}]);
  });

  it('stops requesting once complete', async () => {
    const request = vi.fn(() => of<Job>({state: 'done'}));
    const done = lastValueFrom(
      poll(request, {intervalMs: INTERVAL_MS, isDone: () => true}).pipe(toArray())
    );

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    await done;
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('shares one underlying poll between subscribers', async () => {
    const request = vi.fn(() => of<Job>({state: 'running'}));
    const stream = poll(request, {intervalMs: INTERVAL_MS, isDone: () => false});

    const a: Job[] = [];
    const b: Job[] = [];
    const subA = stream.subscribe(v => a.push(v));
    const subB = stream.subscribe(v => b.push(v));

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);
    subA.unsubscribe();
    subB.unsubscribe();

    expect(request).toHaveBeenCalledTimes(3);
    expect(a.length).toBe(b.length);
  });

  it('replays the latest value to a late subscriber', async () => {
    const stream = poll(() => of<Job>({state: 'running'}), {
      intervalMs: INTERVAL_MS,
      isDone: () => false,
    });
    const sub = stream.subscribe();
    await vi.advanceTimersByTimeAsync(0);

    const late: Job[] = [];
    const lateSub = stream.subscribe(v => late.push(v));
    expect(late).toEqual([{state: 'running'}]);

    sub.unsubscribe();
    lateSub.unsubscribe();
  });

  it('stops the timer and the requests once every subscriber has unsubscribed', async () => {
    const request = vi.fn(() => of<Job>({state: 'running'}));
    const stream = poll(request, {intervalMs: INTERVAL_MS, isDone: () => false});

    const subA = stream.subscribe();
    const subB = stream.subscribe();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(request).toHaveBeenCalledTimes(2);

    subA.unsubscribe();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(request).toHaveBeenCalledTimes(3);

    subB.unsubscribe();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    expect(request).toHaveBeenCalledTimes(3);
  });

  describe('while the tab is hidden', () => {
    let hidden = false;

    function setHidden(value: boolean): void {
      hidden = value;
      document.dispatchEvent(new Event('visibilitychange'));
    }

    beforeEach(() => {
      hidden = false;
      vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('makes no request while hidden, and one as soon as the tab shows', async () => {
      const request = vi.fn(() => of<Job>({state: 'running'}));
      const sub = poll(request, {intervalMs: INTERVAL_MS, isDone: () => false}).subscribe();
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledTimes(1);

      setHidden(true);
      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
      expect(request).toHaveBeenCalledTimes(1);

      setHidden(false);
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(INTERVAL_MS);
      expect(request).toHaveBeenCalledTimes(3);
      sub.unsubscribe();
    });

    it('makes no request at all when subscribed in a hidden tab, until it shows', async () => {
      hidden = true;
      const request = vi.fn(() => of<Job>({state: 'running'}));
      const sub = poll(request, {intervalMs: INTERVAL_MS, isDone: () => false}).subscribe();
      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
      expect(request).not.toHaveBeenCalled();

      setHidden(false);
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
    });
  });
});
