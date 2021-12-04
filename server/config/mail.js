const nodemailer = require("nodemailer");
// const request = require('request');

module.exports = app => {    
  
  // // async..await is not allowed in global scope, must use a wrapper
  // async function send(message, subject, to) {

  //   let recipients = [];
  //   if(Array.isArray(to)) {
  //     recipients = to.map(function(email) {
  //       return {"email":email};
  //     });
  //   } else {
  //     recipients = [{"email": to}];
  //   }

  //   request.post(process.env.TRUSTIFI_URL + '/api/i/v1/email', 
  //     {
  //       headers: {
  //         'x-trustifi-key': process.env.TRUSTIFI_KEY,
  //         'x-trustifi-secret': process.env.TRUSTIFI_SECRET
  //       },
  //       json:{
  //         "recipients": recipients,
  //         "title": subject,
  //         "html": (process.env.MODE == 'TESTES' ? '<h2 style="color: red;">Atenção: esse e-mail foi enviado pela versão de testes do sistema.</h2>' : '') +  message
  //       }
  //     }, (err, res, body) => {
  //         console.log(to, subject, body);
  //   });

  // }

  // async..await is not allowed in global scope, must use a wrapper
  async function send(message, subject, to) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    // let testAccount = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      // host: process.env.SMTP_HOST,
      // port: 587,
      // secure: false, // true for 465, false for other ports
      // auth: {
      //   user: process.env.SMTP_USER, // email 
      //   pass: process.env.SMTP_PASSWORD, // password
      // },
      tls: {
          rejectUnauthorized: false
      },
      service: process.env.SMTP_HOST,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  
    // send mail with defined transport object
    transporter.sendMail({
      from:  (process.env.MODE ? process.env.MODE + '_SISTEMA_IMUNI ' : 'SISTEMA_IMUNI ') + '<naoresponda@imuni.herokuapp.com>', // sender address
      to: to, // list of receivers
      subject: (process.env.MODE ? '['+process.env.MODE+'_IMUNI] ' : '[IMUNI] ') + subject, // Subject line
      text: (process.env.MODE ? '['+process.env.MODE+'_IMUNI] ' : '[IMUNI] ') +  message, // plain text body
      html: (process.env.MODE == 'TESTES' ? '<h2 style="color: red;">Atenção: esse e-mail foi enviado pela versão de testes do sistema.</h2>' : '') +  message, // html body
    }).then(info => {
      console.log({info});
    }).catch(console.error);
  
    // console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }

  // async function sendToMany(message, subject, toArray) {
  //     await send(message, subject, toArray);
  // }
  async function sendToMany(message, subject, toArray) {
      await send(message, subject, toArray.join(', '));
  }
  
  return { send, sendToMany };
};