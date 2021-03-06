// require('dotenv').config();
const jwt = require('jwt-simple');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

module.exports = app => {
    const { existsOrError, notExistsOrError, equalsOrError } = app.server.api.validation;

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10);
        return bcrypt.hashSync(password, salt);
    };

    const login = async (req, res) => { 
        if(!req.body.email || !req.body.password) {
            return res.status(400).send('Informe email e senha');
        }
        
        const user = await app.server.service.v2.usuarioService.findByEmail(req.body.email);
        
        if(!user) return res.status(400).send('Usuário não encontrado');

        if(user.status == 'CONVIDADO') {
            return res.status(400).send('E-mail não validado');
        } else if(user.status != 'ATIVO') {
            return res.status(400).send('Usuário bloqueado');
        }

        try {
            const isMatch = bcrypt.compareSync(req.body.password, user.password);
            if(!isMatch) return res.status(400).send('E-mail/Senha inválidos');
        } catch(msg) {
            return res.status(401).send(msg);
        }
        
        const now = Math.floor(Date.now() / 1000);

        // obs: quando o token expira, o usuário precisa fazer login novamente
        const payload = {
            id: user._id,
            status: user.status,
            name: user.name,
            email: user.email,
            role: user.role,
            unidadeId: user.unidadeId,
            collectionPrefix: user.collectionPrefix,
            nomeUnidade: user.nomeUnidade,
            iat: now, //issued at: data de emissão do token (timestamp em segundos)
            exp: now + (60 * 60 * 24 * 1), // prazo de expiração do token (em segundos) 
            //TODO calcular o prazo de expiração para sempre expirar de madrugada, fora do horario de utilização
        };

        return res.json({
            ...payload,
            token: jwt.encode(payload, process.env.AUTH_SECRET), //gera um token a partir do auth secret
        });
    };

    const validateToken = async (req, res) => {
        const userData = req.body || null;
        try {
            if(userData) {
                //checa se o usuário não está com acesso bloqueado
                const user = await app.server.service.v2.usuarioService.findById(userData.id);
                console.log('USER STATUS', user.status)

                if(user.status == 'ATIVO') {
                    //checa se o token está dentro da validade
                    const token = jwt.decode(userData.token, process.env.AUTH_SECRET);
                    if(new Date(token.exp * 1000) > new Date()) { // o token ainda é válido
                        return res.send(true);
                        // Em vez de mndar true, pode-se mandar um novo token (renovar o token de forma transparente para o usuário)
                    }
                }

            }
        } catch (e) {
            // algum tipo de problema no token
            return res.send(false);
        }

        return res.send(false); // token não válido
    };

    // TODO verificar falha de segurança: é possivel alterar a senha caso o usuário esteja bloqueado?
    const forgotPassword = async (req, res) => {
        try {
            const user = await app.server.service.v2.usuarioService.findByEmail(req.body.email);
            console.log(user)

            const token = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

            await app.server.service.v2.usuarioService.replaceOne(user);

            app.server.config.mail.send(
                `
                <div>
                  <header style="text-align: center;">
                    <h1 style="padding:34px 65px; font-family: 'Open Sans', verdana, sans-serif; font-size: 2.1875rem; font-weight:normal; line-height: 2.9rem;background-color:#BED1D2; color:#206164; text-align: center;">Recuperação de senha</h1>
                  </header>
                  <section style="padding:34px 65px;font-family: Open Sans, verdana, sans-serif; font-size: 1rem;line-height: 1.375rem; color: rgba(0, 0, 0, 0.87);">
                    <p>Prezado(a) ${user.name},</p>
                    <p>
                    Você está recebendo esse e-mail porque você requisitou resetar sua senha. Por favor clique no link abaixo para alterar sua senha.
                    <a href="${process.env.CLIENT_URL}/reset/${user._id}/${user.resetPasswordToken}">${process.env.CLIENT_URL}/reset/${user._id}/${user.resetPasswordToken}</a>
                    Se você não requisitou essa alteração, ignore esse email.
                    </p>
                  </section>
                </div>
                `,
                "[IMUNI] Recuperação de senha",
                user.email
            ).catch((err) => {
                console.log(err)
            });

            delete user.password
            return res.status(200).send("Verfique seu e-mail para obter instruções");
        } catch(err) {
            return res.status(500).send(err);
        }
    }

    const validateResetToken = async (req, res) => {
        try {
            const user = await app.server.service.v2.usuarioService.validateResetToken(req.body._id, req.body.token);
            console.log(user)
            if(user) {
                return res.send(true);
            }
        } catch (e) {
            // algum tipo de problema no token
        }

        return res.send(false); // token não válido
    };

    const resetPassword = async (req, res) => {
        try {
            const user = await app.server.service.v2.usuarioService.validateResetToken(req.body._id, req.body.resetPasswordToken);
            if(user) {
                delete user.resetPasswordToken;
                delete user.resetPasswordExpires;

                existsOrError(req.body.password, 'Senha não informada');
                existsOrError(req.body.confirmPassword, 'Confirmação de senha não informada');
                equalsOrError(req.body.password, req.body.confirmPassword, 'Senhas não conferem');

                user.password = encryptPassword(req.body.password);

                const result = await app.server.service.v2.usuarioService.replaceOne(user);
                app.server.config.mail.send(
                    `
                    <div>
                      <header style="text-align: center;">
                        <h1 style="padding:34px 65px; font-family: 'Open Sans', verdana, sans-serif; font-size: 2.1875rem; font-weight:normal; line-height: 2.9rem;background-color:#BED1D2; color:#206164; text-align: center;">Senha Alterada</h1>
                      </header>
                      <section style="padding:34px 65px;font-family: Open Sans, verdana, sans-serif; font-size: 1rem;line-height: 1.375rem; color: rgba(0, 0, 0, 0.87);">
                        <p>Prezado(a) ${user.name},</p>
                        <p>
                        Sua senha foi alterada com sucesso.
                        </p>
                      </section>
                    </div>
                    `,
                    "[IMUNI] Senha alterada",
                    user.email
                  ).catch(console.error);
                return res.status(200).send("Senha alterada com sucesso");
            } else {
                return res.status(400).send("token inválido");
            }
        } catch (err) {
            console.log(err)
            return res.status(400).send(err);
        }

    };

    const acceptInvite = async (req, res) => {
        try {
            const user = await app.server.service.v2.usuarioService.validateInvitationToken(req.body._id, req.body.invitationToken);
            if(user) {
                user.status = 'ATIVO';
                delete user.invitationToken;
                delete user.invitationExpires;

                existsOrError(req.body.password, 'Senha não informada');
                existsOrError(req.body.confirmPassword, 'Confirmação de senha não informada');
                equalsOrError(req.body.password, req.body.confirmPassword, 'Senhas não conferem');

                user.password = encryptPassword(req.body.password);

                const result = await app.server.service.v2.usuarioService.replaceOne(user);
                app.server.config.mail.send(
                    `
                    <div>
                      <header style="text-align: center;">
                        <h1 style="padding:34px 65px; font-family: 'Open Sans', verdana, sans-serif; font-size: 2.1875rem; font-weight:normal; line-height: 2.9rem;background-color:#BED1D2; color:#206164; text-align: center;">Seja bem vindo!</h1>
                      </header>
                      <section style="padding:34px 65px;font-family: Open Sans, verdana, sans-serif; font-size: 1rem;line-height: 1.375rem; color: rgba(0, 0, 0, 0.87);">
                        <p>Prezado(a) ${user.name},</p>
                        <p>
                        Seja bem vindo ao sistema de monitoramento... Faça login
                        <a href="${process.env.CLIENT_URL}">${process.env.CLIENT_URL}</a>
                        </p>
                      </section>
                    </div>
                    `,
                    "[IMUNI] Seja bem vindo!",
                    user.email
                  ).catch(console.error);
                return res.status(200).send("Usuário cadastrado com sucesso");
            } else {
                return res.status(400).send("Convite expirado ou token inválido");
            }
        } catch (err) {
            console.log(err)
            return res.status(400).send(err);
        }

    };

    return { login, validateToken, forgotPassword, validateResetToken, resetPassword, acceptInvite };
};