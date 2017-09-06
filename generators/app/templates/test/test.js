const assert = require('assert');
const sinon = require('sinon');
const { handler } = require('../lambda');

const context = {
  succeed: () => true,
  fail: () => false,
};

describe('Dummy test', () => {
  it('should pass on trivial test', () => {
    assert.equal(1, 1);
  });
});
describe('Empty handler test', () => {
  it('should log to console, succeed, and get a null response when calling the handler', () => {
    const consoleLogSpy = sinon.spy(console, 'log');
    const succeedSpy = sinon.spy(context, 'succeed');
    assert.equal(handler({}, context), null);
    assert(consoleLogSpy.calledWith('Lambda has been called with event: {}'));
    assert(succeedSpy.returned(true));
    consoleLogSpy.restore();
    succeedSpy.restore();
  });
});
