import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

// Derive key from environment secret
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_SECRET must be at least 32 characters")
  }
  return crypto.scryptSync(secret, "salt", KEY_LENGTH)
}

export function encryptData(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Combine iv + authTag + encrypted
  return iv.toString("hex") + authTag.toString("hex") + encrypted
}

export function decryptData(encryptedData: string): string {
  const key = getEncryptionKey()

  // Extract iv, authTag, and encrypted data
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), "hex")
  const authTag = Buffer.from(
    encryptedData.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2),
    "hex"
  )
  const encrypted = encryptedData.slice(IV_LENGTH * 2 + TAG_LENGTH * 2)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
