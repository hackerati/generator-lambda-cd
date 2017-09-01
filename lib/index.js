const fs = require('fs');
const { exec } = require('shelljs');

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
      `, (err) => {
      if (err) {
        reject();
      } else {
        console.log(`Created and reinitialized repo in subdirectory ${dir} and added remote origin for ${remote}`);
        resolve();
      }
    });
  });

module.exports.addCommit = (dir, remote, commitString) =>
  new Promise((resolve, reject) => {
    console.log(`\nAttempting to add, commit, and push code in ${dir}...`);
    exec(`
      pushd ${dir} &&
      git add . &&
      git commit -m "${commitString}" &&
      popd
      `, (err) => {
      if (err) {
        reject();
      } else {
        console.log(`Added, committed, and pushed code in subdirectory ${dir} to ${remote}`);
        resolve();
      }
    });
  });
