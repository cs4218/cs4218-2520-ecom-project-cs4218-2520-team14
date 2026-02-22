export default {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // // only run these tests
  // testMatch: ["<rootDir>/client/src/pages/Auth/*.test.js"], // "<rootDir>/client/src/pages/*.test.js"
  testMatch: ["<rootDir>/client/src/pages/HomePage.test.js", "<rootDir>/client/src/context/cart.test.js", "<rootDir>/client/src/pages/CartPage.test.js", "<rootDir>/client/src/hooks/useCategory.test.js", "<rootDir>/client/src/pages/Categories.test.js"],
  // jest code coverage
  collectCoverage: true,
  // collectCoverageFrom: ["client/src/pages/Auth/**", "client/src/pages/**"],
  collectCoverageFrom: ["client/src/pages/HomePage.js", "client/src/context/cart.js", "client/src/pages/CartPage.js", "client/src/hooks/useCategory.js", "client/src/pages/Categories.js"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
