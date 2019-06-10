hyper-secret-sharing
====================

Secret sharing over Hypercore that leverages
[xsalsa20-encoding](https://github.com/jwerle/xsalsa20-encoding) to
secure shares at rest.

## Installation

```sh
$ npm install hyper-secret-sharing
```

## Usage

```js
const secrets = require('hyper-secret-sharing')

// split 'secret' into shares appended to 'originFeed'
secrets.share(originFeed, { secret, nonce, threshold, shares }, (err, shares, index) => {
  // shares appened to 'originFeed' starting at 'index'
})

// recover secret from 'recoveryFeed'
secrets.recover(recoveryFeed, { nonce, threshold, shares, secretKey }, (err, secret) => {
  // 'secret' is the result from combined shared
})
```

## Example

```js
const { recover, share } = require('hyper-secret-sharing')
const { keyPair } = require('hypercore-crypto')
const replicate = require('hypercore-replicate')
const hypercore = require('hypercore')
const crypto = require('crypto')
const ram = require('random-access-memory')

const { publicKey, secretKey } = keyPair()
const threshold = 32
const shares = 64
const secret = Buffer.from('a secret message')
const nonce = crypto.randomBytes(32)

const recoverer = hypercore(ram, publicKey, { sparse: true })
const origin = hypercore(ram, publicKey, { secretKey })

const holders = Array(shares).fill(0).map((_, start) => {
  const holder = hypercore(ram, publicKey, { sparse: true })
  process.nextTick(replicate, holder, recoverer, { live: true })
  process.nextTick(download, holder, start)
  return holder
})

share(origin, { secret, nonce, threshold, shares }, onshare)
recover(recoverer, { nonce, secretKey, threshold }, onrecover)
replicate(origin, ...holders)

function onshare(err, shares, start, end, threshold) {
  console.log('shares: count=%d threshold=%d start=%d end=%d',
    shares.length, threshold, start, end)
}

function onrecover(err, secret) {
  console.log('recovered secret: %s', secret);
}

function download(feed, start) {
  feed.download({ start: start, end: start + feed.length })
}
```

## API

### `secrets.share(feed, opts, callback)`

Split `opts.secret` into `opts.shares` shares with a recovery threshold
specified by `opts.threshold` appending each share into the `feed`
calling `callback(err, shares, start, end, threshold)` upon success or
error where `opts` can be:

```js
{
  threshold: Number, // The number of shares need to recover the secret
  shares: Number, // The number of shares to create from the secret,
  secret: Buffer, // The secret to split into shares
  nonce: Buffer, // _Required_ nonce for 'xsalsa20-encoding' encryption
  secretKey: feed.secretKey, // An optional secret key override
}
```

```js
const crypto = require('crypto')

const secret = Buffer.from('secret message')
const nonce = crypto.randomBytes(32)
const feed = hypercore(ram)

feed.ready(() => {
  const opts = { secret, nonce, shares: 4, threshold: 2 }
  secrets.share(feed, opts, (err, shares) => {
    // handle shares
  })
})
```

### `secrets.recover(feed, opts, callback)`

Recover secret in `feed` with at least `opts.threshold` shares calling
`callback(err, secret)` where `opts` can be:

```js
{
  threshold: Number, // The number of shares need to recover the secret
  secretKey: Buffer, // _Required_ key for 'xsalsa20-encryption' decryption
  nonce: Buffer, // _Required_ nonce for 'xsalsa20-encoding' decryption
}
```

```js
const replicate = require('hypercore-replicate')
const crypto = require('crypto')

const secret = Buffer.from('secret message')
const nonce = crypto.randomBytes(32)
const feed = hypercore(ram)
const copy = hypercore(ram)

feed.ready(() => {
  const opts = { secret, nonce, shares: 4, threshold: 2 }
  secrets.share(feed, opts, (err, shares) => {
    replicate(feed, copy, () => {
      const opts = { nonce, threshold: 2, secret: feed.secretKey }
      secrets.recover(copy, opts, (err, secret) => {
        console.log('%s', secret) // 'secret message'
      })
    })
  })
})
```

## License

MIT
