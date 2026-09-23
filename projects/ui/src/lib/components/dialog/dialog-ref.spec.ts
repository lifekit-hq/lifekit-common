import {Subject} from 'rxjs';
import {describe, expect, it, vi} from 'vitest';

import {CmnDialogRef} from './dialog-ref';

function makeCdkRef(instance: unknown = null) {
  const closed = new Subject<unknown>();
  return {
    closed,
    componentInstance: instance,
    close: vi.fn(),
  };
}

describe('CmnDialogRef', () => {
  it('forwards close with its result to the CDK ref', () => {
    const cdk = makeCdkRef();
    new CmnDialogRef(cdk as never).close('saved');
    expect(cdk.close).toHaveBeenCalledWith('saved');
  });

  it('forwards a result-less close', () => {
    const cdk = makeCdkRef();
    new CmnDialogRef(cdk as never).close();
    expect(cdk.close).toHaveBeenCalledWith(undefined);
  });

  it('exposes the hosted component instance', () => {
    const instance = {marker: true};
    expect(new CmnDialogRef(makeCdkRef(instance) as never).componentInstance).toBe(instance);
  });

  it('surfaces the CDK closed stream through afterClosed', () => {
    const cdk = makeCdkRef();
    const seen: unknown[] = [];
    new CmnDialogRef(cdk as never).afterClosed().subscribe(v => seen.push(v));

    cdk.closed.next('result');
    expect(seen).toEqual(['result']);
  });
});
