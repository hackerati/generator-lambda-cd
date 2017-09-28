const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const requestPromise = require('request-promise');
const sinon = require('sinon');

const { getGithubAuth, getGithubRepo, createGithubRepo } = require('../generators/app/utils/github');
const { getTravisToken, encryptTravisEnvVars, loopWhileSyncing } = require('../generators/app/utils/travis');

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
  afterEach(() => {
    sandbox.restore();
  });

  it('calls a post request correctly for auth', () => {
    const postStub = sandbox.stub(requestPromise, 'post').returns(Promise.resolve());
    const props = {
      githubUser: 'test-user',
      githubPassword: 'test-password',
    };

    expect.assertions(1);
    return getGithubAuth(props).then((result) => {
      sandbox.assert.calledOnce(postStub);
      sandbox.assert.calledWith(postStub, sinon.match({
        auth: {
          pass: 'test-password',
          user: 'test-user',
        },
        body: sinon.match.string,
        headers: {
          'User-Agent': 'test-user',
        },
        method: 'POST',
        resolveWithFullResponse: true,
        url: 'https://api.github.com/authorizations',
      }));
      expect(result).toBeUndefined();
    });
  });

  it('calls a post request correctly for auth with OTP', () => {
    const postStub = sandbox.stub(requestPromise, 'post').returns(Promise.resolve());
    const props = {
      githubUser: 'test-user',
      githubPassword: 'test-password',
      githubAuthCode: 1234,
    };

    expect.assertions(1);
    return getGithubAuth(props).then((result) => {
      sandbox.assert.calledOnce(postStub);
      sandbox.assert.calledWith(postStub, sinon.match({
        auth: {
          pass: 'test-password',
          user: 'test-user',
        },
        body: sinon.match.string,
        headers: {
          'User-Agent': 'test-user',
          'X-GitHub-OTP': 1234,
        },
        method: 'POST',
        resolveWithFullResponse: true,
        url: 'https://api.github.com/authorizations',
      }));
      expect(result).toBeUndefined();
    });
  });

  it('calls a get request correctly for a github repo', () => {
    const getStub = sandbox.stub(requestPromise, 'get').returns(Promise.resolve());
    const props = {
      githubUser: 'test-user',
      githubToken: 'test-token',
      githubOrgName: 'test-org',
      githubRepoName: 'test-repo',
    };

    expect.assertions(1);
    return getGithubRepo(props).then((result) => {
      sandbox.assert.calledOnce(getStub);
      sandbox.assert.calledWith(getStub, sinon.match({
        headers: {
          Authorization: 'token test-token',
          'User-Agent': 'test-user',
        },
        method: 'GET',
        url: 'https://api.github.com/repos/test-org/test-repo',
      }));
      expect(result).toBeUndefined();
    });
  });

  it('calls a post request correctly for creating a github repo under the user', () => {
    const postStub = sandbox.stub(requestPromise, 'post').returns(Promise.resolve());
    const props = {
      githubUser: 'test-user',
      githubToken: 'test-token',
      githubOrgName: 'test-user',
      githubRepoName: 'test-repo',
    };

    expect.assertions(1);
    return createGithubRepo(props).then((result) => {
      sandbox.assert.calledOnce(postStub);
      sandbox.assert.calledWith(postStub, sinon.match({
        body: sinon.match.string,
        headers: {
          Authorization: 'token test-token',
          'User-Agent': 'test-user',
        },
        method: 'POST',
        url: 'https://api.github.com/user/repos',
      }));
      expect(result).toBeUndefined();
    });
  });

  it('calls a post request correctly for creating a github repo under an org', () => {
    const postStub = sandbox.stub(requestPromise, 'post').returns(Promise.resolve());
    const props = {
      githubUser: 'test-user',
      githubToken: 'test-token',
      githubOrgName: 'test-org',
      githubRepoName: 'test-repo',
    };

    expect.assertions(1);
    return createGithubRepo(props).then((result) => {
      sandbox.assert.calledOnce(postStub);
      sandbox.assert.calledWith(postStub, sinon.match({
        body: sinon.match.string,
        headers: {
          Authorization: 'token test-token',
          'User-Agent': 'test-user',
        },
        method: 'POST',
        url: 'https://api.github.com/orgs/test-org/repos',
      }));
      expect(result).toBeUndefined();
    });
  });
});

