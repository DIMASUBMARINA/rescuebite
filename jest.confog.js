module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testSequencer: './tests/sequencer.js',
  maxWorkers: 1,
  verbose: true,
};