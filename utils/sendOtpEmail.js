import { Resend } from "resend";

// Debug: Check if API key is loaded
console.log('=== Resend Debug ===');
console.log('RESEND_API_KEY loaded?', process.env.RESEND_API_KEY ? 'YES' : 'NO');
console.log('Key first 5 chars:', process.env.RESEND_API_KEY?.substring(0, 5) || 'No key');

// Check if key starts with 're_' (valid Resend key format)
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('❌ ERROR: RESEND_API_KEY is not set in environment variables');
  console.error('Add RESEND_API_KEY=re_... to your .env file or Railway variables');
} else if (!apiKey.startsWith('re_')) {
  console.error('❌ ERROR: RESEND_API_KEY does not start with "re_"');
  console.error('Please use a valid Resend API key from https://resend.com/api-keys');
}

const resend = new Resend(apiKey);

const sendOtpEmail = async (email, otp) => {
  try {
    console.log(`📧 Attempting to send OTP to ${email}`);
    
    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Send the email
    const data = await resend.emails.send({
      from: "Auth <onboarding@resend.dev>",
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333;">OTP Verification</h2>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="color: #2c3e50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666;">This OTP expires in 10 minutes</p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });
    
    console.log('✅ Email sent successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('Full error:', error);
    
    // Return error instead of throwing so calling code can handle it
    return { 
      success: false, 
      error: error.message,
      details: error 
    };
  }
};

export default sendOtpEmail;