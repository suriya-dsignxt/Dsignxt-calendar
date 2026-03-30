import { NextResponse } from 'next/server'
import { createToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    // Check for bootstrap admin
    const adminPassword = process.env.ADMIN_PASSWORD
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dsignxt.com'
    
    if (adminPassword && password === adminPassword && (email === adminEmail || !email)) {
      const token = await createToken({ id: '000000000000000000000000', role: 'super_admin', email: adminEmail })
      
      const cookieStore = await cookies()
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      return NextResponse.json({ success: true, role: 'super_admin' })
    }
    
    // Check database for team members
    await connectToDatabase()
    const user = await User.findOne({ email, isActive: true })
    
    if (user && user.password === password) { // In production, use bcrypt
      const token = await createToken({ id: user._id.toString(), role: user.role, email: user.email })
      
      const cookieStore = await cookies()
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      return NextResponse.json({ success: true, role: user.role })
    }
    
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
