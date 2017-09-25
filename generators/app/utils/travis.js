const requestPromise = require('request-promise');
const rsa = require('ursa');


// Get user's Travis information
const whoAmI = (props) => {
  const headers = {
    'User-Agent': 'TravisMyClient/1.0.0',
    Authorization: `token ${props.travisToken}`,
    Accept: 'application/vnd.travis-ci.2+json',
  };

  const options = {
    url: 'https://api.travis-ci.org/users',
    method: 'GET',
    headers,
  };

  return requestPromise.get(options);
};

// Get Travis hooks for user
const getUserHooks = (props) => {
  const headers = {
    'User-Agent': 'TravisMyClient/1.0.0',
    Authorization: `token ${props.travisToken}`,
    Accept: 'application/vnd.travis-ci.2+json',
    'Content-Type': 'application/json',
  };

  const options = {
    url: 'https://api.travis-ci.org/hooks',
    method: 'GET',
    headers,
  };

  return requestPromise.get(options);
};

// Enable a GitHub repo in Travis
const enableGithubRepo = (props) => {
  const headers = {
    'User-Agent': 'TravisMyClient/1.0.0',
    Authorization: `token ${props.travisToken}`,
    Accept: 'application/vnd.travis-ci.2+json',
    'Content-Type': 'application/json',
  };

  const data = {
    hook: {
      active: true,
    },
  };

  const options = {
    url: 'https://api.travis-ci.org/hooks',
    method: 'PUT',
    headers,
  };

  return getUserHooks(props)
    .then((hooksResponse) => {
      const hooks = JSON.parse(hooksResponse).hooks;
      data.hook.id = hooks.find(hook => hook.name === props.githubRepoName).id;
      options.body = JSON.stringify(data);
      return requestPromise.put(options);
    })
    .catch(() => {
      throw new Error('Getting repository hooks failed.');
    });
};


// Get access token for Travis via GitHub
exports.getTravisToken = (props) => {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'TravisMyClient/1.0.0',
    Accept: 'application/vnd.travis-ci.2+json',
  };
  const data = {
    github_token: props.githubToken,
  };
  const options = {
    url: 'https://api.travis-ci.org/auth/github',
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  };

  return requestPromise.post(options);
};

// Encrypt environment variables and add them to .travis.yml
exports.encryptTravisEnvVars = (props) => {
  const headers = {
    'User-Agent': 'TravisMyClient/1.0.0',
    Authorization: `token ${props.travisToken}`,
    Accept: 'application/vnd.travis-ci.2+json',
  };

  const orgOption = props.githubOrgName ? props.githubOrgName : props.githubUser;
  const options = {
    url: `https://api.travis-ci.org/repos/${orgOption}/${props.githubRepoName}/key`,
    method: 'GET',
    headers,
  };

  return requestPromise.get(options)
    .then((resp) => {
      const idEnvVar = `AWS_ACCESS_KEY_ID=${props.id}`;
      const secretEnvVar = `AWS_SECRET_ACCESS_KEY=${props.secret}`;
      const publicKey = rsa.createPublicKey(JSON.parse(resp).key);
      const secureEnvVars = {};
      secureEnvVars.secureId = publicKey
        .encrypt(idEnvVar, undefined, undefined, rsa.RSA_PKCS1_PADDING)
        .toString('base64');
      secureEnvVars.secureSecret = publicKey
        .encrypt(secretEnvVar, undefined, undefined, rsa.RSA_PKCS1_PADDING)
        .toString('base64');
      return secureEnvVars;
    })
    .catch(() => {
      throw new Error('Could not get travis public key.');
    });
};

// Wait for Travis to finish syncing, and then enable GitHub repo in Travis
exports.loopWhileSyncing = props => whoAmI(props)
  .then((whoAmIResponse) => {
    const isSyncing = JSON.parse(whoAmIResponse).user.is_syncing;
    if (isSyncing) {
      return this.loopWhileSyncing(props);
    }
    return enableGithubRepo(props);
  })
  .catch(() => {
    throw new Error('Syncing Travis account failed.');
  });
