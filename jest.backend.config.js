export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
testMatch: [
  "<rootDir>/controllers/**/*.test.js",
  "<rootDir>/controllers/**/*.integration.test.js",
  "<rootDir>/helpers/**/*.test.js",
  "<rootDir>/middlewares/**/*.test.js",
],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
  "controllers/**/*.js",
  "helpers/**/*.js",
  "middlewares/**/*.js",
  "models/**/*.js",
  "!**/*.test.js",
],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
    },
  },
};
