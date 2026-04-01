import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { User } from '@/lib/models'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    // Both Super Admin and Admin should see all roles for assignment purposes
    // Role-based management permissions (like DELETE) are handled separately
    const users = await User.find({}).sort({ role: 1, name: 1 }).select('-password')
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    const data = await request.json()
    
    // Validate role assignment
    // Admin can ONLY create 'team' members
    // Super Admin can create 'admin' or 'team'
    const allowedRoles = session.role === 'super_admin' ? ['admin', 'team'] : ['team']
    const roleToAssign = data.role || 'team'

    if (!allowedRoles.includes(roleToAssign)) {
      return NextResponse.json(
        { error: 'You do not have permission to assign this role' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const user = new User({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: roleToAssign,
      isActive: true,
    })
    
    await user.save()
    
    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password
    
    return NextResponse.json(userResponse)
  } catch (error) {
    console.error('Error creating team member:', error)
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    await connectToDatabase()
    
    const userToDelete = await User.findById(id)
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Role hierarchy check
    // Super Admin can delete 'admin' and 'team'
    // Admin can ONLY delete 'team'
    const canDelete = session.role === 'super_admin' 
      ? ['admin', 'team'].includes(userToDelete.role)
      : userToDelete.role === 'team'

    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await User.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team member:', error)
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, role, isActive } = data

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    await connectToDatabase()
    
    const userToUpdate = await User.findById(id)
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Role hierarchy check
    // Super Admin can update anyone except themselves
    // Admin can ONLY update 'team' members
    const canManage = session.role === 'super_admin' 
      ? userToUpdate._id.toString() !== session.id.toString()
      : userToUpdate.role === 'team'

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // If changing role, check permission
    if (role && role !== userToUpdate.role) {
       // Admin can't promote to Admin or Super Admin
       if (session.role === 'admin' && (role === 'admin' || role === 'super_admin')) {
        return NextResponse.json({ error: 'Insufficient permissions to assign this role' }, { status: 403 })
       }
       userToUpdate.role = role
    }

    if (isActive !== undefined) {
      userToUpdate.isActive = isActive
    }

    await userToUpdate.save()
    
    return NextResponse.json(userToUpdate)
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}
