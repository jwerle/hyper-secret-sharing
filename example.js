const { recover, share } = require('./')
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
