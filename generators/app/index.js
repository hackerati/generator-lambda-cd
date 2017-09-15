const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const requestPromise = require('request-promise');
const rsa = require('ursa');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('deploy');

    this.createGitHubRepo = () => {
      const headers = {
        Authorization: `token ${this.props.token}`,
        'User-Agent': this.props.githubUser,
      };

      const data = {
        name: this.props.githubRepoName,
        auto_init: false,
        private: this.props.privateGithubRepo,
      };

      const urlOption = this.props.githubOrgName ? `orgs/${this.props.githubOrgName}` : 'user';

      const options = {
        url: `https://api.github.com/${urlOption}/repos`,
        headers,
        method: 'POST',
        body: JSON.stringify(data),
      };

      return requestPromise.post(options);
    };

    this.getTravisAccessToken = () => {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'TravisMyClient/1.0.0',
        Accept: 'application/vnd.travis-ci.2+json',
      };
      const data = {
        github_token: this.props.token,
      };
      const options = {
        url: 'https://api.travis-ci.org/auth/github',
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      };

      return requestPromise.post(options);
    };

    this.encryptTravisEnvVars = () => {
      const headers = {
        'User-Agent': 'TravisMyClient/1.0.0',
        Authorization: `token ${this.props.travisAccessToken}`,
        Accept: 'application/vnd.travis-ci.2+json',
      };

      const orgOption = this.props.githubOrgName ? this.props.githubOrgName : this.props.githubUser;
      const options = {
        url: `https://api.travis-ci.org/repos/${orgOption}/${this.props.githubRepoName}/key`,
        method: 'GET',
        headers,
      };

      return requestPromise.get(options)
        .then((resp) => {
          const idEnvVar = `AWS_ACCESS_KEY_ID=${this.props.id}`;
          const secretEnvVar = `AWS_SECRET_ACCESS_KEY=${this.props.secret}`;
          const publicKey = rsa.createPublicKey(JSON.parse(resp).key);
          const secureId = publicKey
            .encrypt(idEnvVar, undefined, undefined, rsa.RSA_PKCS1_PADDING)
            .toString('base64');
          const secureSecret = publicKey
            .encrypt(secretEnvVar, undefined, undefined, rsa.RSA_PKCS1_PADDING)
            .toString('base64');
          fs.appendFileSync('.travis.yml',
            `env:\n  global:\n    - secure: ${secureId}\n    - secure: ${secureSecret}`);
          return true;
        })
        .catch(() => {
          throw new Error('Could not get travis public key.');
        });
    };

    this.loopWhileSyncing = () => this.whoAmI(this.props.travisAccessToken)
      .then((whoAmIResponse) => {
        this.props.isSyncing = JSON.parse(whoAmIResponse).user.is_syncing;
        if (this.props.isSyncing) {
          return this.loopWhileSyncing(this.props.travisAccessToken);
        }
        return this.enableGitHubRepo(this.props.travisAccessToken);
      })
      .catch(() => {
        throw new Error('Syncing Travis account failed.');
      });

    this.whoAmI = () => {
      const headers = {
        'User-Agent': 'TravisMyClient/1.0.0',
        Authorization: `token ${this.props.travisAccessToken}`,
        Accept: 'application/vnd.travis-ci.2+json',
      };

      const options = {
        url: 'https://api.travis-ci.org/users',
        method: 'GET',
        headers,
      };

      return requestPromise.get(options);
    };

    this.enableGitHubRepo = () => {
      const headers = {
        'User-Agent': 'TravisMyClient/1.0.0',
        Authorization: `token ${this.props.travisAccessToken}`,
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

      return this.getUserHooks()
        .then((hooksResponse) => {
          const hooks = JSON.parse(hooksResponse).hooks;
          data.hook.id = hooks.find(this.getRepositoryHook).id;
          options.body = JSON.stringify(data);
          return requestPromise.put(options);
        })
        .catch(() => {
          throw new Error('Getting repository hooks failed.');
        });
    };

    this.getUserHooks = () => {
      const headers = {
        'User-Agent': 'TravisMyClient/1.0.0',
        Authorization: `token ${this.props.travisAccessToken}`,
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

    this.getRepositoryHook = element => element.name === this.props.githubRepoName;
  }

  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(`Welcome to the flawless ${chalk.red('generator-lambda-cd')} generator!`));

    const prompts = [
      {
        type: 'input',
        name: 'sampleText',
        message: 'What should the sample text be?',
        default: 'Hello Lambda',
      },
      {
        type: 'input',
        name: 'id',
        message: 'Provide your AWS Access Key ID:',
        default: 'Hello',
      },
      {
        type: 'password',
        name: 'secret',
        message: 'Provide your AWS Secret Access Key:',
        default: 'Hello',
      },
      {
        type: 'input',
        name: 'githubOrgName',
        message: 'What is the name of your GitHub organization (Leave it blank for your GitHub user)?',
        default: '',
      },
      {
        type: 'input',
        name: 'githubRepoName',
        message: 'What should the name of the GitHub repository be?',
        default: 'my-lambda-cd',
      },
      {
        type: 'confirm',
        name: 'privateGithubRepo',
        message: 'Should your repository be private?',
        default: false,
      },
      {
        type: 'input',
        name: 'githubUser',
        message: 'Provide your GitHub username:',
      },
      {
        type: 'password',
        name: 'githubPassword',
        message: 'Provide your GitHub password:',
      },
      {
        type: 'confirm',
        name: 'githubTravisEnabled',
        message: 'Have you enabled Travis CI access to GitHub? (If not, you won\'t be able to deploy the repository)',
        default: false,
      },
    ];

    return this.prompt(prompts)
      .then((props) => {
        this.props = props;

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

        return requestPromise.post(options)
          .then((response) => {
            this.props.token = JSON.parse(response.body).token;
            return true;
          })
          .catch((error) => {
            // There is a two-factor authentication enabled; Ask for the authentication code
            if (error.statusCode === 401) {
              const authenticationCodePrompt = [
                {
                  type: 'input',
                  name: 'githubAuthCode',
                  message: 'Provide your GitHub authentication code:',
                  default: 'Hello',
                },
              ];

              return this.prompt(authenticationCodePrompt)
                .then((githubProp) => {
                  options.headers['X-GitHub-OTP'] = githubProp.githubAuthCode;

                  return requestPromise.post(options)
                    .then((authenticationCodeResponse) => {
                      this.props.token = JSON.parse(authenticationCodeResponse.body).token;
                      return true;
                    })
                    .catch(() => {
                      throw new Error('GitHub login failed.');
                    });
                });
            }
            throw new Error('GitHub login failed.');
          });
      });
  }

  writing() {
    this.fs.copyTpl(
      this.templatePath('{,.,**/}*'),
      this.destinationPath('.'),
      this.props,
    );
  }

  install() {
    this.installDependencies({ bower: false });
  }

  end() {
    if (this.options.deploy) {
      // Initialize local repo
      this.spawnCommandSync('git', ['init']);
      this.spawnCommandSync('git', ['add', '.']);
      this.spawnCommandSync('git', ['commit', '-m', '"Initial commit"']);
      // Create remote remote repo and push
      this.createGitHubRepo()
        .then(() => {
          const orgOption = this.props.githubOrgName ?
            this.props.githubOrgName : this.props.githubUser;
          this.spawnCommandSync('git', ['remote', 'add', 'origin', `git@github.com:${orgOption}/${this.props.githubRepoName}.git`]);
          this.spawnCommandSync('git', ['push', 'origin', 'master']);

          // Hook travis
          if (this.props.githubTravisEnabled === false) process.exit();
          this.getTravisAccessToken()
            .then((travisAccessTokenResponse) => {
              this.props.travisAccessToken = JSON.parse(travisAccessTokenResponse).access_token;

              this.loopWhileSyncing()
                .then(() => {
                  // Add AWS credentials to .travis.yml
                  this.encryptTravisEnvVars().then(() => {
                    // Trigger travis by pushing updated .travis.yml
                    this.spawnCommandSync('git', ['commit', '-am', '"update .travis.yml"']);
                    this.spawnCommandSync('git', ['push', 'origin', 'master']);
                  });
                })
                .catch(() => {
                  throw new Error('Enabling Travis with repository failed.');
                });
            })
            .catch(() => {
              throw new Error('Getting Travis access token failed.');
            });
        })
        .catch(() => {
          throw new Error('GitHub repository creation failed.');
        });
    }
  }
};
