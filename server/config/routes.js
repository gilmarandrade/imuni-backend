const express = require('express');
const role = require('./role');
const path = require('path');

module.exports = app => {    
    //  A ordem das urls tem que ser da mais especifica para a mais genérica

    // app.get('/', function (req, res) {
    //     res.send('Hello World from api-frenteprevencaocovidrn-org-br!');
    // });

    app.route('/api/teste')
    .get(app.server.api.unidades.get);
    
    app.post('/api/login', app.server.api.auth.login);
    app.post('/api/validateToken', app.server.api.auth.validateToken);

    app.route('/api/docs/:id/sheets/:sheetName/range/:range')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.planilhas.get);

    app.route('/api/sync/:limit')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.sync.sync);

    app.route('/api/sync')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.sync.sync);

    app.route('/api/unidades/:unidadeId/vigilantes/:vigilanteId/idosos')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.googlesheets.idososByVigilante);

    app.route('/api/idosos/:id')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.googlesheets.idoso);

    app.route('/api/idosos/:id/atendimentos')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.googlesheets.atendimentosByIdoso);

    app.route('/api/atendimentos/:id')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.googlesheets.atendimento);

    app.route('/api/unidades/:unidadeId/usuarios')
        .all(app.server.config.passport.authenticate())
        .get(role(app.server.api.user.getByUnidadeId, 'ADMINISTRADOR'))
        .post(role(app.server.api.user.insert, 'ADMINISTRADOR'));

    app.route('/api/unidades/:unidadeId/vigilantes')
        .all(app.server.config.passport.authenticate())
        .get(role(app.server.api.googlesheets.vigilantes, 'ADMINISTRADOR'));

    app.route('/api/unidades/:unidadeId/autosync/:status')
        .all(app.server.config.passport.authenticate())
        .get(role(app.server.api.unidades.toggleAutoSync, 'ADMINISTRADOR'));

    app.route('/api/unidades/:unidadeId/sync')
        .all(app.server.config.passport.authenticate())
        .get(role(app.server.api.sync.syncUnidade, 'ADMINISTRADOR'));

    app.route('/api/unidades/:unidadeId')
        .all(app.server.config.passport.authenticate())
        .get(role(app.server.api.unidades.getById, 'ADMINISTRADOR'));

    app.route('/api/unidades')
        .all(app.server.config.passport.authenticate())
        .get(role(app.server.api.unidades.get, 'ADMINISTRADOR'))
        .post(role(app.server.api.unidades.save, 'ADMINISTRADOR'));

    app.route('/api/stats')
        .all(app.server.config.passport.authenticate())
        .get(app.server.api.googlesheets.stats);

        
    //TODO Handle Production routes
    if(process.env.NODE_ENV === 'production') {
        // servindo arquivos estáticos
        app.use(express.static(path.resolve(__dirname, "../public")));
        // habilitando socket url
        app.route('/socket.io').all(function(req, res, next){
            next();
        });
        // handle SPA
        app.get("*", (req, res) => {// O wildcard '*' serve para servir o mesmo index.html independente do caminho especificado pelo navegador.
            res.sendFile(path.join(__dirname, "../public", "index.html"));
        });
    }

};
