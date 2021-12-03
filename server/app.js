const env = require('dotenv').config().parsed;
const app = require('express')();
const consign = require('consign');

consign()
  .include('/server/config/passport.js')
  .then('/server/config/middlewares.js')
  .then('/server/model')
  .then('/server/config/socket.js')
  .then('/server/config/mail.js')
  .then('/server/config/sheetsApi.js')
  .then('/server/service')
  .then('/server/api/validation.js')
  .then('/server/api')
  // .then('/server/schedule')
  .then('/server/config/routes.js')
  .into(app);

  
//protocolo http
const server = require('http').createServer(app);//TODO e se for https?
app.server.config.socket.init(server);


server.listen(process.env.PORT, ()=>{
  console.log('[' + process.env.DOMAIN + ':' + process.env.PORT + '] server running');
  console.log('DOMAIN:' + process.env.DOMAIN);
  console.log('PORT:' + process.env.PORT);
  console.log('AUTH_SECRET:' + process.env.AUTH_SECRET);
  console.log('MONGO_URIS:' + process.env.MONGO_URIS);
  console.log('MONGO_DB_NAME:' + process.env.MONGO_DB_NAME);
  console.log('CLIENT_URL:' + process.env.CLIENT_URL);
  console.log('SMTP_HOST:' + process.env.SMTP_HOST);
  console.log('SMTP_USER:' + process.env.SMTP_USER);
  console.log('SMTP_PASSWORD:' + process.env.SMTP_PASSWORD);
  console.log('MODE:' + process.env.MODE);
  console.log('DEVELOPER_MAIL:' + process.env.DEVELOPER_MAIL);

  if(process.env.DOMAIN != 'localhost') {
    app.server.config.mail.send(
      `<h1>[${process.env.DOMAIN}:${process.env.PORT}] Sistema reiniciado</h1>
      Se você não solicitou esta ação, verifique se ocorreu um erro no Node.js que possa ter reiniciado o sistema`,
      `Sistema reiniciado`,
      process.env.DEVELOPER_MAIL);
  }
});

