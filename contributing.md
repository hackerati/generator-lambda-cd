# Developing and Contributing to generator-lambda-cd

## Development

We currently recommend `yarn` over `npm` because of linter-breaking issues in npm v5.

```
git clone git@github.com:hackerati/generator-lambda-cd.git
yarn install
yarn test
```

To use the generator locally (starting from the project directory):

```
yarn link
cd ../
mkdir generator-output/
cd generator-output/
../generator-lambda-cd/node_modules/yo/lib/cli.js lambda-cd
```

We assume you do not have `yo` installed globally.
Otherwise, you could replace the last line with `yo lambda-cd`

## Contributing

To contribute:
  - make sure an issue exists for your change
  - fork the repository
  - clone your fork
  - make sure your branch is up-to-date with the master branch of the original repo
  - make your changes to the code, docs, tests, etc.
  - make sure linting and tests are still working after changes
  - push your changes to your fork
  - open a pull request against the master branch of the original repo with a [reference to the issue for your change](https://github.com/blog/1506-closing-issues-via-pull-requests)
