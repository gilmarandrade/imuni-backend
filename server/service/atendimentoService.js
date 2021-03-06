// const { calcularEscalas } = require('../config/helpers');

//TODO usar configuração do banco
 
const ObjectId = require('mongodb').ObjectID;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = 'atendimentos';


const findAllByIdoso = async (collectionPrefix, nomeLower) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if (err) { return reject(err); }

            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

            collection.find({ "fichaVigilancia.dadosIniciais.nomeLower" : nomeLower }, {
                projection: {
                    _id: 1,
                    "fichaVigilancia.data": 1,
                    "fichaVigilancia.dadosIniciais.atendeu": 1,
                    "escalas": 1,
                    "fichaVigilancia.vigilante": 1,
                    "fichaVigilancia.duracaoChamada": 1,
                }
            }).sort({"fichaVigilancia.data":-1}).toArray(function(err, result) {
                if (err) 
                    reject(err);
                else
                    resolve(result);
            });
        });

    });

    return promise;
}

const findAll = async (collectionPrefix) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

            collection.find().toArray(function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

    });

    return promise;
}


const deleteCollection = async (collectionName) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            
            const collection = db.collection(collectionName);

            collection.deleteMany({}, function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    resolve(result.result.n);
                }
            });
        });

    });

    return promise;
}

const deleteAll = async (unidade) => {
    await deleteCollection(`${unidade.collectionPrefix}.${collectionName}`);
    await deleteCollection(`${unidade.collectionPrefix}.ultimasEscalas`);
    await deleteCollection(`${unidade.collectionPrefix}.ultimosAtendimentos`);
}

const insertAll = async (collectionPrefix, array) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

            collection.insertMany(array, function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    resolve(result.result.n);
                }
            });
        });

    });

    return promise;
}

const bulkReplaceOne = async (collectionPrefix, atendimentosArray) => {
    const addToBatch = (batch, item) => {
        batch.find({ "fichaVigilancia.row": item.fichaVigilancia.row }).upsert().replaceOne(item);
    };

    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

            // Initialize the unordered Batch
            const batch = collection.initializeUnorderedBulkOp({useLegacyOps: true});
            for(let i = 0; i < atendimentosArray.length; i++) {
                addToBatch(batch, atendimentosArray[i]);
            };

            // Execute the operations
            batch.execute(function(err, result) {
                // console.log(result)
                if(err) {
                    reject(err);
                } else {
                    resolve(result.ok);
                }
            });

            // collection.replaceOne({ "fichaVigilancia.row": atendimento.fichaVigilancia.row }, atendimento, { upsert: true }, function(err, result) {
            //     if(err) {
            //         reject(err);
            //     } else {
            //         resolve(result.result.n);
            //     }
            // });
        });

    });

    return promise;
}

const replaceOne = async (collectionPrefix, atendimento) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

            collection.replaceOne({ "fichaVigilancia.row": atendimento.fichaVigilancia.row }, atendimento, { upsert: true }, function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    resolve(result.result.n);
                }
            });
        });

    });

    return promise;
}

/**
 * Cria a collection auxiliar que contém a ultima escala calculada para cada idoso que possui escala calculada (ou seja, que já teve pelo menos 1 atendimento efetuado)
 * @param {*} collectionPrefix 
 */
const aggregateEscalas = async (collectionPrefix) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.idosos`);

            const atendimentosCollection = `${collectionPrefix}.atendimentos`;
            const ultimasEscalasCollection = `${collectionPrefix}.ultimasEscalas`;

            //ultimo atendimento efetuado (ligação atendida)
            collection.aggregate([
                    {
                        $lookup:
                        {
                            from: atendimentosCollection,
                            localField: 'nome',
                            foreignField: 'fichaVigilancia.dadosIniciais.nome',
                            as: 'atendimentos'
                        }
                    },
                    { $unwind: "$atendimentos" },
                    { $match: { "atendimentos.fichaVigilancia.dadosIniciais.atendeu": true } },
                    { $sort : { nome : 1, 'atendimentos.fichaVigilancia.data': -1 } },
                    {
                        $group:
                        {
                            _id: "$_id",
                            data: { $first: "$atendimentos.fichaVigilancia.data" },
                            nome: { $first: "$atendimentos.fichaVigilancia.dadosIniciais.nome" },
                            score: { $first: "$atendimentos.escalas.scoreOrdenacao" },
                            vulnerabilidade: { $first: "$atendimentos.escalas.vulnerabilidade"  },
                            epidemiologica: { $first: "$atendimentos.escalas.epidemiologica"  },
                            riscoContagio: { $first: "$atendimentos.escalas.riscoContagio"  },
                            dataProximoAtendimento: { $first: "$atendimentos.escalas.dataProximoAtendimento"  },
                            qtdAtendimentosEfetuados: { $sum: 1 },
                            epidemiologia: { $last: "$atendimentos.fichaVigilancia.epidemiologia"  },
                        }
                    },
                    { $out: ultimasEscalasCollection },
                ]).toArray(function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    // console.log(result);
                    resolve(result);
                }
            });
        });

    });

    return promise;
}

/**
 * Cria a collection auxiliar que contém o ultimo atendimento para cada idoso (ligação atendida ou não)
 * @param {*} collectionPrefix 
 */
const aggregateUltimosAtendimentos = async (collectionPrefix) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.idosos`);

            const atendimentosCollection = `${collectionPrefix}.atendimentos`;
            const ultimosAtendimentosCollection = `${collectionPrefix}.ultimosAtendimentos`;

            //ultimo atendimento (ligação atendida ou não)
            collection.aggregate([
                    {
                        $lookup:
                        {
                            from: atendimentosCollection,
                            localField: 'nome',
                            foreignField: 'fichaVigilancia.dadosIniciais.nome',
                            as: 'atendimentos'
                        }
                    },
                    { $unwind: "$atendimentos" },
                    // { $match: { "atendimentos.fichaVigilancia.dadosIniciais.atendeu": true } },
                    { $sort : { nome : 1, 'atendimentos.fichaVigilancia.data': -1 } },
                    {
                        $group:
                        {
                            _id: "$_id",
                            data: { $first: "$atendimentos.fichaVigilancia.data" },
                            efetuado: { $first: "$atendimentos.fichaVigilancia.dadosIniciais.atendeu" },
                            nome: { $first: "$atendimentos.fichaVigilancia.dadosIniciais.nome" },
                            qtdTentativas: { $sum: 1 },
                        }
                    },
                    { $out: ultimosAtendimentosCollection },
                ]).toArray(function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    // console.log(result);
                    resolve(result);
                }
            });
        });

    });

    return promise;
}


const findById = async (collectionPrefix, id) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

            collection.findOne({ _id: ObjectId(id) }, function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

    });

    return promise;
}

/**
 * Conta a quantidade de registros
 * @param {*} collectionPrefix 
 */
const count = async (collectionPrefix) => {
    const promise = new Promise( (resolve, reject) => {
        var MongoClient = require( 'mongodb' ).MongoClient;
        MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
            if(err) return reject(err);
            const db = client.db(dbName);
            const collection = db.collection(`${collectionPrefix}.${collectionName}`);

    
            collection.aggregate([
                // { $match: { vigilante: nomeVigilante } },
                // {
                //     $group: {
                //        _id: null,
                //        count: { $sum: 1 }
                //     }
                // }
                {
                    $count: "total"
                }
            ]).toArray(function(err, result) {
                if(err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });

    });

    return promise; 
}

module.exports = {  findAll, deleteAll, insertAll, findAllByIdoso, replaceOne, bulkReplaceOne, aggregateEscalas, aggregateUltimosAtendimentos, findById, count };