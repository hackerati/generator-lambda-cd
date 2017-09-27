const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const requestPromise = require('request-promise');
const sinon = require('sinon');

const { getGithubAuth } = require('../generators/app/utils/github');

const sandbox = sinon.sandbox.create();

describe('generator-lambda-cd:app', () => {
  beforeAll(() => {
    sandbox.stub(requestPromise, 'post').returns({
      then: () => ({
        catch: () => {},
      }),
    });
    return helpers.run(path.join(__dirname, '../generators/app')).withOptions({ 'skip-deploy': true });
  });

  afterAll(() => {
    sandbox.restore();
  });

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

describe('Github util', () => {
  const promise = {
    then: () => {},
  };

  beforeEach(() => {
    this.postStub = sandbox.stub(requestPromise, 'post').returns(promise);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('calls a post request correctly for auth', () => {
    const props = {
      githubUser: 'test',
      githubPassword: 'test',
    };

    expect.assertions(1);
    expect(getGithubAuth(props)).toBe(promise);
    sandbox.assert.calledOnce(this.postStub);
    sandbox.assert.calledWith(this.postStub, sinon.match({
      auth: {
        pass: 'test',
        user: 'test',
      },
      body: sinon.match.string,
      headers: {
        'User-Agent': 'test',
      },
      method: 'POST',
      resolveWithFullResponse: true,
      url: 'https://api.github.com/authorizations',
    }));
  });

  it('calls a post request correctly for auth with OTP', () => {
    const props = {
      githubUser: 'test',
      githubPassword: 'test',
      githubAuthCode: 1234,
    };

    expect.assertions(1);
    expect(getGithubAuth(props)).toBe(promise);
    sandbox.assert.calledOnce(this.postStub);
    sandbox.assert.calledWith(this.postStub, sinon.match({
      auth: {
        pass: 'test',
        user: 'test',
      },
      body: sinon.match.string,
      headers: {
        'User-Agent': 'test',
        'X-GitHub-OTP': 1234,
      },
      method: 'POST',
      resolveWithFullResponse: true,
      url: 'https://api.github.com/authorizations',
    }));
  });
});
