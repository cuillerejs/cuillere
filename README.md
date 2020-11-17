<h1>
  <img src="https://raw.githubusercontent.com/cuillerejs/cuillere/master/logo.png" width="160" />
  <br />
  Welcome to CuillereJS 🥄
</h1>

[![Version](https://img.shields.io/npm/v/@cuillere/core.svg)](https://www.npmjs.com/package/@cuillere/core)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache2.0-yellow.svg)](https://spdx.org/licenses/Apache-2.0.html)

**CuillereJS is an extensible asynchronous execution framework based on generator functions.**

*🚧 CuillereJS is still experimental, APIs may change at any time.*

## Why ?

The goal of CuillereJS is to abstract some inevitable technical complexity (such as managing database transactions) in plugins, and keep business code as simple and focused as possible.

## Usage

In this example we use CuillereJS to manage the connection to a PostgreSQL database.

```js
const cuillere = require('@cuillere/core')
const { poolPlugin, transactionPlugin, queryPlugin } = require('@cuillere/postgres')

const cllr = cuillere(
  poolPlugin({ /* postgres config */ }), // Manages connection pool
  transactionPlugin(), // Manages transactions
  queryPlugin() // Executes queries
)

const addUserAddress = (userId, address, setDefault) => cllr.call(function*() {
  const res = yield query({
    text: `INSERT INTO addresses (userId, street, postalcode, city)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
    values: [userId, address.street, address.postalCode, address.city]
  })
  if (setDefault) {
    const addressId = res.rows[0].id
    yield query({
      text: `UPDATE users
             SET defaultaddressid = $1
             WHERE userid = $2`,
      values: [addressId, userId]
    })
  }
})
```

## Install

```sh
yarn add @cuillere/core
```

## Authors

👤 **Valentin Cocaud**

* Twitter: [@ragorn44](https://twitter.com/ragorn44)
* Github: [@EmrysMyrddin](https://github.com/EmrysMyrddin)

👤 **Nicolas Lepage**

* Twitter: [@njblepage](https://twitter.com/njblepage)
* Github: [@nlepage](https://github.com/nlepage)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/cuillerejs/cuillere/issues).

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2020 [CuillereJS](https://github.com/cuillerejs).<br />
This project is [Apache-2.0](https://spdx.org/licenses/Apache-2.0.html) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
