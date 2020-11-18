/* eslint-disable global-require */
const nodeMajorVersion = Number(process.versions.node.split('.')[0])
if (nodeMajorVersion >= 14) module.exports = require('./14')
else module.exports = require('./12')
