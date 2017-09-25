const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const { getGithubAuth, getGithubRepo, createGithubRepo } = require('./utils/github');
const { getTravisToken, encryptTravisEnvVars, loopWhileSyncing } = require('./utils/travis');


module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('skip-deploy');

    this.templateProps = {
      secureId: '',
      secureSecret: '',
    };
    this.deployProps = {};

    this.initRepo = () => {
      this.spawnCommandSync('git', ['init', '.']);
      this.spawnCommandSync('git', ['remote', 'add', 'origin', `git@github.com:${this.deployProps.githubOrgName}/${this.deployProps.githubRepoName}.git`]);
      this.spawnCommandSync('git', ['pull', 'origin', 'master']);
    };

    this.getOrCreateRepo = (response) => {
      this.deployProps.githubToken = JSON.parse(response.body).token;
      const repoPrompts = [
        {
          type: 'input',
          name: 'githubOrgName',
          message: 'What is the name of your GitHub organization?',
          default: this.deployProps.githubUser,
          store: true,
        },
        {
          type: 'input',
          name: 'githubRepoName',
          message: 'What should the name of the GitHub repository be?',
          default: process.cwd().split('/').pop(),
          store: true,
        },
      ];

      return this.prompt(repoPrompts)
        .then((repoProps) => {
          Object.assign(this.deployProps, repoProps);
          return getGithubRepo(this.deployProps)
            .then(() => {
              // Initialize local repo
              this.initRepo();
              return this.doTravis();
            })
            .catch(() => {
              // Create remote remote repo
              const privatePrompt = [
                {
                  type: 'confirm',
                  name: 'privateGithubRepo',
                  message: 'Should your repository be private?',
                  default: false,
                  store: true,
                },
              ];

              return this.prompt(privatePrompt)
                .then((privateProp) => {
                  Object.assign(this.deployProps, privateProp);
                  return createGithubRepo(this.deployProps)
                    .then(() => {
                      // Travis cannot hook empty repos, so initialize and push it
                      this.initRepo();
                      this.spawnCommandSync('git', ['commit', '--allow-empty', '-am', '"Initialize project"']);
                      this.spawnCommandSync('git', ['push', 'origin', 'master']);
                      return this.doTravis();
                    })
                    .catch(() => {
                      throw new Error('GitHub repository creation failed.');
                    });
                });
            });
        });
    };
      // Hook travis
    this.doTravis = () => getTravisToken(this.deployProps)
      .then((travisTokenResponse) => {
        this.deployProps.travisToken = JSON.parse(travisTokenResponse).access_token;

        // Wait for Travis to finish syncing
        return loopWhileSyncing(this.deployProps)
          // Add environment variables to .travis.yml
          .then(() => {
            const environmentPrompts = [
              {
                type: 'input',
                name: 'id',
                message: 'Provide your AWS Access Key ID:',
                store: true,
              },
              {
                type: 'password',
                name: 'secret',
                message: 'Provide your AWS Secret Access Key:',
              },
            ];

            return this.prompt(environmentPrompts)
              .then((environmentProps) => {
                Object.assign(this.deployProps, environmentProps);
                return encryptTravisEnvVars(this.deployProps)
                  .then((secureEnvVars) => {
                    Object.assign(this.templateProps, secureEnvVars);
                    return true;
                  })
                  .catch(() => {
                    throw new Error('Encrypting environment variables for Travis failed.');
                  });
              });
          })
          .catch(() => {
            throw new Error('Enabling Travis with repository failed.');
          });
      })
      .catch(() => {
        throw new Error('Getting Travis access token failed. Please make sure you have granted travis-ci.org access to your Github account.');
      });
  }

  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(`Welcome to the flawless ${chalk.red('generator-lambda-cd')} generator!`));

    const templatePrompts = [];

    const loginPrompts = [
      {
        type: 'input',
        name: 'githubUser',
        message: 'Provide your GitHub username:',
        store: true,
      },
      {
        type: 'password',
        name: 'githubPassword',
        message: 'Provide your GitHub password:',
      },
    ];

    // Prompt for template props
    return this.prompt(templatePrompts)
      .then((templateProps) => {
        Object.assign(this.templateProps, templateProps);
        Object.assign(this.deployProps, templateProps);

        if (this.options.skipDeploy) {
          return true;
        }

        // Prompt for login props
        return this.prompt(loginPrompts)
          .then((loginProps) => {
            Object.assign(this.deployProps, loginProps);
            return getGithubAuth(this.deployProps)
              .then(response => this.getOrCreateRepo(response))
              .catch((error) => {
                // There is a two-factor authentication enabled; Ask for the authentication code
                if (error.statusCode === 401) {
                  const authCodePrompt = [
                    {
                      type: 'input',
                      name: 'githubAuthCode',
                      message: 'Provide your GitHub authentication code:',
                    },
                  ];

                  return this.prompt(authCodePrompt)
                    .then((authCodeProp) => {
                      Object.assign(this.deployProps, authCodeProp);
                      return getGithubAuth(this.deployProps)
                        .then(authenticationCodeResponse =>
                          this.getOrCreateRepo(authenticationCodeResponse))
                        .catch(() => {
                          throw new Error('GitHub login failed.');
                        });
                    });
                }
                throw new Error('GitHub login failed.');
              });
          });
      });
  }

  writing() {
    this.fs.copyTpl(
      this.templatePath('{,.,**/}*'),
      this.destinationPath('.'),
      this.templateProps,
    );
  }

  install() {
    this.installDependencies({ bower: false });
  }

  end() {
    if (!this.options.skipDeploy) {
      this.spawnCommandSync('git', ['add', '.']);
      this.spawnCommandSync('git', ['commit', '-m', '"Generate project via yeoman"']);
      this.spawnCommandSync('git', ['push', 'origin', 'master']);
    }
  }
};
