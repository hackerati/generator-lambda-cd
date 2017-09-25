const requestPromise = require('request-promise');


// Authenticate using username, password, and optionally two factor one-time password
exports.getGithubAuth = (props) => {
  const data = {
    scopes: ['repo', 'user'],
    note: `generator-lambda-cd-${Date.now()}`,
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

  if (props.githubAuthCode) {
    options.headers['X-GitHub-OTP'] = props.githubAuthCode;
  }

  return requestPromise.post(options);
};

// Get a repo
exports.getGithubRepo = (props) => {
  const headers = {
    Authorization: `token ${props.githubToken}`,
    'User-Agent': props.githubUser,
  };

  const options = {
    url: `https://api.github.com/repos/${props.githubOrgName}/${props.githubRepoName}`,
    headers,
    method: 'GET',
  };

  return requestPromise.get(options);
};

// Create a repo
exports.createGithubRepo = (props) => {
  const headers = {
    Authorization: `token ${props.githubToken}`,
    'User-Agent': props.githubUser,
  };

  const data = {
    name: props.githubRepoName,
    auto_init: false,
    private: props.privateGithubRepo,
  };

  const urlOption = props.githubUser !== props.githubOrgName ? `orgs/${props.githubOrgName}` : 'user';

  const options = {
    url: `https://api.github.com/${urlOption}/repos`,
    headers,
    method: 'POST',
    body: JSON.stringify(data),
  };

  return requestPromise.post(options);
};
