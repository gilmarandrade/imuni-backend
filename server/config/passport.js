const passport = require('passport');
const passportJwt = require('passport-jwt');
const { Strategy, ExtractJwt } = passportJwt;

module.exports = app => {
    const params = {
        secretOrKey: process.env.AUTH_SECRET,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    };

    const strategy = new Strategy(params, async (payload, done) => {
        try {
            const user = await app.server.service.v2.usuarioService.findById(payload.id);
            console.log(user);
            done(null, user ? { ...payload } : false);
        } catch(err) {
            done(err, false);// não autorizado
        }
    });

    passport.use(strategy);

    return { 
        authenticate: () => passport.authenticate('jwt', { session: false })
    };
}
