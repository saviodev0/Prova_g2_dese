const HASH_PREFIX = 'hash:'

export const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${HASH_PREFIX}${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const isHashedPassword = (value) => typeof value === 'string' && value.length === 64

export const verifyPassword = async (password, hash) => {
  const expectedHash = await hashPassword(password)
  return expectedHash === hash
}
