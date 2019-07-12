/* promiseChain allow to apply a mapper function and await the returned value for each items, one at a time.
   @param array: an array like value (should have at leat reduce method)
   @param mapper: a function taking an item and returning a value to be awaited (a Promise in most cases)
   @returns: A promise which resolves the array of results.

   If an error occured, the chain is stopped and the remaining items will not be passed throw the mapper function.
*/
interface Mapper<T, R> {
  (item: T, index: number): Promise<R>
}

export const promiseChain = async <T, R>(array: T[], mapper: Mapper<T, R>): Promise<R> =>
  array.reduce(
    async (acc, item, index) => {
      await acc
      return mapper(item, index)
    },
    Promise.resolve<R>(undefined)
  )

/* implementation from https://stackoverflow.com/a/2117523/3548191
   Math.random is sufficient for our needs of avoiding collision.
*/
export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* values return the list of values of both string and symbols properties defined on the given object */
const values = <T>(obj: Object): T[] => [
  ...Object.values(obj),
  ...Object.getOwnPropertySymbols(obj).map(symbol => obj[symbol]),
]