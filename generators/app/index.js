const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const { getGithubAuth, getGithubAuthOtp, createGitHubRepo } = require('./utils/github');
const { getTravisAccessToken, encryptTravisEnvVars, loopWhileSyncing } = require('./utils/travis');


module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('deploy');
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
      },
      {
        type: 'password',
        name: 'secret',
        message: 'Provide your AWS Secret Access Key:',
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
        type: 'confirm',
        name: 'githubTravisEnabled',
        message: 'Have you enabled Travis CI access to GitHub? (If not, you won\'t be able to deploy the repository)',
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
    ];

    return this.prompt(prompts)
      .then((props) => {
        this.props = props;

        return getGithubAuth(props)
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
                },
              ];

              return this.prompt(authenticationCodePrompt)
                .then(githubProp => getGithubAuthOtp(props, githubProp)
                    .then((authenticationCodeResponse) => {
                      this.props.token = JSON.parse(authenticationCodeResponse.body).token;
                      return true;
                    })
                    .catch(() => {
                      throw new Error('GitHub login failed.');
                    }),
                );
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
      this.spawnCommandSync('git', ['commit', '-m', '"Generate project"']);
      // Create remote remote repo and push
      createGitHubRepo(this.props)
        .then(() => {
          const orgOption = this.props.githubOrgName ?
            this.props.githubOrgName : this.props.githubUser;
          this.spawnCommandSync('git', ['remote', 'add', 'origin', `git@github.com:${orgOption}/${this.props.githubRepoName}.git`]);
          this.spawnCommandSync('git', ['push', 'origin', 'master']);

          // Hook travis
          if (this.props.githubTravisEnabled === false) process.exit();
          getTravisAccessToken(this.props)
            .then((travisAccessTokenResponse) => {
              this.props.travisAccessToken = JSON.parse(travisAccessTokenResponse).access_token;

              // Wait for Travis to finish syncing
              loopWhileSyncing(this.props)
                .then(() => {
                  // Add environment variables to .travis.yml
                  encryptTravisEnvVars(this.props)
                    .then(() => {
                      // Trigger travis by pushing updated .travis.yml
                      this.spawnCommandSync('git', ['commit', '-am', '"update .travis.yml environment variables"']);
                      this.spawnCommandSync('git', ['push', 'origin', 'master']);
                    })
                    .catch(() => {
                      throw new Error('Encrypting environment variables for Travis failed.');
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
