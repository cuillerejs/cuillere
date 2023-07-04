import { all, batched, cuillere } from '@cuillere/core'

const getBeers = batched(async function* getBeers(calls) {
  const ids = calls.flat()
  console.log(`Fetching ${ids.length} beers...`)

  const res = await fetch(`https://api.punkapi.com/v2/beers?ids=${ids.join('|')}`)
  const beers = await res.json()

  return calls.map(ids => ids.map(id => beers.find(beer => beer.id === id)))
})

// Generate beer drinkers with random favourite beers
const beerDrinkers = Array.from(['Valou', 'Yoann', 'Nico', 'Sev'], name => ({
  name,
  favouriteBeers: Array.from({ length: 5 }, () => Math.ceil(Math.random() * 325 + 1)),
}))

cuillere().call(function* () {
  // Calling getBeers() once per drinker concurrently should result in one fetch
  const allBeers = yield all(beerDrinkers.map(({ favouriteBeers }) => getBeers(...favouriteBeers)))

  beerDrinkers.forEach(({ name }, index) => {
    console.log(`${name}'s favourite beers are:`)
    allBeers[index].forEach(beer => console.log(`  ${beer.name}, "${beer.tagline}"`))
  })
})
