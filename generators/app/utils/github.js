const requestPromise = require('request-promise');


// Authenticate with GitHub using username and password
exports.getGithubAuth = (props) => {
  const data = {
    scopes: ['repo', 'user'],
    note: `getting-started-at-${Date.now()}`,
  };
  const options = {
    url: 'https://api.github.com/authorizations',
    headers: {
      'User-Agent': props.githubUser,
    },
    method: 'POST',
    body: JSON.stringify(data),
    resolveWithFullResponse: true,
    auth: {
      user: props.githubUser,
      pass: props.githubPassword,
    },
  };

  return requestPromise.post(options);
};

// Authenticate with GitHub using username, password, and two factor one-time password
exports.getGithubAuthOtp = (props, githubProp) => {
  const data = {
    scopes: ['repo', 'user'],
    note: `getting-started-at-${Date.now()}`,
  };
  const options = {
    url: 'https://api.github.com/authorizations',
    headers: {
      'User-Agent': props.githubUser,
      'X-GitHub-OTP': githubProp.githubAuthCode,
    },
    method: 'POST',
    body: JSON.stringify(data),
    resolveWithFullResponse: true,
    auth: {
      user: props.githubUser,
      pass: props.githubPassword,
    },
  };
  options.headers['X-GitHub-OTP'] = githubProp.githubAuthCode;

  return requestPromise.post(options);
};

// Create a repo in GitHub
exports.createGitHubRepo = (props) => {
  const headers = {
    Authorization: `token ${props.token}`,
    'User-Agent': props.githubUser,
  };

  const data = {
    name: props.githubRepoName,
    auto_init: false,
    private: props.privateGithubRepo,
  };

  const urlOption = props.githubOrgName ? `orgs/${props.githubOrgName}` : 'user';

  const options = {
    url: `https://api.github.com/${urlOption}/repos`,
    headers,
    method: 'POST',
    body: JSON.stringify(data),
  };

  return requestPromise.post(options);
};
