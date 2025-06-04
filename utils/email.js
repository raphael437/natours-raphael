//use the nodemailer package to send emails to the clients by

const nodemailer = require('nodemailer');
//create a function takes an object of options
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }
  //1-create transporter and defining a service that will actually send the email
  newTransporter() {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
  }
  //2-define the email options(options will be on it)
  async send(subject, message) {
    const mailOptions = {
      from: ` "Natours" <${this.from}>`,
      to: this.to,
      subject,
      text: `${message}\nReset link: ${this.url}`,
    };
    //3-actually send the email
    await this.newTransporter().sendMail(mailOptions);
  }
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }
  async sendPasswordReset() {
    await this.send(
      'Your password reset token (valid for 10 minutes)',
      'Forgot your password? Click the link below to reset it.',
    );
  }
};
