# Changelog

## [2.0.0](https://github.com/lifekit-hq/lifekit-common/compare/v1.2.0...v2.0.0) (2026-10-07)


### ⚠ BREAKING CHANGES

* **ui:** cmn-bottom-tab-bar drops moreItems for a more NavItem input, and cmn-app-layout drops phoneMoreItems. Apps set moreRoute and build their own More page.

### Features

* **tokens:** brand assets follow the new tokens ([#104](https://github.com/lifekit-hq/lifekit-common/issues/104)) ([e26b5b1](https://github.com/lifekit-hq/lifekit-common/commit/e26b5b177d43018b50c518b94ca986838a8a19d2))
* **tokens:** design drift check in lifekit-chrome-check ([#111](https://github.com/lifekit-hq/lifekit-common/issues/111)) ([9644f55](https://github.com/lifekit-hq/lifekit-common/commit/9644f55260b5bc4409da460b9213e83091b4dc7f))
* **tokens:** support base-path apps in the browser-chrome standard and drift check ([#101](https://github.com/lifekit-hq/lifekit-common/issues/101)) ([63d1bab](https://github.com/lifekit-hq/lifekit-common/commit/63d1babed314dab235b97a10023451af72fd5ac0))
* **ui:** add cmnRelativeTime pipe ([#118](https://github.com/lifekit-hq/lifekit-common/issues/118)) ([f90f5e0](https://github.com/lifekit-hq/lifekit-common/commit/f90f5e0cc38ab071f6e0e350310c4e3a2fe7b74a))
* **ui:** async-state skeleton, empty and error-action slots ([#116](https://github.com/lifekit-hq/lifekit-common/issues/116)) ([6cbfa42](https://github.com/lifekit-hq/lifekit-common/commit/6cbfa420292a03a820965be0164133e5ab94cc0d))
* **ui:** one sheet, with More as an app-filled page ([#115](https://github.com/lifekit-hq/lifekit-common/issues/115)) ([626f88f](https://github.com/lifekit-hq/lifekit-common/commit/626f88fde8e57541983225be34d177d92ba411b3))
* **ui:** page-container matches finance-sentry's page frame, adds none spacing and fill mode ([#103](https://github.com/lifekit-hq/lifekit-common/issues/103)) ([62cee60](https://github.com/lifekit-hq/lifekit-common/commit/62cee609c87a0964894fed07dab8c0a612fd0c83))
* **ui:** shell owns the scroll ([#114](https://github.com/lifekit-hq/lifekit-common/issues/114)) ([bda393f](https://github.com/lifekit-hq/lifekit-common/commit/bda393fcfeb13004e60065848336e93b974cfcdc))
* **ui:** top bar owns title, back and actions ([#110](https://github.com/lifekit-hq/lifekit-common/issues/110)) ([d8bd74a](https://github.com/lifekit-hq/lifekit-common/commit/d8bd74a4e5d426675ca301a6201f60fddf8179b0))


### Bug Fixes

* **ui:** legible status, labels and money ([#108](https://github.com/lifekit-hq/lifekit-common/issues/108)) ([75b2181](https://github.com/lifekit-hq/lifekit-common/commit/75b2181d9f0560e45af5821548acca8b6dcd8f0f))
* **ui:** one container rule and calmer motion ([#106](https://github.com/lifekit-hq/lifekit-common/issues/106)) ([32644d2](https://github.com/lifekit-hq/lifekit-common/commit/32644d25af91b4e76f698796843e21e4b7672758))
* **ui:** touch-sized chrome ([#119](https://github.com/lifekit-hq/lifekit-common/issues/119)) ([fe6d95f](https://github.com/lifekit-hq/lifekit-common/commit/fe6d95fcd6b28bb566ccf589bf28a78d84204009))


### Documentation

* add phone app contract ([#105](https://github.com/lifekit-hq/lifekit-common/issues/105)) ([788de97](https://github.com/lifekit-hq/lifekit-common/commit/788de9777756fad1a84fd70aaf870afd33f54ab5))
* **tokens:** PWA sign-in checklist for Google OAuth origins ([#113](https://github.com/lifekit-hq/lifekit-common/issues/113)) ([f555e9f](https://github.com/lifekit-hq/lifekit-common/commit/f555e9f524f7a43717b1bddcbc94ed88d778175c))
* **ui:** add foundations stories for type ramp, colour tokens and money specimen ([#107](https://github.com/lifekit-hq/lifekit-common/issues/107)) ([a6b1c9a](https://github.com/lifekit-hq/lifekit-common/commit/a6b1c9a2c439ac9b5f34bf5565641c9d4ebaedb3))

## [1.2.0](https://github.com/lifekit-hq/lifekit-common/compare/v1.1.0...v1.2.0) (2026-10-06)


### Features

* **charts-core:** add valueFormat option to the line chart ([#100](https://github.com/lifekit-hq/lifekit-common/issues/100)) ([a99053c](https://github.com/lifekit-hq/lifekit-common/commit/a99053cf4bdb0b0d01ad381141b54028944c2f83))
* **tokens:** IBM Plex Sans and petrol accent ([#98](https://github.com/lifekit-hq/lifekit-common/issues/98)) ([92eab1e](https://github.com/lifekit-hq/lifekit-common/commit/92eab1ed07c73e576102a72a7c62e095ce27068c))

## [1.1.0](https://github.com/lifekit-hq/lifekit-common/compare/v1.0.0...v1.1.0) (2026-10-06)


### Features

* **core:** withUrlSync nested fields, csv codec and same-route URL following ([#96](https://github.com/lifekit-hq/lifekit-common/issues/96)) ([332a2d8](https://github.com/lifekit-hq/lifekit-common/commit/332a2d83ec2fe63857d96a2f5754664d7f6c731c))

## [1.0.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.9.0...v1.0.0) (2026-10-06)


### ⚠ BREAKING CHANGES

* **ui:** app-layout owns Cmd-K, palette, active route, theme and account glue ([#89](https://github.com/lifekit-hq/lifekit-common/issues/89))

### Features

* **ci:** fail when a new simple-leaf component lands as Angular ([#94](https://github.com/lifekit-hq/lifekit-common/issues/94)) ([3ca60cc](https://github.com/lifekit-hq/lifekit-common/commit/3ca60cc798b1d65e78a1aba865d227bff64347e3))
* **core:** add framework-free relative-time formatter ([#85](https://github.com/lifekit-hq/lifekit-common/issues/85)) ([5fdc93d](https://github.com/lifekit-hq/lifekit-common/commit/5fdc93dbda5267e3df1e07aa4c3f34cb1945a5f3))
* **tokens:** add base.css, page-container defaults and UX continuity policy ([#91](https://github.com/lifekit-hq/lifekit-common/issues/91)) ([48cc200](https://github.com/lifekit-hq/lifekit-common/commit/48cc200dce0a9905a5dcf9c6efce3d75482faf7d))
* **tokens:** add dc (devclaw) brand glyph ([#95](https://github.com/lifekit-hq/lifekit-common/issues/95)) ([e1b26e7](https://github.com/lifekit-hq/lifekit-common/commit/e1b26e73c9f22dda47d826572d17567ad6b3c3c3))
* **tokens:** ship pre-paint theme script and add system theme mode to ThemeService ([#86](https://github.com/lifekit-hq/lifekit-common/issues/86)) ([8f746ad](https://github.com/lifekit-hq/lifekit-common/commit/8f746ad6524f960900271fe3db5a32724b0b302f))
* **ui:** add routed mode to cmn-tab-group ([#93](https://github.com/lifekit-hq/lifekit-common/issues/93)) ([4aa2f2f](https://github.com/lifekit-hq/lifekit-common/commit/4aa2f2f065a0e82f18b5d16611f9bff1a9682d36))
* **ui:** add search-input, multi-select and date-range filter primitives ([#83](https://github.com/lifekit-hq/lifekit-common/issues/83)) ([0a216bd](https://github.com/lifekit-hq/lifekit-common/commit/0a216bd825175ad3edb9f184392f8ae2a35e9952))
* **ui:** add stepper-dialog multi-step component ([#88](https://github.com/lifekit-hq/lifekit-common/issues/88)) ([da669a6](https://github.com/lifekit-hq/lifekit-common/commit/da669a67f9b7fb9ccc45dc1f15396a2181b43777))
* **ui:** add usage chip and live pulse to status indicator ([#87](https://github.com/lifekit-hq/lifekit-common/issues/87)) ([066919f](https://github.com/lifekit-hq/lifekit-common/commit/066919f18b6d26a3beb961b97dec184e06c9d293))
* **ui:** app-layout owns Cmd-K, palette, active route, theme and account glue ([#89](https://github.com/lifekit-hq/lifekit-common/issues/89)) ([6ffb1e6](https://github.com/lifekit-hq/lifekit-common/commit/6ffb1e600ca6cdc5052247dd5369fb6720ebbeaa))
* **ui:** make data-table rows keyboard-accessible and tighten table states ([#84](https://github.com/lifekit-hq/lifekit-common/issues/84)) ([2abf1fe](https://github.com/lifekit-hq/lifekit-common/commit/2abf1fe37e9cc9571a9cded2baf6aac8bf4e2245))


### Bug Fixes

* **ui:** declare runtime peer dependencies and default brand to Lifekit ([#81](https://github.com/lifekit-hq/lifekit-common/issues/81)) ([a1d092c](https://github.com/lifekit-hq/lifekit-common/commit/a1d092c86c4708d7a9f8ee150443d6138127766b))


### Documentation

* **strategy:** fill usage-evidence column with consumer counts ([#90](https://github.com/lifekit-hq/lifekit-common/issues/90)) ([6ee7fab](https://github.com/lifekit-hq/lifekit-common/commit/6ee7fab2fdcb4d5534dbf8a9ee1da199dea66d92))
* **strategy:** replace web-components-long-term with layered substrate rule ([#92](https://github.com/lifekit-hq/lifekit-common/issues/92)) ([8b3533a](https://github.com/lifekit-hq/lifekit-common/commit/8b3533ae837c8c19dffb4e10fc1bc81acb91e452))

## [0.9.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.8.0...v0.9.0) (2026-10-05)


### Features

* **core:** add PushSubscriptionService to @lifekit-hq/core/pwa ([#71](https://github.com/lifekit-hq/lifekit-common/issues/71)) ([bc24124](https://github.com/lifekit-hq/lifekit-common/commit/bc24124461c148242d25a18e3e5bf3bcbd748e97))
* **tokens:** add lifekit brand mark, browser-chrome standard and self-hosted Inter ([#76](https://github.com/lifekit-hq/lifekit-common/issues/76)) ([9607bd5](https://github.com/lifekit-hq/lifekit-common/commit/9607bd5c4480d19ff19e9d4ba44b500c12a8fdf3))
* **ui:** add brand input to cmn-sidebar-nav and cmn-app-layout ([#80](https://github.com/lifekit-hq/lifekit-common/issues/80)) ([45679eb](https://github.com/lifekit-hq/lifekit-common/commit/45679ebf8375d7b609302935e17f230165605a57))


### Bug Fixes

* **tokens:** route fonts, radii and shadows through CSS custom properties ([#78](https://github.com/lifekit-hq/lifekit-common/issues/78)) ([6639990](https://github.com/lifekit-hq/lifekit-common/commit/66399904281ffb54681535722599e144d3783f5a))
* **ui:** correct accent contrast toward the passing lightness extreme ([#77](https://github.com/lifekit-hq/lifekit-common/issues/77)) ([42d6cc0](https://github.com/lifekit-hq/lifekit-common/commit/42d6cc091e5bfe654de675da65d42c963d42d85a))

## [0.8.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.7.0...v0.8.0) (2026-10-05)


### Features

* **elements:** add lk-account-menu signed-in user menu with sign out ([#73](https://github.com/lifekit-hq/lifekit-common/issues/73)) ([b003570](https://github.com/lifekit-hq/lifekit-common/commit/b0035704d750f1173bb8d00daa7440274db8746a))

## [0.7.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.6.1...v0.7.0) (2026-10-02)


### Features

* **ui:** add floatingActionClearance to app-layout phone overlay ([#65](https://github.com/lifekit-hq/lifekit-common/issues/65)) ([bd34faf](https://github.com/lifekit-hq/lifekit-common/commit/bd34fafe4c4eb4176fe5642c2f2325b8372167bd))
* **ui:** add per-column width input to cmn-column ([#67](https://github.com/lifekit-hq/lifekit-common/issues/67)) ([58ccfe3](https://github.com/lifekit-hq/lifekit-common/commit/58ccfe3e22bf8917815b0ce52273b9791b65e02f))


### Bug Fixes

* **charts-core:** begin stacked area chart value axis at zero ([#66](https://github.com/lifekit-hq/lifekit-common/issues/66)) ([989f738](https://github.com/lifekit-hq/lifekit-common/commit/989f7380b671ee7e360c0c423465bdd27b57df9e))
* **charts-core:** reorder donut default palette so adjacent slices differ in hue ([#70](https://github.com/lifekit-hq/lifekit-common/issues/70)) ([759c966](https://github.com/lifekit-hq/lifekit-common/commit/759c966d6ac177c815284f4560b8b348b2ee9b9c))
* **charts-core:** thin x ticks on narrow charts so labels never collide ([#69](https://github.com/lifekit-hq/lifekit-common/issues/69)) ([7de7ee3](https://github.com/lifekit-hq/lifekit-common/commit/7de7ee33c4b845cd6b725aa8180519ad7e1a6b58))
* **ui:** omit cmn-top-bar title heading when no title is set ([#68](https://github.com/lifekit-hq/lifekit-common/issues/68)) ([f93f474](https://github.com/lifekit-hq/lifekit-common/commit/f93f4748b57b3ea06f4ae2404ee4973d6621e07f))
* **ui:** render two-letter initials in top-bar avatar ([#63](https://github.com/lifekit-hq/lifekit-common/issues/63)) ([3b20390](https://github.com/lifekit-hq/lifekit-common/commit/3b2039027b293d92ba84eab56dfef185c1a49cd3))

## [0.6.1](https://github.com/lifekit-hq/lifekit-common/compare/v0.6.0...v0.6.1) (2026-10-02)


### Bug Fixes

* **ui:** pin app-layout shell to viewport and keep tab bar labels visible ([#61](https://github.com/lifekit-hq/lifekit-common/issues/61)) ([0ea93a5](https://github.com/lifekit-hq/lifekit-common/commit/0ea93a5434d22943c8d1a4fb988ab2eda54ba274))

## [0.6.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.5.1...v0.6.0) (2026-10-02)


### Features

* **ui:** add phoneOverlay edge-to-edge phone layout to app-layout ([#60](https://github.com/lifekit-hq/lifekit-common/issues/60)) ([3427409](https://github.com/lifekit-hq/lifekit-common/commit/3427409a3c68240ef7ce87cef21b6981e2254f58))
* **ui:** add showThemeToggle input to app-layout ([#58](https://github.com/lifekit-hq/lifekit-common/issues/58)) ([cd30982](https://github.com/lifekit-hq/lifekit-common/commit/cd309824f56821e1efda16dd06591329c78720f3))

## [0.5.1](https://github.com/lifekit-hq/lifekit-common/compare/v0.5.0...v0.5.1) (2026-10-01)


### Bug Fixes

* **elements:** publish @lifekit-hq/elements in the lockstep release ([#56](https://github.com/lifekit-hq/lifekit-common/issues/56)) ([3c5683d](https://github.com/lifekit-hq/lifekit-common/commit/3c5683d85e98193f58970bc29c21e339fef6d46b))

## [0.5.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.4.0...v0.5.0) (2026-10-01)


### Features

* **core:** add shared PWA layer ([#55](https://github.com/lifekit-hq/lifekit-common/issues/55)) ([608c95a](https://github.com/lifekit-hq/lifekit-common/commit/608c95afb06a766f889ca0f41617ab7b38ed9d6f))
* **ui:** add month stepper and checkbox, flat alert-item density, google button locale ([#54](https://github.com/lifekit-hq/lifekit-common/issues/54)) ([1463f19](https://github.com/lifekit-hq/lifekit-common/commit/1463f19ca873fe1313f58ef70ec37a0422fc191f))
* **ui:** add phone mode with bottom tab bar to app-layout ([#51](https://github.com/lifekit-hq/lifekit-common/issues/51)) ([1a1e05f](https://github.com/lifekit-hq/lifekit-common/commit/1a1e05fe1a77a18502453f03c81cf11f117954b9))
* **ui:** data-table list rows and drawer bottom sheet below md ([#53](https://github.com/lifekit-hq/lifekit-common/issues/53)) ([e073306](https://github.com/lifekit-hq/lifekit-common/commit/e073306ee2ac6071caacc64f3c77f46c86a5cbb8))


### Bug Fixes

* **ui:** chart token font, donut rendering, and empty state ([#50](https://github.com/lifekit-hq/lifekit-common/issues/50)) ([bcd756f](https://github.com/lifekit-hq/lifekit-common/commit/bcd756ffc0f25f253e6ce91d6e7bdc9c2c810133))

## [0.4.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.3.2...v0.4.0) (2026-09-26)


### Features

* **ui:** page-header heading scale, wrap rule, and secondary action ([#46](https://github.com/lifekit-hq/lifekit-common/issues/46)) ([adec93d](https://github.com/lifekit-hq/lifekit-common/commit/adec93d134cbb272f90754a974e409ec7a5be0b1))


### Bug Fixes

* **ui:** populate consumer gap audit, stories, tests, and fix bugs the audit surfaced ([#43](https://github.com/lifekit-hq/lifekit-common/issues/43)) ([40de421](https://github.com/lifekit-hq/lifekit-common/commit/40de421daeafadf969c8a57eb7a4b8a95a22544f))
* **ui:** stat-card zero-delta rendering, loading-height match, and long-value truncation ([#47](https://github.com/lifekit-hq/lifekit-common/issues/47)) ([432bf98](https://github.com/lifekit-hq/lifekit-common/commit/432bf9875bb46f4850fdd3e7c062d7b4d8f36a4c))


### Documentation

* **strategy:** mark ratified, fix summary counts, check them in CI ([#45](https://github.com/lifekit-hq/lifekit-common/issues/45)) ([05b8873](https://github.com/lifekit-hq/lifekit-common/commit/05b8873ba9e7e67ab596a4c77dc9e39600225f79))

## [0.3.2](https://github.com/lifekit-hq/lifekit-common/compare/v0.3.1...v0.3.2) (2026-09-19)


### Bug Fixes

* **ui:** type GoogleSignInButton configuration with an exported structural type ([#32](https://github.com/lifekit-hq/lifekit-common/issues/32)) ([d0360f2](https://github.com/lifekit-hq/lifekit-common/commit/d0360f2d266fe8b379d6587215e90e39962791f3)), closes [#15](https://github.com/lifekit-hq/lifekit-common/issues/15)

## [0.3.1](https://github.com/lifekit-hq/lifekit-common/compare/v0.3.0...v0.3.1) (2026-09-07)


### Bug Fixes

* **charts-core:** publish in partial compilation mode ([#29](https://github.com/lifekit-hq/lifekit-common/issues/29)) ([b5c4db3](https://github.com/lifekit-hq/lifekit-common/commit/b5c4db399dfbe48031fcdb76307aed8645c003b3))

## [0.3.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.2.2...v0.3.0) (2026-09-07)


### Features

* **ui:** expose a real stacked input on cmn-area-chart ([#25](https://github.com/lifekit-hq/lifekit-common/issues/25)) ([28f690b](https://github.com/lifekit-hq/lifekit-common/commit/28f690bc41ef30bd6750e7c7d678e0da0890d66a)), closes [#23](https://github.com/lifekit-hq/lifekit-common/issues/23)

## [0.2.2](https://github.com/lifekit-hq/lifekit-common/compare/v0.2.1...v0.2.2) (2026-08-29)


### Documentation

* align CLAUDE.md conventions with the amended repo gold standard ([#21](https://github.com/lifekit-hq/lifekit-common/issues/21)) ([866ff56](https://github.com/lifekit-hq/lifekit-common/commit/866ff56e47569b1bcca390bb95092e682a5d3555))
* devclaw work-item issue template (spec 024 — the issue is the contract) ([#19](https://github.com/lifekit-hq/lifekit-common/issues/19)) ([5d654fb](https://github.com/lifekit-hq/lifekit-common/commit/5d654fb3150d7da40dbc92e535cd33cff0ae7377))

## [0.2.1](https://github.com/lifekit-hq/lifekit-common/compare/v0.2.0...v0.2.1) (2026-08-28)


### Bug Fixes

* **ui:** declare charts-core dep, fix consumer-type-check, tighten… ([#16](https://github.com/lifekit-hq/lifekit-common/issues/16)) ([14d71fc](https://github.com/lifekit-hq/lifekit-common/commit/14d71fcb733b7c088187787d74659d99344ad005))
* **ui:** switch unit tests to jsdom and stub ResizeObserver for jsdom ([#11](https://github.com/lifekit-hq/lifekit-common/issues/11)) ([84bad0c](https://github.com/lifekit-hq/lifekit-common/commit/84bad0cee90f21a7c20252ca2bfa7185f89445b8))


### Documentation

* **ui:** add verifiable access trail for finance-sentry[#319](https://github.com/lifekit-hq/lifekit-common/issues/319) quote ([#17](https://github.com/lifekit-hq/lifekit-common/issues/17)) ([6cb625c](https://github.com/lifekit-hq/lifekit-common/commit/6cb625ce7fcd2b2400479f1114a8d75271ea7cf0))

## [0.2.0](https://github.com/lifekit-hq/lifekit-common/compare/v0.1.0...v0.2.0) (2026-08-25)


### Features

* end-to-end release pipeline, Pages Storybook, and ecosystem harness ([#7](https://github.com/lifekit-hq/lifekit-common/issues/7)) ([fcf9d56](https://github.com/lifekit-hq/lifekit-common/commit/fcf9d562b38bc82824b7be3e9eaca4be813e136c)), closes [#2](https://github.com/lifekit-hq/lifekit-common/issues/2)
* workspace scaffold + tokens and config packages ([#1](https://github.com/lifekit-hq/lifekit-common/issues/1), PR 1/2) ([#4](https://github.com/lifekit-hq/lifekit-common/issues/4)) ([e070d8d](https://github.com/lifekit-hq/lifekit-common/commit/e070d8d10bd1b86d97eee971ec13f63ac3fb3949))
