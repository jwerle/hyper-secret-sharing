const blake2b = require('blake2b')
const crypto = require('hypercore-crypto')

const HASH_BYTES = 32
const SIGN_BYTES = 64

function unpack(buffer, publicKey) {
  if (buffer.length > SIGN_BYTES) {
    const signature = buffer.slice(0, SIGN_BYTES)
    const secret = buffer.slice(SIGN_BYTES)
    const digest = Buffer.from(blake2b(HASH_BYTES).update(secret).digest())
    const verified = crypto.verify(digest, signature, publicKey)
    if (verified) {
      return secret
    }
  }

  return null
}

module.exports = {
  unpack
}
