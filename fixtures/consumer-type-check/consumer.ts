// Fixture: verify the published package's types resolve for a real consumer.
// run.sh `npm pack`s the built library and extracts the tarball into a local
// node_modules/@lifekit-hq/ui, so this file compiles (skipLibCheck: false)
// against the ACTUAL packed artifact through real package resolution —
// package.json exports and files filtering included (issue #13).
//
// Whole-surface sweep: with skipLibCheck:false, importing the entire public
// API pulls every declaration of the emitted types rollup into the program —
// any type the rollup references but drops (the #9 bug class) fails the build.
// Peer deps (@angular/*) resolve from the repo's own node_modules — the
// consumer-provides-peers contract. Ambient @types do NOT: tsconfig.json sets
// `types: []`, so the repo's devDependency @types (google.accounts, node, …)
// are invisible here and any ambient namespace the rollup leans on without
// declaring fails with TS2503 (issue #15).
import * as api from '@lifekit-hq/ui';
import type {
  AlertItemComponent,
  AreaChartComponent,
  AsyncStatus,
  ButtonComponent,
  GoogleSignInButtonComponent,
  GoogleSignInButtonConfiguration,
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

// cmn-google-sign-in-button's configuration must be the exported structural
// type, not the ambient google.accounts namespace (issue #15).
declare const googleButton: GoogleSignInButtonComponent;
const buttonConfiguration: GoogleSignInButtonConfiguration = googleButton.buttonConfiguration();

// Silence "unused variable" without removing the checks
void [api, a, b, c, d, e, f, g, icon, badgeLabel, stacked, buttonConfiguration];
