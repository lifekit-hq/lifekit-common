// Fixture: verify the published package's types resolve for a real consumer.
// run.sh `npm pack`s the built library and extracts the tarball into a local
// node_modules/@lifekit-hq/ui, so this file compiles (skipLibCheck: false)
// against the ACTUAL packed artifact through real package resolution —
// package.json exports and files filtering included (issue #13).
//
// Whole-surface sweep: with skipLibCheck:false, importing the entire public
// API pulls every declaration of the emitted types rollup into the program —
// any type the rollup references but drops (the #9 bug class) fails the build.
// Peer deps (@angular/*) and ambient @types resolve from the repo's own
// node_modules — the consumer-provides-peers contract. Known gap: the rollup
// leans on ambient google.accounts types the package does not declare
// (tracked as its own issue); the repo devDependency masks it here.
import * as api from '@lifekit-hq/ui';
import type {
  AlertItemComponent,
  AreaChartComponent,
  AsyncStatus,
  ButtonComponent,
  Maybe,
  Nullable,
} from '@lifekit-hq/ui';

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

// cmn-area-chart's `stacked` must reach consumers as a real boolean input —
// finance-sentry monkey-patched node_modules to get one (issue #23).
declare const areaChart: AreaChartComponent;
const stacked: boolean = areaChart.stacked();

// Silence "unused variable" without removing the checks
void [api, a, b, c, d, e, f, g, icon, badgeLabel, stacked];
