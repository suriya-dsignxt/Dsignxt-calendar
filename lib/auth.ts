import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export async function createToken(payload: { id: string, role: string, email: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  
  return token
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { id: string, role: string, email: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('admin_token')?.value
  
  if (!token) return null
  
  const payload = await verifyToken(token)
  return payload
}

export async function isAuthenticated() {
  const session = await getSession()
  return !!session
}

export async function isAdmin() {
  const session = await getSession()
  return session?.role === 'admin' || session?.role === 'super_admin'
}

export async function isSuperAdmin() {
  const session = await getSession()
  return session?.role === 'super_admin'
}

export async function hasPermission(permission: string) {
  const session = await getSession()
  if (session?.role === 'admin') return true
  
  // For team members, we would check their permissions from the database
  // This is a simplified check, actual permission check might need a DB call
  return false 
}
