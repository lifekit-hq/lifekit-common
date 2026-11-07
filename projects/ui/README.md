# Ui

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

## Peer dependencies

Consumers must install these alongside `@lifekit-hq/ui`: `@angular/cdk`, `chart.js`, `deep-chat`, `lucide-angular`, `rxjs`.

## Icons

`<cmn-icon>` renders a generated subset of Lucide (`src/lib/components/icon/lucide-icon-set.ts`), not the whole map, so a consumer bundle carries only those icons. The subset is every icon the library uses plus the ones the apps use (`scripts/icon-set/consumers.json`); run `npm run generate:icons` after adding one, and CI's `check:icons` fails when the file is stale. An app that needs an icon outside the subset registers it with `provideLucideIcons({Anvil})`; the name then works in every `<cmn-icon>`. A name outside both renders an empty box, and dev mode logs a one-time console warning naming it.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the library, run:

```bash
ng build ui
```

This command will compile your project, and the build artifacts will be placed in the `dist/` directory.

### Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:

   ```bash
   cd dist/ui
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
