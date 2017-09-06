exports.handler = (event, context) => {
  console.log(`Lambda has been called with event: ${JSON.stringify(event)}`);
  context.succeed();
};
