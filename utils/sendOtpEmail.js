import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async (email, otp) => {
  await resend.emails.send({
    from: "Auth <onboarding@resend.dev>",
    to: email,
    subject: "Your OTP Code",
    html: `
      <h2>OTP Verification</h2>
      <h1>${otp}</h1>
      <p>This OTP expires in 10 minutes</p>
    `,
  });
};

export default sendOtpEmail;
