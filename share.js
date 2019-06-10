const hypercore = require('hypercore')
const xsalsa20 = require('xsalsa20-encoding')
const { pack } = require('./pack')
const assert = require('assert')
const crypto = require('hypercore-crypto')
const Batch = require('batch')
const sss = require('shamirs-secret-sharing')

function share(storage, key, opts, callback) {
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

  let { valueEncoding } = opts
  let feed = null

  delete opts.valueEncoding

  if ('string' === typeof opts.secretKey) {
    opts.secretKey = Buffer.from(opts.secretKey, 'hex')
  }

  if ('string' === typeof opts.nonce) {
    opts.nonce = Buffer.from(opts.nonce, 'hex')
  }

  if (!opts.secretKey && storage.secretKey) {
    opts.secretKey = storage.secretKey
  }

  if (
    storage && 'object' === typeof storage &&
    'function' === typeof storage.append
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

    if (opts.nonce && (feed.secretKey || opts.secretKey)) {
      const { nonce, secretKey = feed.secretKey } = opts
      valueEncoding = xsalsa20(nonce, secretKey, { valueEncoding })
    }

    if (feed.writable && opts.secret && opts.shares && opts.threshold) {
      const secret = pack(opts.secret, feed.secretKey)
      const shares = sss.split(secret, opts)
      const start = feed.length
      const end = start + shares.length

      if (valueEncoding) {
        for (const buf of shares) {
          valueEncoding.encode(buf, buf)
        }
      }

      feed.append(shares, (err) => {
        if ('function' === typeof callback) {
          if (err) {
            callback(err)
          } else {
            callback(null, shares, start, end, opts.threshold)
          }
        }

        if (!err) {
          feed.emit('shares', shares, start, end, opts.threshold)
        }
      })
    }
  }
}

module.exports = {
  share
}
