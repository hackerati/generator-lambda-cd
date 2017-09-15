const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const requestPromise = require('request-promise');

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
        default: 'username',
      },
      {
        type: 'password',
        name: 'githubPassword',
        message: 'Provide your GitHub password:',
        default: 'password',
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
          const { status: loggedIn } = this.spawnCommandSync('travis', ['whoami']);
          if (loggedIn !== 0) {
            this.spawnCommandSync('travis', ['login']);
          }
          this.spawnCommandSync('travis', ['sync']);
          this.spawnCommandSync('travis', ['enable']);
          // Add AWS credentials to .travis.yml
          this.spawnCommandSync('travis', ['encrypt', `AWS_ACCESS_KEY_ID=${this.props.id}`, `AWS_SECRET_ACCESS_KEY=${this.props.secret}`, '--override', '--add', 'env.matrix']);
          // Trigger travis by pushing updated .travis.yml
          this.spawnCommandSync('git', ['commit', '-am', '"update .travis.yml"']);
          this.spawnCommandSync('git', ['push', 'origin', 'master']);
        })
        .catch(() => {
          throw new Error('GitHub repository creation failed.');
        });
    }
  }
};
