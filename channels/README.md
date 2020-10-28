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

Channels can be buffered. Provide the buffer length as the argument to `chan()` to initialize a buffered channel:

```js
const ch = yield chan(100)
```

Sends to a buffered channel block only when the buffer is full. Receives block when the buffer is empty.

In the following example, making a third `send()` or reducing the buffer length, would block `main()` forever:

```js
import cuillere from '@cuillere/core'
import { channelsPlugin, chan, recv, send } from '@cuillere/channels'

function* main() {
  const ch = yield chan(2)
  yield send(ch, 1)
  yield send(ch, 2)
  console.log(yield recv(ch))
  console.log(yield recv(ch))
}

cuillere(channelsPlugin()).call(main)
```

### Range and Close

A sender can close a channel to indicate that no more values will be sent. Receivers can test whether a channel has been closed by sending `true` as the second argument to `recv()`, in which case it returns a tuple with the received value and a boolean:

```js
const [v, ok] = yield recv(ch, true)
```

`ok` is false if there are no more values to receive and the channel is closed.

It is possible to iterate over the values recevied from a channel until it is closed, using the `range()` operation and the [` for await ... of` syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of):

```js
import cuillere, { fork } from '@cuillere/core'
import { channelsPlugin, chan, close, range, send } from '@cuillere/channels'

function* fibonacci(n, ch) {
  let x = 0
  let y = 1
  for (let i = 0; i < n; i++) {
    yield send(ch, x);
    [x, y] = [y, x + y]
  }
  yield close(ch)
}

async function* main() {
  const ch = yield chan(10)
  yield fork(fibonacci(10, ch))
  for await (const v of yield range(ch)) {
    console.log(v)
  }
}

cuillere(channelsPlugin()).call(main)
```

**Note:** Only the sender should close a channel, never the receiver. Sending on a closed channel will throw an error.

**Another note:** Channels aren't real resources, you don't usually need to close them. Closing is only necessary when the receiver must be told there are no more values coming, such as to terminate a range loop.

### Select

The `select()` operation lets a fork wait on multiple communication operations.

A `select()` blocks until one of its cases can run, then it executes that case. It chooses one at random if multiple are ready.

A case is a tuple containing a `recv()` or `send()` operation, and a callback which can be a normal or generator function.

```js
import cuillere, { fork } from '@cuillere/core'
import { channelsPlugin, chan, recv, select, send } from '@cuillere/channels'

function* fibonacci(ch, quit) {
  let x = 0
  let y = 1
  let stopped = false
  while (!stopped) {
    yield select(
      [send(ch, x), () => {
        [x, y] = [y, x + y]
      }],
      [recv(quit), () => {
        console.log('quit')
        stopped = true
      }],
    )
  }
}

function* main() {
  const ch = yield chan()
  const quit = yield chan()
  yield fork(function* () {
    for (let i = 0; i < 10; i++) {
      console.log(yield recv(ch))
    }
    yield send(quit, null)
  })
  yield fibonacci(ch, quit)
}

cuillere(channelsPlugin()).call(main)
```

### Default Selection

The `default` case in a `select()` is run if no other case is ready.

Use a `default` case to try a send or receive without blocking:

```js
yield select(
  [recv(ch), i => {
    // use i
  }],
  [select.default, () => {
    // receiving from ch would block
  }]
)
```

In this example, the `after()` operation returns a new channel which will receive a value after the specified duration, and the `tick()` operation returns a new channel which will receive values at the specified interval:

```js
import cuillere from '@cuillere/core'
import { channelsPlugin, after, recv, select, tick } from '@cuillere/channels'

function* main() {
  const ticker = yield tick(100)
  const boom = yield after(500)
  let stopped = false
  while (!stopped) {
    yield select(
      [recv(ticker), () => {
        console.log('tick.')
      }],
      [recv(boom), () => {
        console.log('BOOM!')
        stopped = true
      }],
      [select.default, function* () {
        console.log('    .')
        yield sleep(50)
      }]
    )
  }
}

cuillere(channelsPlugin()).call(main)
```

## API

For a full API documentation see [API.md](https://github.com/cuillerejs/cuillere/blob/master/channels/API.md)

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
