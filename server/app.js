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
  if(process.env.DOMAIN != 'localhost') {
    app.server.config.mail.send(
      `<h1>Sistema reiniciado</h1>
      Se você não solicitou esta ação, verifique se ocorreu um erro no Node.js que possa ter reiniciado o sistema`,
      `Sistema reiniciado`,
      process.env.DEVELOPER_MAIL);
  } else {
    console.log(env)
  }
});

