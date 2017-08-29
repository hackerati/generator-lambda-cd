const fs = require('fs');
const { exec } = require('child_process');
const program = require('commander');

program
  .version('0.0.1')
  .option('-n, --name [string]', 'name of repo/directory to create')
  .option('-r, --remote [string]', 'name of remote repository to push to')
  .parse(process.argv);

if (!program.name || !program.remote) {
  console.error('Error: missing required args');
  process.exit();
}

const dir = `./${program.name}`;

function addCommitPush(commitString) {
  console.log(`Attempting to add, commit, and push code in ${dir}`);
  // TODO warn/ask before forcing. re-add forcing
  exec(`
    pushd ${dir} &&
    git add . &&
    git commit -m "${commitString}" &&
    git push -u origin master &&
    popd
    `, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error adding, committing, and pushing code in ${dir}: ${err}.`);
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    } else {
      console.log(`Added, committed, and pushed code in ${dir} to ${program.remote}`);
    }
  });
}

function initializeGit() {
  console.log(`Attempting to initialize git in ${dir}`);
  exec(`
    pushd ${dir} &&
    touch .gitignore
    git init &&
    git remote add origin ${program.remote} &&
    popd
    `, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error initializing and pushing git directory: ${err}.`);
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    } else {
      addCommitPush('First commit');
      console.log(`Initialized and pushed repo to ${program.remote}`);
    }
  });
}

function makeDir() {
  console.log(`Attempting to create directory ${dir}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`Created directory ${dir}`);
    initializeGit();
  } else {
    console.log(`The subdirectory ${dir} already exists.`);
    addCommitPush('Add code');
  }
}

makeDir();