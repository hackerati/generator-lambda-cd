const fs = require('fs');
const { exec } = require('child_process');

module.exports.checkDir = dir =>
  new Promise((resolve, reject) => {
    console.log(`\nChecking if subdirectory ${dir} exists...`);
    if (!fs.existsSync(dir)) {
      console.log(`Subdirectory ${dir} does not yet exist`);
      resolve();
    } else {
      reject(`The subdirectory ${dir} already exists`);
    }
  });

module.exports.createRepo = (dir, remote) =>
  new Promise((resolve, reject) => {
    console.log(`\nAttempting to create repo in subdirectory ${dir}...`);
    exec(`
      git clone git@github.com:hackerati/skills-framework-template.git ${dir} &&
      pushd ${dir} &&
      rm -rf .git/ &&
      git init &&
      git remote add origin ${remote} &&
      popd
      `, (err, stdout, stderr) => {
      if (err) {
        reject(`${err}\nstdout: ${stdout}\nstderr: ${stderr}`);
      } else {
        console.log(`Created and reinitialized repo in subdirectory ${dir} and added remote origin for ${remote}`);
        resolve();
      }
    });
  });

module.exports.addCommitPush = (dir, remote, commitString) =>
  new Promise((resolve, reject) => {
    console.log(`\nAttempting to add, commit, and push code in ${dir}...`);
    exec(`
      pushd ${dir} &&
      git add . &&
      git commit -m "${commitString}" &&
      git push -u origin master &&
      popd
      `, (err, stdout, stderr) => {
      if (err) {
        reject(`Failed to add, commit, and push: ${err}\nstdout: ${stdout}\nstderr: ${stderr}`);
      } else {
        console.log(`Added, committed, and pushed code in subdirectory ${dir} to ${remote}`);
        resolve();
      }
    });
  });
