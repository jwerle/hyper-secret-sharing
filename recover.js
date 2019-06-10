const { unpack } = require('./unpack')
const hypercore = require('hypercore')
const xsalsa20 = require('xsalsa20-encoding')
const assert = require('assert')
const sss = require('shamirs-secret-sharing')

function recover(storage, key, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
    opts = {}
  }

  if ('function' === typeof key) {
    callback = key
    opts = {}
    key = null
  }

  if (key && !Buffer.isBuffer(key) && 'object' === typeof key) {
    opts = key
    key = opts.key || null
  }

  opts = Object.assign({ }, opts)

  let { valueEncoding, secretKey, nonce } = opts
  let feed = null

  if (!secretKey) {
    secretKey = storage.secretKey
  }

  if (
    storage && 'object' === typeof storage &&
    'function' === typeof storage.getBatch
  ) {
    feed = storage
  } else {
    feed = hypercore(storage, key, opts)
  }

  feed.ready(onready)

  return feed

  function onready() {
    if (!key) {
      key = feed.key
    }

    if (!secretKey) {
      secretKey = feed.secretKey
    }

    const step = opts.threshold
    let i = 0

    if (secretKey && Buffer.isBuffer(nonce)) {
      valueEncoding = xsalsa20(nonce, secretKey, { valueEncoding })
    }

    if (feed.length < step) {
      feed.update(loop)
    } else {
      loop()
    }

    function loop() {
      if (i >= feed.length) {
        return feed.update(loop)
      }

      const start = i
      const end = Math.min(i + step, feed.length)
      feed.getBatch(start, end, { valueEncoding }, onshares)
      i++
    }

    function onshares(err, shares) {
      if (err) {
        if ('function' === typeof callback) {
          callback(err)
        }
        return
      }

      const buffer = sss.combine(shares)
      const secret = unpack(buffer, feed.key)

      if (!secret) {
        loop()
      } else if ('function' === typeof callback) {
        callback(err, secret)
      }
    }
  }
}

module.exports = {
  recover
}
