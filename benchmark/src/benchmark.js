/* eslint-disable func-names, one-var-declaration-per-line,
  one-var, @typescript-eslint/no-var-requires, global-require */
// eslint-disable-next-line no-undef
const nbCalls = BigInt(process.argv[2] || 100000)

async function main() {
  const meanPublished = await benchmark('latest published', require('@cuillere/core'))
  const meanLocal = await benchmark('current local', require('../../core/lib'))

  if (meanPublished > meanLocal) {
    console.log(`local version is ${(((meanPublished - meanLocal) / meanPublished) * 100).toFixed(3)}% faster`)
  } else {
    console.log(`published version is ${(((meanLocal - meanPublished) / meanLocal) * 100).toFixed(3)}% faster`)
  }
}

async function benchmark(name, cuillereImplementation) {
  console.log(name, 'cuillere implementation')
  const { default: cuillere, call } = cuillereImplementation

  const cllr = cuillere()

  function* noop() {
    return true
  }

  let start, end
  await cllr.call(function* () {
    start = process.hrtime.bigint()
    for (let i = 0; i < nbCalls; i++) yield call(noop)
    end = process.hrtime.bigint()
  })

  const elapsed = end - start
  const mean = Number(elapsed / nbCalls)
  console.log('\t=>', (mean / 1000).toFixed(3), 'us/call\t(total ', (Number(elapsed / 1000n) / 1000).toFixed(3), 'ms)\n')
  return mean
}

main().catch(err => console.error(err))
