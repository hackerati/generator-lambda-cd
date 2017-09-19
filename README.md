# generator-lambda-cd [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> Continous Deployment for AWS Lambda with Travis CI

## Installation

First, install [Yeoman](http://yeoman.io) and generator-lambda-cd using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo
npm install -g generator-lambda-cd
```

Then generate your new project:

```bash
yo lambda-cd
```

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

## Getting To Know Yeoman

 * Yeoman has a heart of gold.
 * Yeoman is a person with feelings and opinions, but is very easy to work with.
 * Yeoman can be too opinionated at times but is easily convinced not to be.
 * Feel free to [learn more about Yeoman](http://yeoman.io/).

## License

MIT ©Hackerati


[npm-image]: https://badge.fury.io/js/generator-lambda-cd.svg
[npm-url]: https://npmjs.org/package/generator-lambda-cd
[travis-image]: https://travis-ci.org/hackerati/generator-lambda-cd.svg?branch=master
[travis-url]: https://travis-ci.org/hackerati/generator-lambda-cd
[daviddm-image]: https://david-dm.org/hackerati/generator-lambda-cd.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/hackerati/generator-lambda-cd
[coveralls-image]: https://coveralls.io/repos/hackerati/generator-lambda-cd/badge.svg
[coveralls-url]: https://coveralls.io/r/hackerati/generator-lambda-cd
