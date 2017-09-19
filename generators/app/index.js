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

    const localRepoPrompts = [];

    const deployPrompts = [
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
        store: true,
      },
      {
        type: 'confirm',
        name: 'privateGithubRepo',
        message: 'Should your repository be private?',
        default: false,
        store: true,
      },
      {
        type: 'confirm',
        name: 'githubTravisEnabled',
        message: 'Have you enabled Travis CI access to GitHub? (If not, you won\'t be able to deploy the repository)',
        default: false,
        store: true,
      },
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
        store: true,
      },
    ];

    return this.prompt(this.options.deploy ?
      localRepoPrompts.concat(deployPrompts) : localRepoPrompts)
      .then((props) => {
        this.props = props;

        return !this.options.deploy ? true : getGithubAuth(props)
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