describe('Travis util', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('calls a post request correctly for authing with github token', () => {
    const postStub = sandbox.stub(requestPromise, 'post').returns(Promise.resolve());
    const props = {
      githubToken: 'test-token',
    };

    expect.assertions(1);
    return getTravisToken(props).then((result) => {
      sandbox.assert.calledOnce(postStub);
      sandbox.assert.calledWith(postStub, sinon.match({
        body: sinon.match.string,
        headers: {
          Accept: 'application/vnd.travis-ci.2+json',
          'Content-Type': 'application/json',
          'User-Agent': 'TravisMyClient/1.0.0',
        },
        method: 'POST',
        url: 'https://api.travis-ci.org/auth/github',
      }));
      expect(result).toBeUndefined();
    });
  });

  it('encrypts environment variables', () => {
    const getPromise = Promise.resolve(JSON.stringify({
      key: '-----BEGIN PUBLIC KEY-----\n' +
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArgov0KHVYlOtS15/WIO0\n' +
        'Hpz9NIuWQiH/9VuCqjEnsMJdZR20NsxiNCjMTjOXtl8jCGFAp8fyb5peT7Qlp4xZ\n' +
        'ky6odeyFEc6Z9QInyRSVBozlRoYShefQ6JSPFaF9k+FYFN/xz0LYHZwZCW+r78dQ\n' +
        'V9ZGKBQT61El8NiriiqKq1SBZiEI7jT18J0i6H1qFVAkkZcyz3v85/yudPUC1wBF\n' +
        'wzfk9yJ9O8bpNlGonxlDoQKXxHS8yV15dTqAAoeVysBqQk1/NiDQuEJMbrq3cfDl\n' +
        'l0scsnVec0dwIUNY9UasxrbPpwk00ce54uWjwYl/sQ+AOvKZhJXbJFEfKyFi8f2E\n' +
        'dQIDAQAB\n' +
        '-----END PUBLIC KEY-----\n',
    }));
    const getStub = sandbox.stub(requestPromise, 'get').returns(getPromise);
    const props = {
      id: 'test-id',
      secret: 'test-secret',
      githubOrgName: 'test-org',
      githubRepoName: 'test-repo',
      travisToken: 'test-token',
    };

    expect.assertions(2);
    return encryptTravisEnvVars(props).then((result) => {
      sandbox.assert.calledOnce(getStub);
      sandbox.assert.calledWith(getStub, sinon.match({
        headers: {
          Accept: 'application/vnd.travis-ci.2+json',
          Authorization: 'token test-token',
          'User-Agent': 'TravisMyClient/1.0.0',
        },
        method: 'GET',
        url: 'https://api.travis-ci.org/repos/test-org/test-repo/key',
      }));
      expect(result).toHaveProperty('secureId');
      expect(result).toHaveProperty('secureSecret');
    });
  });

  it('makes correct requests when enabling the github repo (non-recursive)', () => {
    const getPromise = Promise.resolve(JSON.stringify({
      // For whoAmIResponse
      user: {
        is_syncing: false,
      },
      // For hooksResponse
      hooks: [
        {
          id: 1234,
          name: 'test-repo',
        },
      ],
    }));
    const getStub = sandbox.stub(requestPromise, 'get').returns(getPromise);
    const putStub = sandbox.stub(requestPromise, 'put').returns(Promise.resolve());
    const props = {
      githubRepoName: 'test-repo',
      travisToken: 'test-token',
    };

    expect.assertions(2);
    return loopWhileSyncing(props).then((result) => {
      sandbox.assert.calledTwice(getStub);
      expect(getStub.args).toEqual([
        [{
          headers: {
            'User-Agent': 'TravisMyClient/1.0.0',
            Authorization: 'token test-token',
            Accept: 'application/vnd.travis-ci.2+json',
          },
          method: 'GET',
          url: 'https://api.travis-ci.org/users',
        }],
        [{
          headers: {
            'User-Agent': 'TravisMyClient/1.0.0',
            Authorization: 'token test-token',
            Accept: 'application/vnd.travis-ci.2+json',
          },
          method: 'GET',
          url: 'https://api.travis-ci.org/hooks',
        }],
      ]);
      sandbox.assert.calledOnce(putStub);
      sandbox.assert.calledWith(putStub, sinon.match({
        body: sinon.match.string,
        headers: {
          Accept: 'application/vnd.travis-ci.2+json',
          Authorization: 'token test-token',
          'Content-Type': 'application/json',
          'User-Agent': 'TravisMyClient/1.0.0',
        },
        method: 'PUT',
        url: 'https://api.travis-ci.org/hooks',
      }));
      sandbox.assert.callOrder(getStub, getStub, putStub);
      expect(result).toBeUndefined();
    });
  });
});
