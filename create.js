const program = require('commander');

const { checkDir, createRepo, addCommitPush } = require('./lib');

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

const run = async () => {
  try {
    await checkDir(dir);
    await createRepo(dir, program.remote);
    await addCommitPush(dir, program.remote, 'Initialise AI repo');
  } catch (err) {
    console.log(`Error: ${err}`);
  }
};

run();
