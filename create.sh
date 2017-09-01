#!/bin/bash
set -e;
read -p "directory name: " name;
read -p "remote repo url: " remote;
read -p "AWS Access Key ID: " id;
read -s -p "AWS Secret Access Key: " secret;
node create.js --name $name --remote $remote;
pushd $name
hub create;
git push origin master;
travis whoami || travis login;
travis sync;
travis enable;
travis encrypt AWS_ACCESS_KEY_ID=$id AWS_SECRET_ACCESS_KEY=$secret --override --add env.matrix;
git commit -am "update .travis.yml";
git push origin master;
popd;
