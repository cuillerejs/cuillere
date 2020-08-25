<h1 align="center">Welcome to cuillere 🥄</h1>
<p>
  <a href="https://www.npmjs.com/package/@cuillere/core" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/@cuillere/core.svg">
  </a>
  <a href="https://spdx.org/licenses/Apache-2.0.html" target="_blank">
    <img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache2.0-yellow.svg" />
  </a>
</p>

> cuillere is an extensible asynchronous execution framework based on generator functions.

**🚧 cuillere is still in early development stage, the API may change at any time.**

## Why ?

The goal of cuillere is to abstract some inevitable technical complexity (such as managing database transactions) in plugins, and keep business code as simple and focused as possible.

## Usage

In this example we use cuillere to manage the connection to a PostgreSQL database.

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

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/EmrysMyrddin/cuillere/issues).

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2019 [Valentin Cocaud](https://github.com/EmrysMyrddin).<br />
This project is [Apache-2.0](https://spdx.org/licenses/Apache-2.0.html) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
