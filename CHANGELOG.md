# Changelog

## [5.1.0](https://github.com/lifekit-hq/lifekit-common/compare/v5.0.0...v5.1.0) (2026-11-14)


### Features

* **tokens:** add the Linear design preset ([#350](https://github.com/lifekit-hq/lifekit-common/issues/350)) ([abdc4ac](https://github.com/lifekit-hq/lifekit-common/commit/abdc4ac0e76095198bf0f9bdb2a008f9ac3fe14e))

## [5.0.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.8.0...v5.0.0) (2026-11-14)


### ⚠ BREAKING CHANGES

* **ui:** Tailwind's default spacing (`p-4`, `gap-2`, `-mt-1`) and type (`text-sm`, `text-lg`) classes no longer generate; use `p-cmn-4`, `gap-cmn-2`, `-mt-cmn-1` and `text-cmn-sm`. `text-cmn-xl` is removed (use `text-cmn-lg`). `cmn-page-container` is removed (use `cmn-page`). `lifekit/page-root` is an error. The preset sets `theme.spacing` and `theme.fontSize` instead of the `extend` keys. See docs/MIGRATING-TO-5.md.

### Features

* **tokens:** add the basket colour seed ([#351](https://github.com/lifekit-hq/lifekit-common/issues/351)) ([d846930](https://github.com/lifekit-hq/lifekit-common/commit/d84693002bef2a6515387873b451ece8a0009a3d))
* **ui:** make page templates mandatory and drop Tailwind default spacing and type scales ([#348](https://github.com/lifekit-hq/lifekit-common/issues/348)) ([c4cb983](https://github.com/lifekit-hq/lifekit-common/commit/c4cb983378f56cf4c25c51473ac9938aba73d04c))

## [4.8.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.7.1...v4.8.0) (2026-11-10)


### Features

* **ui:** add a per-app mark hook whose colour follows the seed, and a basket icon set ([#345](https://github.com/lifekit-hq/lifekit-common/issues/345)) ([d644be0](https://github.com/lifekit-hq/lifekit-common/commit/d644be0b1e2e059398295b91cbef6bd38098f221))
* **ui:** add BadgePercent, WalletCards and Maximize2 icons and gate apps on missing icons ([#340](https://github.com/lifekit-hq/lifekit-common/issues/340)) ([cfb0e1f](https://github.com/lifekit-hq/lifekit-common/commit/cfb0e1f603a704f992ca7c939beafff768f5c7c8))


### Bug Fixes

* **elements:** start theme-picker Custom at the app seed and paint the colour well from tokens ([#343](https://github.com/lifekit-hq/lifekit-common/issues/343)) ([3ee62b9](https://github.com/lifekit-hq/lifekit-common/commit/3ee62b979ed2d5f0e253264cfeb63a308d7ade8e))
* **ui:** remember an explicit Carbon preset choice apart from no choice ([#346](https://github.com/lifekit-hq/lifekit-common/issues/346)) ([0477942](https://github.com/lifekit-hq/lifekit-common/commit/04779420a1641c936772cf833056dbb4ea5cb351))
* **ui:** stop command palette saying "No results" for an empty query and use the dialog scrim token ([#344](https://github.com/lifekit-hq/lifekit-common/issues/344)) ([309482a](https://github.com/lifekit-hq/lifekit-common/commit/309482a6367044c5d876df3f7d287e940004993e))

## [4.7.1](https://github.com/lifekit-hq/lifekit-common/compare/v4.7.0...v4.7.1) (2026-11-09)


### Bug Fixes

* **ui:** stack cmn-alert-item's dismiss button beneath a sticky list-section heading ([#336](https://github.com/lifekit-hq/lifekit-common/issues/336)) ([c7a072e](https://github.com/lifekit-hq/lifekit-common/commit/c7a072e460eaee469a740f44fbffca0a86c0f894))

## [4.7.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.6.0...v4.7.0) (2026-11-09)


### Features

* **tokens:** flag a missing apple-touch-startup-image in lifekit-chrome-check ([#335](https://github.com/lifekit-hq/lifekit-common/issues/335)) ([975e9fe](https://github.com/lifekit-hq/lifekit-common/commit/975e9fe73368e6ecfed46eb44589de14b929acc3))
* **ui:** add cmn-prose, the text measure for body copy in a page ([#332](https://github.com/lifekit-hq/lifekit-common/issues/332)) ([d9049f1](https://github.com/lifekit-hq/lifekit-common/commit/d9049f190127edcd875accb46fe4c5b9aad4a529))
* **ui:** let cmn-alert-item open itself so the alerts screen can sit on cmn-page ([#334](https://github.com/lifekit-hq/lifekit-common/issues/334)) ([1f22c28](https://github.com/lifekit-hq/lifekit-common/commit/1f22c285b86b8df22a0908a6c5d28d74c7089fe2))

## [4.6.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.5.0...v4.6.0) (2026-11-09)


### Features

* **tokens,ui:** add the design preset mechanism ([#320](https://github.com/lifekit-hq/lifekit-common/issues/320)) ([2786b07](https://github.com/lifekit-hq/lifekit-common/commit/2786b0794bf548548f53a8f6cca1860b7c1d4591))
* **ui:** add cmn-tile-grid, one shared exclusive panel for detail views ([#321](https://github.com/lifekit-hq/lifekit-common/issues/321)) ([afa47b3](https://github.com/lifekit-hq/lifekit-common/commit/afa47b30917aef9e3d07e528e269051392993fd3))
* **ui:** add cmn-verdict-header for verdict-first detail views ([#322](https://github.com/lifekit-hq/lifekit-common/issues/322)) ([4560af1](https://github.com/lifekit-hq/lifekit-common/commit/4560af15f53a3198185bc9eb6171f999997288a9))
* **ui:** add enter and leave motion to dialogs, drawers and toasts ([#312](https://github.com/lifekit-hq/lifekit-common/issues/312)) ([f34f331](https://github.com/lifekit-hq/lifekit-common/commit/f34f331556af6cd31a39e6305d06b9c799ce5965))
* **ui:** add motion to lists, chips, toggles and tabs ([#314](https://github.com/lifekit-hq/lifekit-common/issues/314)) ([0ec5fd4](https://github.com/lifekit-hq/lifekit-common/commit/0ec5fd4a989d1310225d3b648136086246f8dbf5))
* **ui:** add motion to skeleton-to-content, disclosure rows and route changes ([#319](https://github.com/lifekit-hq/lifekit-common/issues/319)) ([79fe23b](https://github.com/lifekit-hq/lifekit-common/commit/79fe23bfc27d29289cad0f43d40ae61c15459928))
* **ui:** add preset hook tokens and use them across components ([#323](https://github.com/lifekit-hq/lifekit-common/issues/323)) ([baf8aa2](https://github.com/lifekit-hq/lifekit-common/commit/baf8aa2e97e60829057e24721e0dbdad9a2dec21))
* **ui:** add pull to refresh on tab roots ([#315](https://github.com/lifekit-hq/lifekit-common/issues/315)) ([1c1eecd](https://github.com/lifekit-hq/lifekit-common/commit/1c1eecd694b770b08ffd8a5917e78bedd8ef1dff))
* **ui:** add swipe actions to cmn-list-item-row ([#313](https://github.com/lifekit-hq/lifekit-common/issues/313)) ([c8f63d0](https://github.com/lifekit-hq/lifekit-common/commit/c8f63d01471cd163aba26f6cc7b2b8fd5483cde5))
* **ui:** add the Lifekit design preset ([#331](https://github.com/lifekit-hq/lifekit-common/issues/331)) ([32a0d06](https://github.com/lifekit-hq/lifekit-common/commit/32a0d06433c104618cebaac02ce939a15adfc2be))
* **ui:** add What's new as a library feature ([#296](https://github.com/lifekit-hq/lifekit-common/issues/296)) ([76b6854](https://github.com/lifekit-hq/lifekit-common/commit/76b6854a945e2b9240a1c8d44543ddf3be032c45))
* **ui:** align lists and tables with Carbon geometry and tokens ([#295](https://github.com/lifekit-hq/lifekit-common/issues/295)) ([ca31d3d](https://github.com/lifekit-hq/lifekit-common/commit/ca31d3de47d590e753a127c95fdd7ec8ea58445c))
* **ui:** align the desktop shell with Carbon UI Shell ([#298](https://github.com/lifekit-hq/lifekit-common/issues/298)) ([03604da](https://github.com/lifekit-hq/lifekit-common/commit/03604da177608810606f4acfad7e465e3661852c))


### Bug Fixes

* **ui:** keep tab-bar labels from clipping at 200 percent text ([#324](https://github.com/lifekit-hq/lifekit-common/issues/324)) ([725ba59](https://github.com/lifekit-hq/lifekit-common/commit/725ba59f99b7bace1b133c08c7b51bccfa8bb1d7))
* **ui:** keep the overview fill page scroll container bounded at xl ([#326](https://github.com/lifekit-hq/lifekit-common/issues/326)) ([abd3106](https://github.com/lifekit-hq/lifekit-common/commit/abd3106638861fdd76f0e2b28e823cd093a5785b)), closes [#325](https://github.com/lifekit-hq/lifekit-common/issues/325)

## [4.5.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.4.2...v4.5.0) (2026-11-08)


### Features

* **tokens:** add the Carbon --cds-* seed bridge, generated from theme.css ([#286](https://github.com/lifekit-hq/lifekit-common/issues/286)) ([b6dac5e](https://github.com/lifekit-hq/lifekit-common/commit/b6dac5eed72629f327a8f6d21d366cf24c82e334))
* **tokens:** align theme.css to Carbon type, layout sizes, square geometry and motion ([#291](https://github.com/lifekit-hq/lifekit-common/issues/291)) ([46b5acf](https://github.com/lifekit-hq/lifekit-common/commit/46b5acfbd4d7a7bfc6748c23c29dca3ec5952341))
* **ui:** align controls with Carbon geometry and tokens ([#294](https://github.com/lifekit-hq/lifekit-common/issues/294)) ([3a4f483](https://github.com/lifekit-hq/lifekit-common/commit/3a4f483a93e37e9fd90eca6c6453effe52d40ea5))
* **ui:** draw the first second with page skeleton presets and a pending-account shell ([#290](https://github.com/lifekit-hq/lifekit-common/issues/290)) ([683a759](https://github.com/lifekit-hq/lifekit-common/commit/683a759e6b969f23ed6093d0450346af56499762))


### Bug Fixes

* **tokens:** accept the overview template's own rail in the route scan ([#293](https://github.com/lifekit-hq/lifekit-common/issues/293)) ([8d1ae55](https://github.com/lifekit-hq/lifekit-common/commit/8d1ae552bea568518814dfe4f2622fe00eb2bc72))
* **ui:** give checkbox, toggle and drawer close a 44px phone hit area ([#289](https://github.com/lifekit-hq/lifekit-common/issues/289)) ([e732600](https://github.com/lifekit-hq/lifekit-common/commit/e732600b186c4577f630a0a83db1c8a77282999c))


### Performance

* **ui:** register a generated Lucide subset in cmn-icon instead of the whole icon map ([#285](https://github.com/lifekit-hq/lifekit-common/issues/285)) ([0f8dff4](https://github.com/lifekit-hq/lifekit-common/commit/0f8dff473ff150a1e188b5d2ff686838dc6c7702))

## [4.4.2](https://github.com/lifekit-hq/lifekit-common/compare/v4.4.1...v4.4.2) (2026-11-07)


### Bug Fixes

* **ci:** let the reusable screen-baselines workflow install private packages ([#267](https://github.com/lifekit-hq/lifekit-common/issues/267)) ([22eff2c](https://github.com/lifekit-hq/lifekit-common/commit/22eff2c2043d631a082eb5ff20b8d10955c22e12))

## [4.4.1](https://github.com/lifekit-hq/lifekit-common/compare/v4.4.0...v4.4.1) (2026-11-07)


### Bug Fixes

* **tokens:** rasterise whole tiles so screen baselines compare exactly ([#258](https://github.com/lifekit-hq/lifekit-common/issues/258)) ([b3e470a](https://github.com/lifekit-hq/lifekit-common/commit/b3e470ab9bad2ed06135a2d95bc38c66560d0f49))
* **ui:** resolve the six 4.4.0 adoption findings so apps adopt without local exceptions ([#261](https://github.com/lifekit-hq/lifekit-common/issues/261)) ([1d4633f](https://github.com/lifekit-hq/lifekit-common/commit/1d4633f4646ee842fec9ad9fdcf2a58177d5affc))

## [4.4.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.3.0...v4.4.0) (2026-11-07)


### Features

* **config:** add lifekit/page-root lint rule ([#240](https://github.com/lifekit-hq/lifekit-common/issues/240)) ([46e833c](https://github.com/lifekit-hq/lifekit-common/commit/46e833c6c1ac272400a1755930b4b18dc7c652aa)), closes [#235](https://github.com/lifekit-hq/lifekit-common/issues/235)
* **tokens:** add checkSkeleton page-level skeleton conformance helper ([#228](https://github.com/lifekit-hq/lifekit-common/issues/228)) ([5c0b9d0](https://github.com/lifekit-hq/lifekit-common/commit/5c0b9d0b30ae10663c540e7ef51e794bd5ad2d3d))
* **tokens:** add route scan fixture and fix the findings it raised on the goldens ([#248](https://github.com/lifekit-hq/lifekit-common/issues/248)) ([be41340](https://github.com/lifekit-hq/lifekit-common/commit/be41340556af4250b3b3d02f52a103ffe719adf8))
* **tokens:** add shared screenshot-baseline fixture with Linux baselines and PR before/after report ([#241](https://github.com/lifekit-hq/lifekit-common/issues/241)) ([a72fd3b](https://github.com/lifekit-hq/lifekit-common/commit/a72fd3b9bad78b18c82599f6c93c1dce3e55acce))
* **ui:** add detail, form and settings page templates ([#242](https://github.com/lifekit-hq/lifekit-common/issues/242)) ([6b511db](https://github.com/lifekit-hq/lifekit-common/commit/6b511db2e7ed3c1cd90c380e9495e184cf7c8645))
* **ui:** add the overview page template with a rail the screen check reads ([#245](https://github.com/lifekit-hq/lifekit-common/issues/245)) ([b574fea](https://github.com/lifekit-hq/lifekit-common/commit/b574feaab63f0491e97e142a089d51905bf19290)), closes [#233](https://github.com/lifekit-hq/lifekit-common/issues/233)


### Bug Fixes

* **tokens:** raise multi-line line-height from 1.25 to 1.3 to match the design judge ([#244](https://github.com/lifekit-hq/lifekit-common/issues/244)) ([9482adb](https://github.com/lifekit-hq/lifekit-common/commit/9482adb8161cfeb6e48322b1ebe9163dd617cfa0))


### Documentation

* correct consumer tables and stale React claim in AGENTS, README and PRODUCT ([#231](https://github.com/lifekit-hq/lifekit-common/issues/231)) ([0be60ed](https://github.com/lifekit-hq/lifekit-common/commit/0be60ed03b9950a8200ce31b97dfd79023b6b934))
* **design:** make DESIGN.md lifekit-wide and point money rules to finance-sentry ([#243](https://github.com/lifekit-hq/lifekit-common/issues/243)) ([1e57c3b](https://github.com/lifekit-hq/lifekit-common/commit/1e57c3bff2e9b594791ce18c6e30d50340a11e20)), closes [#238](https://github.com/lifekit-hq/lifekit-common/issues/238)

## [4.3.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.2.2...v4.3.0) (2026-11-04)


### Features

* **ui:** add cmn-page list template, layout tokens and screen-composition check ([#226](https://github.com/lifekit-hq/lifekit-common/issues/226)) ([7e00a2e](https://github.com/lifekit-hq/lifekit-common/commit/7e00a2ed104651e644cb940ccddc95f603c3e25b))

## [4.2.2](https://github.com/lifekit-hq/lifekit-common/compare/v4.2.1...v4.2.2) (2026-11-03)


### Bug Fixes

* **ui:** re-measure the phone shell only after the keyboard closes ([#224](https://github.com/lifekit-hq/lifekit-common/issues/224)) ([13919db](https://github.com/lifekit-hq/lifekit-common/commit/13919db01c9da3d3e09b635fbaa0ed78dac3aab2))

## [4.2.1](https://github.com/lifekit-hq/lifekit-common/compare/v4.2.0...v4.2.1) (2026-11-03)


### Bug Fixes

* **ui:** re-measure the phone shell height on load and viewport resize ([#222](https://github.com/lifekit-hq/lifekit-common/issues/222)) ([e77517c](https://github.com/lifekit-hq/lifekit-common/commit/e77517c9cbdfae0411ef29bb4b9eb3805bb8c441))

## [4.2.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.1.0...v4.2.0) (2026-10-22)


### Features

* **ui:** scroll only the list inside fill pages with cmn-page-scroll ([#219](https://github.com/lifekit-hq/lifekit-common/issues/219)) ([901fba0](https://github.com/lifekit-hq/lifekit-common/commit/901fba05de2dd7da35e0740bf5f97c41d92adbfe))

## [4.1.0](https://github.com/lifekit-hq/lifekit-common/compare/v4.0.0...v4.1.0) (2026-10-22)


### Features

* **ui:** add an action mode to cmn-list-item-row ([#214](https://github.com/lifekit-hq/lifekit-common/issues/214)) ([258dbc2](https://github.com/lifekit-hq/lifekit-common/commit/258dbc214f2c8d4822a87c5b25123500b6a0382f)), closes [#213](https://github.com/lifekit-hq/lifekit-common/issues/213)
* **ui:** add presets to cmn-date-range ([#212](https://github.com/lifekit-hq/lifekit-common/issues/212)) ([1cc57ea](https://github.com/lifekit-hq/lifekit-common/commit/1cc57ead86798ac3fa2438c302438bad50f7939c))
* **ui:** add searchable and chip-based multiple modes to cmn-select ([#202](https://github.com/lifekit-hq/lifekit-common/issues/202)) ([bcde83c](https://github.com/lifekit-hq/lifekit-common/commit/bcde83cb4d775b5899c3f1babdf15c0b275a13f8))
* **ui:** add sorting, truncation, summary row and fuller pager to cmn-data-table ([#210](https://github.com/lifekit-hq/lifekit-common/issues/210)) ([3ea1ea3](https://github.com/lifekit-hq/lifekit-common/commit/3ea1ea3a700a85df85d7676e31e29109d6105a3a))
* **ui:** follow APG keyboard patterns in cmn-menu and cmn-tab-group ([#206](https://github.com/lifekit-hq/lifekit-common/issues/206)) ([645a3e4](https://github.com/lifekit-hq/lifekit-common/commit/645a3e43bf6a0fde60c9039760f4ada8cb1fb156))
* **ui:** give charts an accessible name, data table and keyboard reading ([#208](https://github.com/lifekit-hq/lifekit-common/issues/208)) ([e5cfc53](https://github.com/lifekit-hq/lifekit-common/commit/e5cfc5316d6463ca351df6edaaca885c0718005f))


### Bug Fixes

* **ui:** re-measure the phone shell after the keyboard closes in a standalone install ([#216](https://github.com/lifekit-hq/lifekit-common/issues/216)) ([63e9808](https://github.com/lifekit-hq/lifekit-common/commit/63e98085e3f283e0e34f74573557568c378a7ec6)), closes [#215](https://github.com/lifekit-hq/lifekit-common/issues/215)

## [4.0.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.9.0...v4.0.0) (2026-10-21)


### ⚠ BREAKING CHANGES

* **ui:** cmn-empty-state's `subMessage` (the body) is now a required string input; every cmn-empty-state must pass a body alongside `message`.
* cmn-form-field no longer shows errors on blur or after markAllAsTouched alone; errors appear when the form is submitted and clear live once fixed. Error toasts no longer auto-dismiss. cmn-async-state turns on keepContent, showDelay 200 and minDisplay 400 by default (opt out with [keepContent]="false" or a 0 delay). cmn-google-sign-in-button, cmn-password-strength, cmn-stepper-dialog, cmn-usage-chip and cmn-multi-select are removed (use cmn-select with multiple). An unread cmn-alert-item's title is now a real button stretched over the card (a click anywhere still marks it read); a read item's card is no longer clickable. The default validation messages and withAsyncStatus's default error message have new wording. The @lifekit-hq/config template preset makes click-events-have-key-events and interactive-supports-focus errors.

### Features

* adopt the UI/UX guardrails and enforce them ([#187](https://github.com/lifekit-hq/lifekit-common/issues/187)) ([e07517f](https://github.com/lifekit-hq/lifekit-common/commit/e07517fbde706eb3d5f2a464584b268ffee86f51))
* **ui:** add cmn-allocation-bar proportional split bar ([#185](https://github.com/lifekit-hq/lifekit-common/issues/185)) ([b30a4ba](https://github.com/lifekit-hq/lifekit-common/commit/b30a4ba91c01f76542e642b59afeefb117684bb2))
* **ui:** add cmn-description-list, a key-value list on dl/dt/dd ([#199](https://github.com/lifekit-hq/lifekit-common/issues/199)) ([b6fcf5a](https://github.com/lifekit-hq/lifekit-common/commit/b6fcf5ac3cfdaa1c993b7b1d63a66a93334e2d88)), closes [#198](https://github.com/lifekit-hq/lifekit-common/issues/198)
* **ui:** add cmn-error-summary, input hints and forms support for checkbox and toggle ([#189](https://github.com/lifekit-hq/lifekit-common/issues/189)) ([5a06974](https://github.com/lifekit-hq/lifekit-common/commit/5a0697413254111669945677ab98eb43021928b6))
* **ui:** add cmnTooltip, a WCAG 1.4.13 tooltip directive ([#193](https://github.com/lifekit-hq/lifekit-common/issues/193)) ([d3a4b04](https://github.com/lifekit-hq/lifekit-common/commit/d3a4b042324935a53311c8586ed07dc420ea05bb))
* **ui:** add first-use, no-results and error kinds to cmn-empty-state ([#197](https://github.com/lifekit-hq/lifekit-common/issues/197)) ([04b868b](https://github.com/lifekit-hq/lifekit-common/commit/04b868bdee71cac8fefc35dee643594371ce107e))
* **ui:** add toast actions, a newest-last stack and a hover/focus pause ([#195](https://github.com/lifekit-hq/lifekit-common/issues/195)) ([2ded6ee](https://github.com/lifekit-hq/lifekit-common/commit/2ded6ee2e0eb3d32220496a334689a4292155558))
* **ui:** let cmn-stat-card format a numeric value through the library formatter ([#191](https://github.com/lifekit-hq/lifekit-common/issues/191)) ([90e72ad](https://github.com/lifekit-hq/lifekit-common/commit/90e72adde85cd9d29badf12927f3de6da9749411))

## [3.9.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.8.0...v3.9.0) (2026-10-21)


### Features

* **ui:** gate CI on axe accessibility over every story ([#180](https://github.com/lifekit-hq/lifekit-common/issues/180)) ([df030bb](https://github.com/lifekit-hq/lifekit-common/commit/df030bb214dcd0b5e51bd532e7b70265f87df657))


### Bug Fixes

* **ui:** fix design-scan findings and gate CI on the design baseline ([#181](https://github.com/lifekit-hq/lifekit-common/issues/181)) ([a223700](https://github.com/lifekit-hq/lifekit-common/commit/a2237009cb6891115ac3022aca0459bae2bb2b77)), closes [#175](https://github.com/lifekit-hq/lifekit-common/issues/175)


### Documentation

* add MIT LICENSE and fix stale README/STRATEGY claims ([#178](https://github.com/lifekit-hq/lifekit-common/issues/178)) ([e070ae0](https://github.com/lifekit-hq/lifekit-common/commit/e070ae01dd995b65c701abeb3dfa93b9febc7935))

## [3.8.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.7.0...v3.8.0) (2026-10-17)


### Features

* **tokens:** add cmn-link and cmn-code-block text primitives ([#173](https://github.com/lifekit-hq/lifekit-common/issues/173)) ([516f568](https://github.com/lifekit-hq/lifekit-common/commit/516f568b3083e6024d50a19ad95627d1215149aa))

## [3.7.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.6.0...v3.7.0) (2026-10-17)


### Features

* **ui:** iOS-standard phone shell, 49pt edge-to-edge tab bar, scroll-edge top bar, no accidental zoom ([#170](https://github.com/lifekit-hq/lifekit-common/issues/170)) ([3d10434](https://github.com/lifekit-hq/lifekit-common/commit/3d104340900a33fb1965fbc4eeb11e6ae1278e6b))
* **ui:** present cmn-dialog as a bottom sheet, full-screen or action sheet on phones ([#171](https://github.com/lifekit-hq/lifekit-common/issues/171)) ([f2b2ddd](https://github.com/lifekit-hq/lifekit-common/commit/f2b2ddd3cf2d88c8b51a83deb77c8fbbcfea71d9))

## [3.6.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.5.0...v3.6.0) (2026-10-17)


### Features

* **ui:** redesign cmn-empty-state as a full-width state with optional actions ([#168](https://github.com/lifekit-hq/lifekit-common/issues/168)) ([1f6e9c3](https://github.com/lifekit-hq/lifekit-common/commit/1f6e9c36194d693f8f790b977ac80edd20e599b1))

## [3.5.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.4.0...v3.5.0) (2026-10-16)


### Features

* **ui:** add status dot to cmn-institution-avatar and cmn-disclosure-row ([#167](https://github.com/lifekit-hq/lifekit-common/issues/167)) ([1259fbc](https://github.com/lifekit-hq/lifekit-common/commit/1259fbc7b29915055bfd5144e71143a084ace76a))


### Bug Fixes

* **core:** crossfade route changes only and stop async-state replaying fade-in on revisit ([#165](https://github.com/lifekit-hq/lifekit-common/issues/165)) ([719ce70](https://github.com/lifekit-hq/lifekit-common/commit/719ce70bd49cbce46d090e8ec23f3a31013d100b))
* **ui:** cmn-async-state [crossfade] fades only content that replaces a ([719ce70](https://github.com/lifekit-hq/lifekit-common/commit/719ce70bd49cbce46d090e8ec23f3a31013d100b))

## [3.4.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.3.1...v3.4.0) (2026-10-14)


### Features

* **elements:** add lk-infinite-list, TabPreloadStrategy and motion/blur guidance ([#164](https://github.com/lifekit-hq/lifekit-common/issues/164)) ([cd06af1](https://github.com/lifekit-hq/lifekit-common/commit/cd06af185471f05bbf1f29644e2973dbcb9b43d5))
* **tokens:** add fixed category and flow-fill colours, drop Rose and Graphite presets ([#160](https://github.com/lifekit-hq/lifekit-common/issues/160)) ([0749387](https://github.com/lifekit-hq/lifekit-common/commit/07493879d261f1178bb63427c49304e4f8346f76))
* **ui:** add skeleton presets, calm async-state loading and motion tokens ([#163](https://github.com/lifekit-hq/lifekit-common/issues/163)) ([bd37dae](https://github.com/lifekit-hq/lifekit-common/commit/bd37dae558574ec01b41094d4c16a8084e5dc28c))
* **ui:** shell-measured content insets and overflow-proof phone primitives ([#162](https://github.com/lifekit-hq/lifekit-common/issues/162)) ([af4d646](https://github.com/lifekit-hq/lifekit-common/commit/af4d646e40dd303748cc747bb8f12273b56651c9))

## [3.3.1](https://github.com/lifekit-hq/lifekit-common/compare/v3.3.0...v3.3.1) (2026-10-13)


### Bug Fixes

* **ui:** emit portable ThemeMode type in cmn-appearance-settings declarations ([#158](https://github.com/lifekit-hq/lifekit-common/issues/158)) ([f2df44d](https://github.com/lifekit-hq/lifekit-common/commit/f2df44d205f78eccc42bebec9ce85d706d7a1e1e))

## [3.3.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.2.0...v3.3.0) (2026-10-13)


### Features

* **core:** add preferences entry point and the app-shell standard ([#155](https://github.com/lifekit-hq/lifekit-common/issues/155)) ([8b1f0e2](https://github.com/lifekit-hq/lifekit-common/commit/8b1f0e28945f0dc0d45f31713813dd656c5fedff))
* **tokens:** add lifekit-theme-sync bin and the backstage seed ([#153](https://github.com/lifekit-hq/lifekit-common/issues/153)) ([32ea6e2](https://github.com/lifekit-hq/lifekit-common/commit/32ea6e2b107fbdab78f91d60460013ae126c0237))
* **ui:** account standard - identity header, accountMenu() and cmn-more-page ([#156](https://github.com/lifekit-hq/lifekit-common/issues/156)) ([cb1c6e8](https://github.com/lifekit-hq/lifekit-common/commit/cb1c6e8451eebc2ae2c09d4337a0c1255035fb1d))
* **ui:** add cmn-segmented and cmn-appearance-settings with account-synced appearance ([#157](https://github.com/lifekit-hq/lifekit-common/issues/157)) ([977fea3](https://github.com/lifekit-hq/lifekit-common/commit/977fea359e040f578927e12783f2289fdc70ca2d))
* **ui:** add settings kit (settings-section, setting-row, danger-zone) ([#154](https://github.com/lifekit-hq/lifekit-common/issues/154)) ([80a7f2c](https://github.com/lifekit-hq/lifekit-common/commit/80a7f2c99514926ab9b434411f26d5fc86a034ae))


### Bug Fixes

* **elements:** redraw lk-line-chart when the theme or seed colour changes ([#151](https://github.com/lifekit-hq/lifekit-common/issues/151)) ([00f9bd6](https://github.com/lifekit-hq/lifekit-common/commit/00f9bd6e68841212a751b74b3e1f3901c139eb23))

## [3.2.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.1.0...v3.2.0) (2026-10-11)


### Features

* **core:** add withNamedAsyncStatus for stores that track several requests ([#150](https://github.com/lifekit-hq/lifekit-common/issues/150)) ([6819569](https://github.com/lifekit-hq/lifekit-common/commit/68195699464da2cf1de1bfb30ce250e749157823))
* **ui:** multi-line text field, and a clickable version footer with a dot ([#144](https://github.com/lifekit-hq/lifekit-common/issues/144)) ([13deedb](https://github.com/lifekit-hq/lifekit-common/commit/13deedbc114ac88578d7fa155ed26d453331ca18))


### Bug Fixes

* **tokens:** alias delta-up/down to gain/loss so deltas share one green and red ([#148](https://github.com/lifekit-hq/lifekit-common/issues/148)) ([a0de190](https://github.com/lifekit-hq/lifekit-common/commit/a0de190aac2f5b26f19b99edc98460472dc19620))
* **ui:** dim rows by recolouring text, selected segment tint, hairline border on overlays ([#147](https://github.com/lifekit-hq/lifekit-common/issues/147)) ([6ba2baa](https://github.com/lifekit-hq/lifekit-common/commit/6ba2baac0411e9624c93e49c8360365d5ca5fc94))
* **ui:** give form controls 3:1 borders and visible keyboard focus ([#146](https://github.com/lifekit-hq/lifekit-common/issues/146)) ([59e4aaf](https://github.com/lifekit-hq/lifekit-common/commit/59e4aafb3b679c3803e3762838d6a28b5a6a0226))
* **ui:** rebuild charts when the theme or seed colour changes ([#149](https://github.com/lifekit-hq/lifekit-common/issues/149)) ([1251a3b](https://github.com/lifekit-hq/lifekit-common/commit/1251a3b60f061f12854e7223097b6928f34ec5f1))

## [3.1.0](https://github.com/lifekit-hq/lifekit-common/compare/v3.0.0...v3.1.0) (2026-10-07)


### Features

* **tokens:** add fixed-meaning colours for asset classes, gain/loss and cash flow ([#142](https://github.com/lifekit-hq/lifekit-common/issues/142)) ([7e82bce](https://github.com/lifekit-hq/lifekit-common/commit/7e82bce2b767556fae46e90a88c11e8e6d4a3c85))

## [3.0.0](https://github.com/lifekit-hq/lifekit-common/compare/v2.3.0...v3.0.0) (2026-10-07)


### ⚠ BREAKING CHANGES

* @lifekit-hq/ui no longer exports EditableFieldComponent, @lifekit-hq/elements no longer exports LkAccountMenu, and @lifekit-hq/core no longer exports withFilters, withSorting and withPagination.

### Features

* **elements:** add lk-dismissible-chip with an accessible remove button ([#140](https://github.com/lifekit-hq/lifekit-common/issues/140)) ([3ffbdc3](https://github.com/lifekit-hq/lifekit-common/commit/3ffbdc36354ec717e0939dea4d0a945e68a40356))
* **tokens:** derive each app's palette from one seed colour ([#134](https://github.com/lifekit-hq/lifekit-common/issues/134)) ([0f787cd](https://github.com/lifekit-hq/lifekit-common/commit/0f787cd88a5491bb6ae3c09bbe54f03ef73cf82a))
* **ui:** add click outputs to the area, bar and donut charts ([#129](https://github.com/lifekit-hq/lifekit-common/issues/129)) ([38acdf7](https://github.com/lifekit-hq/lifekit-common/commit/38acdf75b83a8be67c2b1ec9edbb0c9245b0c848))
* **ui:** make cmn-async-state the one state pattern ([#138](https://github.com/lifekit-hq/lifekit-common/issues/138)) ([5b0f1a7](https://github.com/lifekit-hq/lifekit-common/commit/5b0f1a7fc380631723559da1a5e4ebabc60248cc))
* **ui:** move top-bar actions past two into a More actions menu below 360px ([#139](https://github.com/lifekit-hq/lifekit-common/issues/139)) ([26b5f00](https://github.com/lifekit-hq/lifekit-common/commit/26b5f00a8bbff8f554d62c5304fdbf4988dea44e))
* **ui:** render safe clickable links in cmn-chat-message ([#132](https://github.com/lifekit-hq/lifekit-common/issues/132)) ([9891e32](https://github.com/lifekit-hq/lifekit-common/commit/9891e32922183c00b9c599f80994e85186ff2f9b))


### Bug Fixes

* **ui:** keep phone notices below the top bar and hide the FAB under sheets ([#135](https://github.com/lifekit-hq/lifekit-common/issues/135)) ([cb8db9c](https://github.com/lifekit-hq/lifekit-common/commit/cb8db9c7347c144e3f233ec8c7fff9a592211d51))
* **ui:** pick the app shell by device, not width only ([#137](https://github.com/lifekit-hq/lifekit-common/issues/137)) ([612fa25](https://github.com/lifekit-hq/lifekit-common/commit/612fa25ad2f7943aee4ad6d064c1b7d6eca3a67b))


### Documentation

* **design:** pin the reference registry and add per-pattern compare-against sections ([#136](https://github.com/lifekit-hq/lifekit-common/issues/136)) ([fc230cf](https://github.com/lifekit-hq/lifekit-common/commit/fc230cfd21ba3fca4fb470b11cfe40933fcd13b6))


### Maintenance

* remove unused surface ([#141](https://github.com/lifekit-hq/lifekit-common/issues/141)) ([db8d6d9](https://github.com/lifekit-hq/lifekit-common/commit/db8d6d98fc985813718dfa2e8c5bc1a364f24152))

## [2.3.0](https://github.com/lifekit-hq/lifekit-common/compare/v2.2.0...v2.3.0) (2026-10-07)


### Features

* add lk-segmented period control and scrub-to-read for line and area charts ([#130](https://github.com/lifekit-hq/lifekit-common/issues/130)) ([5900ec7](https://github.com/lifekit-hq/lifekit-common/commit/5900ec78ca5185e70a3ea80812da551121737ce9))

## [2.2.0](https://github.com/lifekit-hq/lifekit-common/compare/v2.1.0...v2.2.0) (2026-10-07)


### Features

* **ui:** add a fixed y domain and time-proportional x spacing to the line chart ([#127](https://github.com/lifekit-hq/lifekit-common/issues/127)) ([e68d498](https://github.com/lifekit-hq/lifekit-common/commit/e68d498fb90b951d5f361b18ce4e67cc149ee9de))

## [2.1.0](https://github.com/lifekit-hq/lifekit-common/compare/v2.0.0...v2.1.0) (2026-10-07)


### Features

* **ui:** add a compact sparkline variant to the line chart ([#126](https://github.com/lifekit-hq/lifekit-common/issues/126)) ([20fb065](https://github.com/lifekit-hq/lifekit-common/commit/20fb06550ca7d34a9ca75f1d524b368b53700d70))


### Bug Fixes

* **ui:** keep the top-bar title readable at 320px ([#120](https://github.com/lifekit-hq/lifekit-common/issues/120)) ([17df61b](https://github.com/lifekit-hq/lifekit-common/commit/17df61bcec7bba630b1784f16ea9959002514727))


### Performance

* **ui:** drop afterRenderEffect from the app layout ([#122](https://github.com/lifekit-hq/lifekit-common/issues/122)) ([0f8f3a4](https://github.com/lifekit-hq/lifekit-common/commit/0f8f3a4e065e7804d87e37169b8d65e26a599030))


### Documentation

* **agents:** merge CLAUDE.md into AGENTS.md as the single instruction file ([#124](https://github.com/lifekit-hq/lifekit-common/issues/124)) ([28de650](https://github.com/lifekit-hq/lifekit-common/commit/28de650e6f5e17064c0724a401c3f20ece7a0856))

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
