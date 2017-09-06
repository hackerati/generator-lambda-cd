const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');

describe('generator-lambda-cd:app', () => {
  beforeAll(() => helpers.run(path.join(__dirname, '../generators/app')));

  it('creates files', () => {
    assert.file([
      'event/sample.js',
      'test/test.js',
      '.eslintignore',
      '.eslintrc',
      '.gitignore',
      '.travis.yml',
      'lambda.js',
      'main.tf',
      'Makefile',
      'package.json',
      'README.md',
      'yarn.lock',
    ]);
  });
});
