const blake2b = require('blake2b')
const crypto = require('hypercore-crypto')

const HASH_BYTES = 32

function pack(secret, secretKey) {
  const digest = Buffer.from(blake2b(HASH_BYTES).update(secret).digest())
  const signature = crypto.sign(digest, secretKey)
  const packed = Buffer.concat([ signature, secret ])
  return packed
}

module.exports = {
  pack
}
