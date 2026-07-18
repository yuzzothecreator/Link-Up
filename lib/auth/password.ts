import bcrypt from "bcryptjs"

const MIN_LENGTH = 8

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`
  }
  if (password.length > 128) return "Password is too long."
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number."
  }
  return null
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) return false
  return bcrypt.compare(password, hash)
}
