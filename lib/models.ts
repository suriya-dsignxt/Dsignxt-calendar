import mongoose, { Schema, Document } from 'mongoose'

// Availability Schema - defines recurring weekly availability
export interface IAvailability extends Document {
  dayOfWeek: number // 0-6, Sunday-Saturday
  startTime: string // "09:00"
  endTime: string // "17:00"
  slotDuration: number // in minutes
  isActive: boolean
}

const AvailabilitySchema = new Schema<IAvailability>({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDuration: { type: Number, required: true, default: 30 },
  isActive: { type: Boolean, default: true },
})

// Blocked Date Schema - specific dates/times that are unavailable
export interface IBlockedDate extends Document {
  date: Date
  allDay: boolean
  startTime?: string
  endTime?: string
  reason?: string
}

const BlockedDateSchema = new Schema<IBlockedDate>({
  date: { type: Date, required: true },
  allDay: { type: Boolean, default: true },
  startTime: { type: String },
  endTime: { type: String },
  reason: { type: String },
})

// Appointment Schema
export interface IAppointment extends Document {
  clientName: string
  clientEmail: string
  clientPhone?: string
  date: Date
  startTime: string
  endTime: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'rescheduled'
  color?: string
  createdAt: Date
  updatedAt: Date
  adminNotes?: string
  meetingLink?: string
  remindersSent?: string[]
  assignedTo?: mongoose.Types.ObjectId[]
  otpCode?: string
}

const AppointmentSchema = new Schema<IAppointment>({
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientPhone: { type: String },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'rescheduled'],
    default: 'pending'
  },
  color: { type: String, default: '#3b82f6' },
  adminNotes: { type: String },
  meetingLink: { type: String },
  remindersSent: { type: [String], default: [] },
  assignedTo: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  otpCode: { type: String }
}, { timestamps: true })

// Notification Schema
export interface INotification extends Document {
  type: 'new_booking' | 'approval' | 'rejection' | 'cancellation' | 'reminder' | 'reschedule'
  title: string
  message: string
  appointmentId?: mongoose.Types.ObjectId
  isRead: boolean
  forAdmin: boolean
  clientEmail?: string
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>({
  type: { 
    type: String, 
    enum: ['new_booking', 'approval', 'rejection', 'cancellation', 'reminder', 'reschedule'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  isRead: { type: Boolean, default: false },
  forAdmin: { type: Boolean, default: true },
  clientEmail: { type: String },
}, { timestamps: true })

// Settings Schema
export interface ISettings extends Document {
  companyName: string
  companyEmail: string
  timezone: string
  bookingLeadTime: number // hours before appointment can be booked
  maxAdvanceBooking: number // days in advance bookings are allowed
  autoApprove: boolean
}

const SettingsSchema = new Schema<ISettings>({
  companyName: { type: String, default: 'My Company' },
  companyEmail: { type: String, default: '' },
  timezone: { type: String, default: 'UTC' },
  bookingLeadTime: { type: Number, default: 24 },
  maxAdvanceBooking: { type: Number, default: 60 },
  autoApprove: { type: Boolean, default: false },
})

// User Schema - for admin and team members
export interface IUser extends Document {
  name: string
  email: string
  password?: string
  role: 'super_admin' | 'admin' | 'team'
  permissions: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Task Schema
export interface ITask extends Document {
  title: string
  description?: string
  dueDate: Date
  status: 'pending' | 'completed'
  assignedTo: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TaskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['super_admin', 'admin', 'team'], default: 'team' },
  permissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

// Export models
if (process.env.NODE_ENV === 'development') {
  // Clear models from cache in development to ensure schema changes are applied
  delete mongoose.models.User
  delete mongoose.models.Availability
  delete mongoose.models.BlockedDate
  delete mongoose.models.Appointment
  delete mongoose.models.Notification
  delete mongoose.models.Settings
  delete mongoose.models.Task
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export const Availability = mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema)
export const BlockedDate = mongoose.models.BlockedDate || mongoose.model<IBlockedDate>('BlockedDate', BlockedDateSchema)
export const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema)
export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema)
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema)
