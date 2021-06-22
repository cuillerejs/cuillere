const nodeMajorVersion = Number(process.versions.node.split('.')[0])

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: `tsconfig-node${nodeMajorVersion}.json`,
    },
  },
}
