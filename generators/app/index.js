const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('skipDeployment');
  }

  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(`Welcome to the flawless ${chalk.red('generator-lambda-cd')} generator!`));

    const prompts = [
      {
        type: 'input',
        name: 'sampleText',
        message: 'What should the sample text be?',
        default: 'Hello',
      },
      {
        type: 'input',
        name: 'id',
        message: 'AWS Access Key ID:',
        default: 'Hello',
      },
      {
        type: 'password',
        name: 'secret',
        message: 'AWS Secret Access Key:',
        default: 'Hello',
      },
    ];

    return this.prompt(prompts).then((props) => {
      this.props = props;
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
    if (!this.options.skipDeployment) {
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
