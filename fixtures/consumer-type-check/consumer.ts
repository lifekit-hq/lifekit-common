// Fixture: verify Nullable/Maybe/AsyncStatus resolve from the published package.
// Compiled by the CI job with skipLibCheck: false against the npm-packed artifact.
import type {AlertItemComponent, AsyncStatus, ButtonComponent, Maybe, Nullable} from '@lifekit-hq/ui';

// Nullable<T> must be T | null
const a: Nullable<string> = null;
const b: Nullable<number> = 42;

// Maybe<T> must be T | null | undefined
const c: Maybe<string> = undefined;
const d: Maybe<boolean> = true;

// AsyncStatus must be the union literal
const e: AsyncStatus = 'idle';
const f: AsyncStatus = 'loading';
const g: AsyncStatus = 'error';

// Public component inputs that appear in the rollup must resolve
declare const btn: ButtonComponent;
declare const alertItem: AlertItemComponent;

// These resolve through the exported Nullable — if types were dropped they'd be 'any'
const icon: Nullable<string> = btn.icon();
const badgeLabel: Nullable<string> = alertItem.badgeLabel();

// Silence "unused variable" without removing the checks
void [a, b, c, d, e, f, g, icon, badgeLabel];
