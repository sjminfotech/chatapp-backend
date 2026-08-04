const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER, // Brevo login email
    pass: process.env.BREVO_API_KEY,   // xsmtpsib-xxxx SMTP key
  },
});

module.exports = transporter;