import {type OutputEmitterRef} from '@angular/core';

/**
 * Whether anything is subscribed to `output`, i.e. whether the host template bound it. Angular
 * exposes no public check, so this reads the emitter's own listener list; if a future version
 * drops it the answer stays `true`, which only costs a pointer cursor on an unbound chart.
 * The chart specs pin the behaviour against the installed Angular.
 */
export function isOutputObserved(output: OutputEmitterRef<unknown>): boolean {
  const {listeners} = output as unknown as {listeners?: readonly unknown[] | null};
  return listeners === undefined || (listeners?.some(l => l !== null) ?? false);
}
