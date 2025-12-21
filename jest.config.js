module.exports = {
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.vue$': 'vue-jest',
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.js'],
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['/node_modules/(?!vux)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
}
