/* eslint-disable no-bitwise, no-mixed-operators */

/*
 * Implementation from https://stackoverflow.com/a/2117523/3548191
 * Math.random is sufficient for our needs of avoiding collision.
 */
export default () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
})
