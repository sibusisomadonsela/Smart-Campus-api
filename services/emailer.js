require('dotenv').config();
const nodemailer = require('nodemailer');


// Use your Gmail credentials here
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const mailOptions = {
  from: 'your-email@gmail.com',
  to: 'recipient@example.com',
  subject: 'Test Email from Node.js',
  text: 'Hello from Node.js using Nodemailer and Gmail!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log('Error: ', error);
  }
  console.log('Email sent: ' + info.response);
});

module.exports = { transporter, mailOptions };

