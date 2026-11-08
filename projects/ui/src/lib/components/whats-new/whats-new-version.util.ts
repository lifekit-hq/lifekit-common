import {type Nullable} from '../../types';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function parts(version: string): Nullable<[number, number, number]> {
  const match = SEMVER.exec(version);
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Whether semver `a` is newer than `b`; a version that is not `x.y.z` is never newer. */
export function isNewerVersion(a: string, b: string): boolean {
  const left = parts(a);
  const right = parts(b);
  if (left === null || right === null) {
    return false;
  }
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return left[index] > right[index];
    }
  }
  return false;
}
