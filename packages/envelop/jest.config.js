const nodeMajorVersion = Number(process.versions.node.split('.')[0])

let tsconfig

if (nodeMajorVersion >= 16) tsconfig = 'tsconfig-node16.json'
else if (nodeMajorVersion >= 14) tsconfig = 'tsconfig-node14.json'
else tsconfig = 'tsconfig-node12.json'

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig,
      useESM: true,
    },
  },
  moduleNameMapper: {    '^(\\.{1,2}/.*)\\.js$': '$1',  },
}
