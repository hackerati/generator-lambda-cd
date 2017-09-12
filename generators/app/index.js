const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const requestPromise = require('request-promise');

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
        name: 'repoName',
        message: 'What should the name of the GitHub repository be?',
        default: 'my-lambda-cd',
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
        const dataString = `{"scopes": ["repo", "user"], "note": "getting-started-at-${Date.now()}"}`;
        const options = {
          url: 'https://api.github.com/authorizations',
          headers: {
            'User-Agent': props.githubUser,
          },
          method: 'POST',
          body: dataString,
          resolveWithFullResponse: true,
          auth: {
            user: props.githubUser,
            pass: props.githubPassword,
          },
        };

        return requestPromise(options)
          .then((response) => {
            this.props = props;
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

                  return requestPromise(options)
                    .then((authenticationCodeResponse) => {
                      this.props = props;
                      this.props.token = JSON.parse(authenticationCodeResponse.body).token;
                      return true;
                    })
                    .catch(() => {
                      return false;
                    });
                });
            }
            return false;
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
      this.spawnCommandSync('hub', ['create']);
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
    }
  }
};
