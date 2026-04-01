import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'
import { createToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const adminPassword = process.env.ADMIN_PASSWORD
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@dsignxt.com').toLowerCase()

    if (adminPassword && password === adminPassword && ((!email && adminEmail) || email?.toLowerCase() === adminEmail)) {
      const token = await createToken({
        id: '000000000000000000000000',
        role: 'super_admin',
        email: adminEmail,
        name: 'Admin',
      })

      const cookieStore = await cookies()
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })

      return NextResponse.json({ success: true, role: 'super_admin' })
    }

    await connectToDatabase()
    const normalizedEmail = String(email || '').toLowerCase()
    const user = await User.findOne({ email: normalizedEmail, isActive: true })

    if (user && user.password === password) {
      const token = await createToken({
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      })

      const cookieStore = await cookies()
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })

      return NextResponse.json({ success: true, role: user.role })
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
