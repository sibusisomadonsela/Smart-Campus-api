require('dotenv').config();
const nodemailer = require('nodemailer');

// Use your Gmail credentials here
/*const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});*/

const transporter = nodemailer.createTransport({
  //pool: true, //Email stopped working, after commenting this line, email started going  
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
});

exports.sendEmail = async (mailOptions) => {
  try {
    //console.log("Sending email : ", transporter);
    //console.log("Sending email : ", transporter.GMAIL_USER);
    //console.log(mailOptions);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.log('Error sending email: ', error);
    throw error;
  }
};

exports.sendReviewHtmlBody = async (to, body, subject) => {
  const mailOptions = {
    from: "smartcampusportal2379@gmail.com",
    to,
    subject,
    html: body,
  };
  return this.sendEmail(mailOptions);
}


