require('dotenv').config();
const { google } = require('googleapis'); 
const sheets = google.sheets('v4');
const getGoogleClient = require('../config/google-client');


module.exports = app => {

    /**
     * Método genérico para ler qualquer aba de uma planilha
     */
    const get = async (req, res) => {
        const googleClient = await getGoogleClient();
        sheets.spreadsheets.values.get({
            auth: googleClient,
            spreadsheetId: req.params.id,
            range: `'${req.params.sheetName}'!${req.params.range}`,
        }, (err, apiRes) => {
            if (err) {
            console.error('The Google API returned an error.');
            return res.status(400).json(err);
            }
            const rows = apiRes.data.values || [];
            return res.json(rows);
        });
    };


    const vigilantes = async (req, res) => {
        const spreadsheetId = req.params.idPlanilha;

        const googleClient = await getGoogleClient();
        sheets.spreadsheets.values.get({
            auth: googleClient,
            spreadsheetId: spreadsheetId,
            range: `'Status Atendimentos'!A2:A`,
        }, (err, apiRes) => {
            if (err) {
            console.error('The Google API returned an error.');
            return res.status(400).json(err);
            }
            const rows = apiRes.data.values || [];
            const vigilantes = {};
            rows.forEach((item, index) => {
                vigilantes[item[0]] = { nome: item[0]};
            });

            const arrayVigilantes = Object.values(vigilantes);
            arrayVigilantes.forEach((item, index) => {
                item.index = index + 1;
            });
            return res.json(arrayVigilantes);
        });
    }

    const idososByVigilante = async (req, res) => {
        const spreadsheetId = req.params.idPlanilha;
        const indexVigilante = req.params.indexVigilante;
        console.log(indexVigilante)

        const googleClient = await getGoogleClient();
        sheets.spreadsheets.values.get({
            auth: googleClient,
            spreadsheetId: spreadsheetId,
            range: `'Vigilante ${indexVigilante}'!A2:M`,
        }, (err, apiRes) => {
            if (err) {
            console.error('The Google API returned an error.');
            return res.status(400).json(err);
            }
            const rows = apiRes.data.values || [];
            const idosos = [];
            rows.forEach((item, index) => {
                if(item[1] !== undefined && item[1] !== "") {
                    idosos.push({
                        vigilante: item[0],
                        nome: item[1],
                        telefone1: item[2],
                        telefone2: item[3],
                        agenteSaude: item[4],
                        tentativas: item[5],
                        atendimentosEfetuados: item[6],
                        escalaVulnerabilidade: item[7],
                        escalaEpidemiologica: item[8],
                        escalaRiscoContagio: item[9],
                        dataUltimoAtendimento: item[10],
                        horaUltimoAtendimento: item[11],
                        sugestaoProximoAtendimento: item[12],
                    });
                }
            });

            console.log(idosos.length)
            return res.json(idosos);
        });

    }

    return { vigilantes, idososByVigilante };
};