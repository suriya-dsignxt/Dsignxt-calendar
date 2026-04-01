import { auth, clerkClient } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'

type AppRole = 'super_admin' | 'admin' | 'team'

export interface AppSession {
  id: string
  clerkId: string
  role: AppRole
  email: string
  name: string
  isActive: boolean
}

function normalizeRole(value: unknown): AppRole | null {
  if (value === 'super_admin' || value === 'admin' || value === 'team') {
    return value
  }

  return null
}

function getClerkEmail(user: any) {
  const primaryEmailId = user.primaryEmailAddressId
  const primaryEmail = user.emailAddresses.find((emailAddress: any) => emailAddress.id === primaryEmailId)

  return (primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || '').toLowerCase()
}

function getClerkName(user: any) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()

  return fullName || user.username || getClerkEmail(user).split('@')[0] || 'Team Member'
}

async function syncClerkUser(clerkId: string) {
  await connectToDatabase()

  let localUser = await User.findOne({ clerkId })
  if (localUser) {
    return localUser
  }

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(clerkId)
  const email = getClerkEmail(clerkUser)

  if (!email) {
    return null
  }

  const metadataRole =
    normalizeRole(clerkUser.publicMetadata?.role) ||
    normalizeRole(clerkUser.unsafeMetadata?.role)

  localUser = await User.findOne({ email })

  if (localUser) {
    localUser.clerkId = clerkId
    localUser.name = getClerkName(clerkUser)
    if (metadataRole) {
      localUser.role = metadataRole
    }
    await localUser.save()
    return localUser
  }

  const bootstrapAdminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase()
  const role = metadataRole || (email === bootstrapAdminEmail ? 'super_admin' : 'team')

  return User.create({
    clerkId,
    name: getClerkName(clerkUser),
    email,
    role,
    isActive: true,
    permissions: [],
  })
}

export async function getSession(): Promise<AppSession | null> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return null
    }

    const localUser = await syncClerkUser(userId)
    if (!localUser || !localUser.isActive) {
      return null
    }

    return {
      id: localUser._id.toString(),
      clerkId: userId,
      role: localUser.role,
      email: localUser.email,
      name: localUser.name,
      isActive: localUser.isActive,
    }
  } catch {
    return null
  }
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

  await connectToDatabase()
  const user = await User.findById(session.id).select('permissions')
  return !!user?.permissions?.includes(permission)
}
