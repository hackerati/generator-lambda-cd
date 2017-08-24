const fs = require('fs');
const { exec } = require('child_process');

const repo = process.argv[2];
const dir = `./${repo}`;
const origin = process.argv[3];
// TODO handle undefined arg

console.log(`Attempting to create directory ${dir}`);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
  console.log(`Created directory ${dir}`);
} else {
  console.log(`The subdirectory ${dir} already exists.`);
}

console.log(`Attempting to initialize git in ${dir}`);
exec(`
  pushd ${dir} &&
  touch .gitignore
  git init &&
  git add . &&
  git commit -m "First commit" &&
  git remote add origin ${origin} &&
  git push -u origin master &&
  popd
  `, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error initializing and pushing git directory: ${err}.`);
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  } else {
    console.log(`Initialized and pushed repo to ${origin}`);
  }
});
