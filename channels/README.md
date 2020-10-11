# Welcome to @cuillere/channels 🥄

[![Version](https://img.shields.io/npm/v/@cuillere/channels.svg)](https://www.npmjs.com/package/@cuillere/channels)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache--2.0-yellow.svg)](https://spdx.org/licenses/Apache-2.0.html)
[![Twitter: njblepage](https://img.shields.io/twitter/follow/njblepage.svg?style=social)](https://twitter.com/njblepage)

> @cuillere/channels implements Go-like channels for [cuillere](https://github.com/cuillerejs/cuillere).

## Install

Yarn:

```sh
yarn add @cuillere/core @cuillere/channels
```

Npm:

```sh
npm install @cuillere/core @cuillere/channels
```

## Usage

```js
import cuillere from '@cuillere/core'
import { channelsPlugin, chan, send, recv } from '@cuillere/channels'

// Fire up cuillere with the channels plugin...
cuillere(channelsPlugin()).call(function* () {
  // Start using channels !
  
  const ch1 = yield chan() // Create an unbuffered channel
  const ch2 = yield chan(3) // Create a buffered channel

  // Send values to a channel
  yield send(ch2, 'Spoon!')
  yield send(ch2, 'Arthur!')

  // Receive values from a channel
  console.log(yield recv(ch2)) // Prints "Spoon!"
  console.log(yield recv(ch2)) // Prints "Arthur!"
})
```

## Getting started 🚀

### Forks

Using `fork` from `@cuillere/core` allows to execute a function concurrently:

```js
import cuillere, { fork } from '@cuillere/core'

function* say(s) {
  for (let i = 0; i < 5; i++) {
    yield sleep(100) // sleep doesn't really exist but can easily be implemented
    console.log(s)
  }
}

function* main() {
  yield fork(say('world'))
  yield say('hello')
}

cuillere.call(main)
```

`say('hello')` executes on the same stack than `main()`, while `say('world')` executes concurrently on a new stack.

They may access shared memory, according to the rules of [JavaScript's event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop).

### Channels

Channels are a conduit through which you can send and receive values with the `send()` and `recv()` operations:

```js
yield send(ch, v) // Send v to channel ch
const v = yield recv(ch) // Receive from ch, and assign value to v
```

Channels must be created before use, using the `chan()` operation:

```js
const ch = yield chan()
```

By default, sends and receives block until the other side is ready. This allows forks to synchronize without using a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

This example code sums the numbers in an array, distributing the work between two forks. Once both forks have completed their computation, it calculates the final result.

```js
import cuillere, { fork } from '@cuillere/core'
import { channelsPlugin, chan, recv, send } from '@cuillere/channels'

function* sum(numbers, ch) {
  const result = numbers.reduce((a, b) => a + b, 0)
  yield send(ch, result)
}

function* main() {
  const numbers = [7, 2, 8, -9, 4, 0]

  const ch = yield chan()
  yield fork(sum(numbers.slice(0, 3), ch))
  yield fork(sum(numbers.slice(3), ch))
  const x = yield recv(ch)
  const y = yield recv(ch)

  console.log(x, y, x + y)
}

cuillere(channelsPlugin()).call(main)
```

### Buffered Channels

TODO

### Range and Close

TODO

### Select

TODO

### Default Selection

TODO

## Examples

[@cuillere/envelope](https://github.com/cuillerejs/envelope) is a simple and fun example of using `@cuillere/channels`.

## Author

👤 **Nicolas LEPAGE**

* Website: https://nicolas.lepage.dev/
* Twitter: [@njblepage](https://twitter.com/njblepage)
* Github: [@nlepage](https://github.com/nlepage)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/cuillerejs/cuillere/issues). 

## Show your support

Give a ⭐️ if this project helped you!


## 📝 License

Copyright © 2020 [CuillereJS](https://github.com/cuillerejs).

This project is [Apache 2.0](https://spdx.org/licenses/Apache-2.0.html) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
