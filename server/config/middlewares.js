const bodyParser = require('body-parser');
const cors = require('cors');

const corsOptions = {
    origin: ['*:*', 'http://localhost:8080', 'https://imuni.herokuapp.com'],
    optionsSuccessStatus: 200
}

module.exports = app => {

    app.use((req, res, next) => { //Cria um middleware onde todas as requests passam por ele 
        // console.log('CHECANDO SSL')
        if ((req.headers["x-forwarded-proto"] || "").endsWith("http")) { //Checa se o protocolo informado nos headers é HTTP 
            // console.log('é http')
            res.redirect(`https://${req.headers.host}${req.url}`); //Redireciona pra HTTPS 
        } else {
            // console.log('ja é https')
            //Se a requisição já é HTTPS 
            next(); //Não precisa redirecionar, passa para os próximos middlewares que servirão com o conteúdo desejado 
        }
    });

    app.use(cors(corsOptions));
    app.use(bodyParser.json());
};
