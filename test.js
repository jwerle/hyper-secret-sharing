const { recover, share } = require('./')
const { keyPair } = require('hypercore-crypto')
const replicate = require('hypercore-replicate')
const hypercore = require('hypercore')
const crypto = require('crypto')
const ram = require('random-access-memory')
const test = require('tape')

function download(feed, start) {
  feed.download({ start: start, end: start + feed.length })
}

test('share(feed, opts, callback) - basic', (t) => {
  const { publicKey, secretKey } = keyPair()
  const threshold = 8
  const origin = hypercore(ram, publicKey, { secretKey })
  const shares = 16
  const secret = Buffer.from('a secret message')
  const nonce = crypto.randomBytes(32)

  const holders = Array(shares).fill(0).map((_, start) => {
    const holder = hypercore(ram, publicKey, { sparse: true })
    download(holder, start)
    return holder
  })

  replicate(origin, ...holders)
  share(origin, { secret, nonce, threshold, shares }, (err, results) => {
    t.error(err)
    t.ok(Array.isArray(results))
    t.equal(shares, results.length, 'Invalid share count')
    t.end()
  })
})

test('recover(feed, opts, callback) - basic', (t) => {
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

  replicate(origin, ...holders)

  share(origin, { secret, nonce, threshold, shares }, (err, results) => {
    t.error(err)
    t.ok(Array.isArray(results))
    t.equal(shares, results.length, 'Invalid share count')

    recover(recoverer, { nonce, secretKey, threshold }, (err, result) => {
      t.error(err)
      t.ok(Buffer.isBuffer(result))
      t.ok(0 === Buffer.compare(result, secret), 'Invalid secret recovered')
      t.end()
    })
  })
})
