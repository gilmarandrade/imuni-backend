/**
 * @deprecated
 */
const { calcularEscalas } = require('../config/helpers');
const sheetsApi = require('../config/sheetsApi');
const atendimentoService = require('./atendimentoService');
const idosoService = require('./idosoService');
const unidadeService = require('./unidadeService');

/**
 * Sincronização completa da unidade (todos os vigilantes e todas as respostas)
 * @param {*} idUnidade 
 */
const importFromPlanilhaUnidade = async (idUnidade) => {
    const unidade = await unidadeService.findById(idUnidade);
    
    if(unidade) {
        console.log(`[Sync] ${unidade.nome} STARTING SYNC `);
        console.log(unidade);
        const sheets = await prepareDataToSync(unidade);
        
        for(let i = 0; i < sheets.length; i++) {
            if(sheets[i].sheetName.startsWith("Vigilante")) {
                const rows = await syncIdososBySheetName(unidade, sheets[i].sheetName);
                if(rows == 0) {// se não encontrou nenhuma linha, tenta mais uma vez
                    await syncIdososBySheetName(unidade, sheets[i].sheetName);
                }
            }
        }
        
        await syncAtendimentos(unidade);
        console.log(`[Sync] ${unidade.nome} ENDED SYNC `);
    } else {
        throw 'Ocorreu um erro ao sincronizar a unidade, tente novamente';
    }
}

/**
 * @deprecated
 * Sincronização parcial da unidade
 * 
 * Atualiza pelo menos os 10 ultimos idosos de um ou todos os vigilantes e pelo menos os 10 ultimos atendimentos,
 * além de inserir no banco novos registros que por ventura tenham sido adicionados nas planilhas desde a sincronização anterior.
 * 
 * Obs: por se tratar de uma sincronização rápida, não apaga registros removidos, nem atualiza registros mais antigos que os 10 ultimos das planilhas.
 * Por isso podem surgir inconsistencias no banco em relação as planilhas. 
 * Por isso, o reset e resincronização completa do banco é efetuado uma vez por dia a partir das 22:00.
 * @param {*} idUnidade 
 * @param {*} nomeVigilante 
 */
const partialSyncUnidade = async (idUnidade, nomeVigilante) => {
    const unidade = await unidadeService.findById(idUnidade);
    
    if(unidade) {
        console.log(`[Sync] ${unidade.nome} STARTING SYNC `);
        console.log(unidade);

        // const sheets = await prepareDataToSync(unidade);
        const sheet = unidade.vigilantes.find(element => element.nome == nomeVigilante);//FIXIT  não funciona caso tenha mais de um vigilante chamado A Substituir...
        if(sheet) {// se existe o node do vigilante, atualiza apenas os idosos do vigilante
            const sheets = [];
            sheets.push({ sheetName: sheet.sheetName });

            //TODO sheet contem apenas um valor, não sendo necessario um loop
            for(let i = 0; i < sheets.length; i++) {
                if(sheets[i].sheetName.startsWith("Vigilante")) {
                    const countIdosos = await idosoService.countByVigilante(unidade.collectionPrefix, nomeVigilante);
                    console.log('countIdosos ', countIdosos)
                    const rows = await syncIdososBySheetName(unidade, sheets[i].sheetName, countIdosos);
                    if(rows == 0) {// se não encontrou nenhuma linha, tenta mais uma vez
                        await syncIdososBySheetName(unidade, sheets[i].sheetName, countIdosos);
                    }
                }
            }
        } else {//se o nome do vigilante não foi econtrado, atualiza os idosos de todos os vigilantes
            console.log(`[Sync] vigilante ${nomeVigilante} não encontrado. Sincronizando todos os vigilantes...`)
            const sheets = await prepareDataToSync(unidade);
            
            for(let i = 0; i < sheets.length; i++) {
                if(sheets[i].sheetName.startsWith("Vigilante")) {
                    const sheet = unidade.vigilantes.find(element => element.sheetName == sheets[i].sheetName);
                    const countIdosos = await idosoService.countByVigilante(unidade.collectionPrefix, sheet.nome);
                    const rows = await syncIdososBySheetName(unidade, sheets[i].sheetName, countIdosos);
                    if(rows == 0) {// se não encontrou nenhuma linha, tenta mais uma vez
                        await syncIdososBySheetName(unidade, sheets[i].sheetName, countIdosos);
                    }
                }
            }
            
        }

        const countAtendimentos = await atendimentoService.getEstatisticasByIdoso(unidade.collectionPrefix);
        await syncAtendimentos(unidade, countAtendimentos);

        console.log(`[Sync] ${unidade.nome} ENDED SYNC `);
    } else {
        throw 'Ocorreu um erro ao sincronizar a unidade, tente novamente';
    }
}

/**
 * Apaga os bancos de dados da unidade
 * @param {*} data 
 */
const resetUnidade = async (idUnidade) => {
    const unidade = await unidadeService.findById(idUnidade);
    
    if(unidade) {
        console.log(`[Sync] ${unidade.nome} RESETING `);
        console.log(unidade);

        unidade.vigilantes = [];
        unidade.lastSyncDate = null;

        await unidadeService.replaceOne(unidade);

        await idosoService.deleteAll(unidade);

        await atendimentoService.deleteAll(unidade);
    } else {
        throw 'Ocorreu um erro ao sincronizar a unidade, tente novamente';
    }
}


/**
 * Encontra o sheetName (nome das abas) que devem ser lidas na planilha
 * Procura essa informação da API do google Sheet (a api não conta o número de linhas preenchidas, e sim o numero máximo de linhas no grid, então é uma estimativa com folga)
 * @param {*} unidade 
 */
const prepareDataToSync = async (unidade) => {
    const sheetsToSync = [];
    try {
        const spreadSheetProperties = await sheetsApi.getProperties(unidade.idPlanilhaGerenciamento);

        for(let i = 0; i < spreadSheetProperties.sheets.length; i++) {
            const sheetName = spreadSheetProperties.sheets[i].properties.title;
            if(sheetName.startsWith("Vigilante ") || sheetName.startsWith("Respostas")){
                sheetsToSync.push({
                    sheetName, 
                    rowCount: spreadSheetProperties.sheets[i].properties.gridProperties.rowCount,// não utilizado
                })
            }
        }
        
    } catch(err) {
        console.log(err);
    } finally {
        console.log(sheetsToSync);
        console.log(`[Sync] ${sheetsToSync.length} sheets found`);
        return sheetsToSync;
    }
}

/**
 * Atualiza pelo menos os 10 ultimos registros já cadastrados no banco, e insere os novos registros (se houver)
 */
const syncIdososBySheetName = async (unidade, sheetName, total) => {
    const idososPorVigilantes = [];
    // let indexIdosos = 1; //unidade.sync[vigilanteIndex].indexed;
    // let rowsInserted = null;//@deprecated
    const lastIndexSynced = total && (total - 10 >= 1) ? total - 10 : 1;// coloca uma margem de segurança, para atualizar os 10 ultimos 
    const firstIndex = lastIndexSynced + 1;//2
    const lastIndex = '';//limit ? lastIndexSynced + limit : '';//''
    let vigilanteNome = '';
    console.log(`[Sync] Reading spreadsheet ${unidade.idPlanilhaGerenciamento} '${sheetName}'!A${firstIndex}:N${lastIndex}`);
    const rows = await sheetsApi.read(unidade.idPlanilhaGerenciamento, `'${sheetName}'!A${firstIndex}:N${lastIndex}`);
    rows.forEach((item, index) => {
        if(item[1]) {//se o idoso tem nome
            vigilanteNome = item[0];
            idososPorVigilantes.push({
                row: `${unidade.collectionPrefix}-'${sheetName}'!A${firstIndex + index}:N${firstIndex + index}`,
                unidade: unidade.nome,
                dataNascimento: '',
                nome: item[1],
                nomeLower: item[1].toLowerCase(),
                telefone1: item[2],
                telefone2: item[3],
                agenteSaude: item[4],
                vigilante: item[0],
                anotacoes: item[13],
                // TODO deprecated?
                // stats: {
                //     qtdAtendimentosEfetuados: 0,
                //     qtdAtendimentosNaoEfetuados: 0,
                //     ultimoAtendimento: null,
                //     ultimaEscala: null,
                // },
                // score: 0,
                // epidemiologia: null,
            });
        }
    });
    if(idososPorVigilantes.length) {
        console.log('[Sync] Readed spreadsheet ', unidade.idPlanilhaGerenciamento , ` '${sheetName}'!A${firstIndex}:N${lastIndexSynced + idososPorVigilantes.length}`);

        //insere os idosos no banco
        // let j = 0;
        // for(; j < idososPorVigilantes.length; j++) {
        //     const resultInsertMany = await idosoService.updateOne(unidade.collectionPrefix, idososPorVigilantes[j]);
        // }
        await idosoService.bulkUpdateOne(unidade.collectionPrefix, idososPorVigilantes);
    } else {
        console.log('[Sync] Readed spreadsheet ', unidade.idPlanilhaGerenciamento , ` 0 rows found!`);
    }
            
            
    
    // unidade.sync[vigilanteIndex].indexed = indexIdosos;//talvez essa indexação parcial seja necessária no futuro, mas atualmente, todas as sincronizações são totais, não sendo necessário armazenar essas informações
    //atualiza lista de vigilantes da unidade
    const vigilanteIndex = +sheetName.slice(-1);
    if(unidade.vigilantes[vigilanteIndex - 1]) {
        unidade.vigilantes[vigilanteIndex - 1].nome = vigilanteNome;
    } else {
        //atualmente, o campo usuarioId não está sendo utilizado
        unidade.vigilantes[vigilanteIndex - 1] = { sheetName: `${sheetName}`, nome: vigilanteNome };
    }
    // console.log(unidade);
    const result = await unidadeService.replaceOne(unidade);
    // console.log(result.result.n)
    console.log(`[Sync] idososCollection updated`)
    // return rowsInserted;
    return idososPorVigilantes.length;
}

/**
 * Atualiza pelo menos os 10 ultimos registros já cadastrados no banco, e insere os novos registros (se houver)
 */
const syncAtendimentos = async (unidade, total) => {
    // let indexRespostas = 1; // unidade.sync[0].indexed;
    const lastIndexSynced = total && (total - 10 >= 1) ? total - 10 : 1;// coloca uma margem de segurança, para atualizar os 10 ultimos 
    const firstIndex = lastIndexSynced + 1;
    const lastIndex = '';//limit ? lastIndexSynced + limit : '';

    console.log(`[Sync] Reading spreadsheet ${unidade.idPlanilhaGerenciamento} 'Respostas'!A${firstIndex}:AI${lastIndex}`);
    const rows = await sheetsApi.read(unidade.idPlanilhaGerenciamento, `'Respostas'!A${firstIndex}:AI${lastIndex}`);
    const respostasArray = [];
    rows.forEach((item, index) => {
        //TODO criar uma função para conversao de datas string da planilha para Date
        // 13/05/2020 13:10:19
        var parts = item[0].split(' ');
        var data = parts[0].split('/');
        var hora = parts[1].split(':');

        // para converter a data de Iso para locale use : console.log(testDate.toLocaleString());

        respostasArray.push({
            row: `${unidade.collectionPrefix}-'Respostas'!A${firstIndex + index}:AI${firstIndex + index}`,
            data: new Date(`${data[2]}-${data[1]}-${data[0]}T${hora[0]}:${hora[1]}:${hora[2]}`),
            vigilante: item[1],
            dadosIniciais: {
                nome: item[2],
                nomeLower: item[2].toLowerCase(),
                atendeu: item[3] === 'Sim',
            },
            idade: item[4] === undefined ? null : +item[4],
            fonte: item[5] ? item[5] : '',
            sintomasIdoso: {
                apresentaSinomasGripeCOVID: item[6] !== undefined && item[6] !== 'Não',
                sintomas: item[6] === undefined || item[6] === 'Não' ? [] : item[6].split(',').map(s => s.trim()),
                outrosSintomas: item[7] === undefined || item[7] === 'Não' ? [] : item[7].split(',').map(s => s.trim()),
                detalhesAdicionais: item[8],
                haQuantosDiasIniciaram:  item[9] === undefined ? null : +item[9],
                contatoComCasoConfirmado: item[10] === 'Sim',
            },
            comorbidades: {
                condicoesSaude: item[11] === undefined || item[11] === 'Não' ? [] : item[11].split(',').map(s => s.trim()),
                medicacaoDiaria: {
                    deveTomar: item[12] !== undefined && item[12].startsWith('Sim'),
                    medicacoes: item[12] === undefined || item[12] === 'Não' || item[12] === 'Sim' ? [] : item[12].substring(4).split(',').map(s => s.trim()),
                    acessoMedicacao: item[13] === 'Sim, consigo adquirí-las',
                }
            },
            primeiroAtendimento: item[14] === 'Primeiro atendimento',
            epidemiologia: {
                higienizacaoMaos: item[15] === 'Sim',
                isolamento: {
                    saiDeCasa: item[16] === 'Sim',
                    frequencia: item[17] ? item[17] : '',
                    paraOnde: item[18] ? item[18].split(',').map(s => s.trim()) : [],
                },
                recebeApoioFamiliarOuAmigo: item[19] === 'Sim',
                visitas: {
                    recebeVisitas: item[20] !== undefined && item[20] !== 'O idoso não recebe visitas',
                    tomamCuidadosPrevencao: item[20] === 'Sim, e as visitas estão tomando os cuidados de prevenção',
                },
                qtdComodosCasa:  item[21] === undefined ? null : +item[21],
                realizaAtividadePrazerosa: item[22] === 'Sim',
            },
            qtdAcompanhantesDomicilio: item[23] === 'Somente o idoso' ? 0 : ( item[23] === undefined ? null : +item[23]),
            sintomasDomicilio: item[24] === undefined || item[24] === 'Não' || item[24].trim() === '' ? [] : item[24].split(',').map(s => s.trim()),
            habitosDomiciliaresAcompanhantes: {
                saiDeCasa: item[25] === 'Sim',
                higienizacaoMaos: item[26] === 'Sim',
                compartilhamentoUtensilios: item[27] === 'Sim',
                usoMascara: item[28] === 'Sim',
            },
            vulnerabilidades: {
                convivioFamilia: item[29] ? item[29] : '',
                alimentar: item[30] === 'Sim',
                financeira: item[31] === 'Sim',
                violencia: item[32] === 'Sim',
                observacoes: item[33] ? item[33] : '',
            },
            duracaoChamada: item[34] ? item[34] : '',
        });

    });

    const atendimentosArray = respostasArray.map(resposta => {
        return {
            fichaVigilancia: resposta,
            escalas : calcularEscalas(resposta),
        }
    });

    // indexRespostas = lastIndexSynced + atendimentosArray.length;
    if(atendimentosArray.length) {
        console.log('[Sync] Readed spreadsheet ', unidade.idPlanilhaGerenciamento , ` 'Respostas'!A${firstIndex}:AI${lastIndexSynced + atendimentosArray.length}`);
        
        // let i = null;
        // for(; i < atendimentosArray.length; i++) {
        //     const resultUpsert = await atendimentoService.replaceOne(unidade.collectionPrefix, atendimentosArray[i]);
        // }
        await atendimentoService.bulkReplaceOne(unidade.collectionPrefix, atendimentosArray);
        console.log(`[Sync] atendimentosCollection updated`);

        await atendimentoService.aggregateEscalas(unidade.collectionPrefix);
        console.log(`[Sync] ultimasEscalasCollection updated`);

        await atendimentoService.aggregateUltimosAtendimentos(unidade.collectionPrefix);
        console.log(`[Sync] ultimosAtendimentosCollection updated`);

        // unidade.sync[0].indexed = indexRespostas;
        unidade.lastSyncDate = new Date();
        await unidadeService.replaceOne(unidade);
    } else {
        console.log('[Sync] Readed spreadsheet ', unidade.idPlanilhaGerenciamento , ` 0 rows found`);
        unidade.lastSyncDate = new Date();
        await unidadeService.replaceOne(unidade);
    }
}

module.exports = { importFromPlanilhaUnidade, resetUnidade, partialSyncUnidade }