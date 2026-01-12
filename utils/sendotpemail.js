import nodemailer from  "nodemailer"

export const sendOtpEmail = async (email, otp) => {
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

  // console.log("EMAIL_USER:", process.env.EMAIL_USER);
  // console.log("EMAIL_APP_PASSWORD:", process.env.EMAIL_APP_PASSWORD);

  await transporter.sendMail({
    from: `"Your App Name" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    html: `
      <h2>OTP Verification</h2>
      <h1>${otp}</h1>
      <p>This OTP expires in 10 minutes</p>
    `,
  });
};
