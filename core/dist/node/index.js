// eslint-disable-next-line import/no-dynamic-require
module.exports = require(`./${Number(process.versions.node.split('.')[0]) >= 14 ? '14' : '12'}`)
