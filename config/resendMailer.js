const { Resend } = require("resend"); // Changed from ES6 'import' to Node 'require'

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await resend.emails.send({
      from: process.env.SENDER_FROM_EMAIL,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT SUCCESS ✔", response);
    return response;
  } catch (error) {
    console.log("EMAIL ERROR ❌", error);
    throw error;
  }
};

module.exports = { sendEmail }; // Changed from 'export const'