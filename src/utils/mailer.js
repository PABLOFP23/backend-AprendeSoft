const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendEmail(to, subject, text, html) {
  const from = process.env.EMAIL_FROM || 'AprendeSoft <noreply@aprendesoft.com>';
  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendEmail };