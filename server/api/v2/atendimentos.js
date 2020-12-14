/**
 * Extrai uma resposta do array de respostas
 * @param {*} session identificador da seção no form. Ex: 'S03'
 * @param {*} question identificador da questão na seção. Ex: 'Q06'
 * @param {*} fichaVigilancia array com respostas do questionário
 * @returns null ou String
 */
const extractResponse = (session, question, fichaVigilancia) => {
    if(fichaVigilancia && session && question) {
        if(fichaVigilancia[session]) {
            if(fichaVigilancia[session][question] && fichaVigilancia[session][question].response !== null && fichaVigilancia[session][question].response !== undefined && fichaVigilancia[session][question].response !== '') {
                return fichaVigilancia[session][question].response;
            }
        }
    }
    return null;
};

/**
 * Extrai uma resposta e converte para Number
 * @param {*} session 
 * @param {*} question 
 * @param {*} fichaVigilancia 
 * @returns Number ou null
 */
const extractNumber = (session, question, fichaVigilancia) => {
    const response = extractResponse(session, question, fichaVigilancia);
    return response ? +response : null;
}

/**
 * Retorna um booleano se o valor recebido é equivalente a trueValue.
 * 
 * Se falseValue também for informado:
 * retorna false caso o valor recebido seja equivalente a falseValue, e retorna null se o valor recebido for diferente de ambos 
 * @param {*} session 
 * @param {*} question 
 * @param {*} fichaVigilancia 
 * @param {*} trueValue 
 * @param {*} falseValue 
 * @return Boolean ou null
 */
const extractBoolean = (session, question, fichaVigilancia, trueValue, falseValue) => {
    if(falseValue !== undefined) {
        const response = extractResponse(session, question, fichaVigilancia);
        if(response == trueValue) {
            return true;
        } else if(response == falseValue){
            return false;
        } else {
            return null;
        }
    }
    return isEquals(session, question, fichaVigilancia);
}

/**
 * Retorna true se a resposta for igual a trueValue
 * @param {*} session 
 * @param {*} question 
 * @param {*} fichaVigilancia 
 * @param {*} trueValue 
 * @return Boolean
 */
const isEquals = (session, question, fichaVigilancia, trueValue) => {
    return extractResponse(session, question, fichaVigilancia) == trueValue;
}


/**
 * Retorna false caso a resposta seja igual ao falseValue
 * @param {*} session 
 * @param {*} question 
 * @param {*} fichaVigilancia 
 * @param {*} falseValue 
 * @return Boolean
 */
const isNotEquals = (session, question, fichaVigilancia, falseValue) => {
    return !isEquals(session, question, fichaVigilancia, falseValue);
}

/**
 * Extrai uma resposta de multipla escolha
 * Retorna um array vazio se o primeiro item da lista for igual a 'Não'
 * @param {*} session 
 * @param {*} question 
 * @param {*} fichaVigilancia 
 * @return Array
 */
const extractRequiredList = (session, question, fichaVigilancia) => {
    const response = extractResponse(session, question, fichaVigilancia);

    if(Array.isArray(response)) {
        if(response.length > 0 && response[0] == 'Não') {
            return [];
        }
        return response;
    }

    return [];
}



