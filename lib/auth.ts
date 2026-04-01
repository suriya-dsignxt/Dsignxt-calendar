import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

type AppRole = 'super_admin' | 'admin' | 'team'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export interface AppSession {
  id: string
  role: AppRole
  email: string
  name?: string
  isActive?: boolean
}

export async function createToken(payload: { id: string, role: AppRole, email: string, name?: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AppSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('admin_token')?.value

  if (!token) {
    return null
  }

  return verifyToken(token)
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
  if (!session) {
    return false
  }

  if (session.role === 'admin' || session.role === 'super_admin') {
    return true
  }

  return false
}
