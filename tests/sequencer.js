const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run unit tests first, then integration tests sequentially
    const copyTests = Array.from(tests);
    return copyTests.sort((testA, testB) => {
      const isUnitA = testA.path.includes('unit');
      const isUnitB = testB.path.includes('unit');
      if (isUnitA && !isUnitB) return -1;
      if (!isUnitA && isUnitB) return 1;
      return testA.path > testB.path ? 1 : -1;
    });
  }
}

module.exports = CustomSequencer;