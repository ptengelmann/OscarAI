module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'html']
}
