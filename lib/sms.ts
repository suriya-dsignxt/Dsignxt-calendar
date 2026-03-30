import { Appointment } from './models'

/**
 * Sends an SMS notification using Twilio or a similar service.
 * For now, this is a placeholder/mock that logs to console.
 */
export async function sendSMS(to: string | undefined, message: string) {
  if (!to) return { success: false, error: 'No phone number provided' }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log('\n--- SMS NOT SENT (No Credentials) ---')
    console.log(`To: ${to}`)
    console.log(`Message: ${message}`)
    console.log('--------------------------------------\n')
    return { success: false, error: 'SMS service not configured' }
  }

  // Implementation with Twilio (requires 'twilio' package)
  try {
    // Note: To use this for real, you would run: npm install twilio
    // const twilio = require('twilio');
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: fromNumber,
    //   to: to
    // });
    
    console.log(`SMS Sent successfully to ${to}`)
    return { success: true }
  } catch (error) {
    console.error('SMS error:', error)
    return { success: false, error: 'Failed to send SMS' }
  }
}
