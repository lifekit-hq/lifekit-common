import {Pipe, type PipeTransform} from '@angular/core';
import {formatRelativeTime, type TimeInput} from '@lifekit-hq/core/format';

/**
 * Renders a timestamp as human relative time (`just now`, `5m ago`, `3h ago`, `2d ago`, `3w ago`).
 *
 * Pure, so it re-evaluates only when its inputs change - a value already on screen does not tick
 * forward by itself. Returns `fallback` (default `''`) for a missing or unparseable value.
 */
@Pipe({
  name: 'cmnRelativeTime',
})
export class RelativeTimePipe implements PipeTransform {
  public transform(value: TimeInput | null | undefined, fallback = ''): string {
    return formatRelativeTime(value) || fallback;
  }
}
