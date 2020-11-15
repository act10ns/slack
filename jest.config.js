module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: [
    '**/create.test.ts',
    // '**/delete.test.ts',
    '**/pull_request.test.ts',
    '**/push.test.ts',
    // '**/release.test.ts',
    '**/schedule.test.ts',
    // '**/workflow_dispatch.test.ts',
  ],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}