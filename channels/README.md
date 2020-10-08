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
  console.log(yield recv(ch2))
  console.log(yield recv(ch2))
})
```

## Documentation

[API documentation](https://github.com/cuillerejs/cuillere/blob/master/channels/DOCS.md)

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