module.exports = app => {

    const save = async (req, res) => {
        // TODO checar se o api key recebido é valido por segurança 

        const atendimento = req.body;

        console.log('ATENDIMENTO RECEBIDO:');
        try {
            // atendimento.timestamp = (new Date(atendimento.timestamp)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
            console.log(atendimento);

            
            if(atendimento && atendimento.responses) {
                atendimento.raw = {};

                atendimento.responses.forEach(item => {
                    atendimento.raw[item.question.substring(1,4)] = {};
                });

                atendimento.responses.forEach(item => {
                    atendimento.raw[item.question.substring(1,4)][item.question.substring(4,7)] = item;
                });

                console.log(atendimento.raw);
                delete atendimento.responses;

                atendimento.idosoId = extractResponse('S01','Q01', atendimento.raw);
                atendimento.vigilanteId = extractResponse('S01','Q02', atendimento.raw);
                atendimento.unidadeId = extractResponse('S01','Q03', atendimento.raw);
                atendimento.atendeu = isEquals('S02','Q01', atendimento.raw, 'Sim');
                atendimento.fonte = extractResponse('S04','Q01', atendimento.raw);
                atendimento.tipo =  extractResponse('S07','Q01', atendimento.raw);
                atendimento.idadeIdoso = extractNumber('S03','Q01', atendimento.raw);
                atendimento.duracaoChamada = extractResponse('S13','Q01', atendimento.raw);

                const criterios = {
                    atendeu: isEquals('S02','Q01', atendimento.raw, 'Sim'),
                    sintomasIdoso: {
                        apresentaSintomasGripeCOVID: extractRequiredList('S05','Q01', atendimento.raw).length > 0 ? true : false,
                        sintomas: extractRequiredList('S05','Q01', atendimento.raw),
                        contatoComCasoConfirmado: isEquals('S05','Q05', atendimento.raw, 'Sim'),
                    },
                    comorbidades: {
                        apresentaCondicoesSaude: extractRequiredList('S06','Q01', atendimento.raw).length > 0 ? true : false,
                        medicacaoDiaria: {
                            deveTomar: isEquals('S06','Q02', atendimento.raw, 'Sim'),
                            acessoMedicacao: extractBoolean('S06','Q04', atendimento.raw, 'Sim, consigo adquirí-las', 'Não, meus medicamentos estão faltando'),
                        }
                    },
                    domicilio: {
                        viveSozinho: isEquals('S09','Q01', atendimento.raw, 'Somente o idoso'),
                        apresentaSintomasGripeCOVID: extractRequiredList('S10','Q01', atendimento.raw).length > 0 ? true : false,
                        habitosAcompanhantes: {
                            saiDeCasa: isEquals('S11','Q01', atendimento.raw, 'Sim'),
                        },
                    },
                    vulnerabilidades: {
                        alimentar: isEquals('S12','Q02', atendimento.raw, 'Sim'),
                        financeira: isEquals('S12','Q03', atendimento.raw, 'Sim'),
                        violencia: isEquals('S12','Q04', atendimento.raw, 'Sim'),
                    },
                };

                if(atendimento.tipo == 'Primeiro Atendimento') {
                    await app.server.service.v2.idosoService.upsertEpidemiologia(atendimento.idosoId, atendimento.raw['S08']);
                    
                    criterios.epidemiologia = {
                        isolamento: {
                            saiDeCasa: isEquals('S08','Q02', atendimento.raw, 'Sim'),
                        },
                        visitas: {
                            recebeVisitas: isNotEquals('S08','Q06', atendimento.raw, 'O idoso não recebe visitas'),
                        },
                    };
                } else {// acompanhamento
                    const epidemiologiaRaw = await app.server.service.v2.idosoService.getEpidemiologia(atendimento.idosoId);
                    criterios.epidemiologia = {
                        isolamento: {
                            saiDeCasa: isEquals('S08','Q02', epidemiologiaRaw, 'Sim'),
                        },
                        visitas: {
                            recebeVisitas: isNotEquals('S08','Q06', epidemiologiaRaw, 'O idoso não recebe visitas'),
                        },
                    };
                }
                
                console.log(criterios);
                atendimento.criterios = criterios;

                await app.server.service.v2.atendimentoService.insertOne(atendimento);
                return res.status(200).json(atendimento);
            }


        } catch(err) {
            console.log(err);
            return res.status(500).send(err.toString());
        }
    }

    const getById = async (req, res) => {
        const id = req.params.idAtendimento;

        try {
            const result = await app.server.service.v2.atendimentoService.findById(id);
            return res.json(result);
        } catch(err) {
            return res.status(500).send(err);
        }
    }

    return { save, getById };
};