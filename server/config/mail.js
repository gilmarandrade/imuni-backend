require('dotenv').config();
const nodemailer = require("nodemailer");

module.exports = app => {    
  const body = 
  `
  <div>
    <header style="text-align: center;">
      <h1 style="padding:34px 65px; font-family: 'Open Sans', verdana, sans-serif; font-size: 2.1875rem; font-weight:normal; line-height: 2.9rem;background-color:#BED1D2; color:#206164; text-align: center;">Teste email</h1>
    </header>
    <section style="padding:34px 65px;font-family: Open Sans, verdana, sans-serif; font-size: 1rem;line-height: 1.375rem; color: rgba(0, 0, 0, 0.87);">
      <p>Prezado(a) Anilson Soares,</p>
      <p>
      Isto é apenas um teste
      </p>
    </section>
  </div>
  `;
  
  // async..await is not allowed in global scope, must use a wrapper
  async function send(message, subject, to) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // TODO gmail
        pass: process.env.SMTP_PASSWORD, // gmail password
      },
      tls: {
          rejectUnauthorized: false
      }
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Frente Prevenção COVID19 RN" <frenteprevencaocovidrn@gmail.com>', // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: message, // plain text body
      html: message, // html body
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }
  
  return { send };
};