module.exports = app => {

const ObjectId = require('mongodb').ObjectID;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = 'unidades';
const MongoClient = require( 'mongodb' ).MongoClient;

/**
 * Encontra todos os registros da collection, inclusive os que estão _isDeleted true
 * @deprecated
 */
const findAll = async () => {
    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            return await collection.find().toArray();

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();

    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
            
    //         const collection = db.collection(collectionName);

    //         collection.find().toArray(function(err, result) {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result);
    //             }
    //         });
    //     });

    // });

    // return promise;
}

/**
 * Encontra apenas os registros da collection que estão _isDeleted false
 */
//TODO esse nome de método é ambiguo. Dá a entender que está buscando unidades com status ATIVOS, quando na verdade esta buscando todas as unidades não deletadas
const findAtivos = async () => {
    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            return await collection.find({ _isDeleted: false}).sort({nome: 1}).toArray();

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();

    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
            
    //         const collection = db.collection(collectionName);

    //         collection.find({ _isDeleted: false}).toArray(function(err, result) {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result);
    //             }
    //         });
    //     });

    // });

    // return promise;
}

/**
 * Insere ou atualiza uma unidade
 * @param {*} unidade 
 */
const upsertOne = async (unidade) => {
    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            const result = await collection.updateOne({ _id: ObjectId(unidade._id) }, {
                $set: { 
                    nome: unidade.nome,
                    distrito: unidade.distrito,
                    status: unidade.status,
                    _isDeleted: unidade._isDeleted,
                    /* TODO DEPRECATED ATTRIBUTES*/
                    // planilhaIdosos: unidade.planilhaIdosos,
                    // planilhaGerenciamento: unidade.planilhaGerenciamento,
                    // fichaVigilancia: unidade.fichaVigilancia,
                    // idPlanilhaIdosos: unidade.idPlanilhaIdosos,
                    // idPlanilhaGerenciamento: unidade.idPlanilhaGerenciamento,
                    // idFichaVigilancia: unidade.idFichaVigilancia,
                    // collectionPrefix: unidade.collectionPrefix,
                    // ativo: unidade.ativo,
                    // autoSync: unidade.autoSync,
                    // lastSyncDate: unidade.lastSyncDate,
                    // vigilantes: unidade.vigilantes,
                }
            }, { upsert: true });

            if(result) {
                return result.upsertedId === null ? unidade._id : result.upsertedId._id;
            }
            return null;

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();

    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
    //         const collection = db.collection(collectionName);

    //         collection.updateOne({ _id: ObjectId(unidade._id) }, {
    //             $set: { 
    //                 nome: unidade.nome,
    //                 distrito: unidade.distrito,
    //                 status: unidade.status,
    //                 _isDeleted: unidade._isDeleted,
    //                 /* TODO DEPRECATED ATTRIBUTES*/
    //                 // planilhaIdosos: unidade.planilhaIdosos,
    //                 // planilhaGerenciamento: unidade.planilhaGerenciamento,
    //                 // fichaVigilancia: unidade.fichaVigilancia,
    //                 // idPlanilhaIdosos: unidade.idPlanilhaIdosos,
    //                 // idPlanilhaGerenciamento: unidade.idPlanilhaGerenciamento,
    //                 // idFichaVigilancia: unidade.idFichaVigilancia,
    //                 // collectionPrefix: unidade.collectionPrefix,
    //                 // ativo: unidade.ativo,
    //                 // autoSync: unidade.autoSync,
    //                 // lastSyncDate: unidade.lastSyncDate,
    //                 // vigilantes: unidade.vigilantes,
    //             }
    //         }, { upsert: true }, function(err, result) {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result.upsertedId === null ? unidade._id : result.upsertedId._id);
    //             }
    //         });
    //     });

    // });

    // return promise;
}

/**
 * Insere ou atualiza um array de unidades
 * @deprecated
 * @param {*} array 
 */
const bulkUpdateOne = async (array) => {

    const addToBatch = (batch, item) => {
        batch.find({ _id: ObjectId(item._id) }).upsert().updateOne({
            $set: { 
                nome: item.nome,
                distrito: item.distrito,
                _isDeleted: item._isDeleted,
                /* TODO DEPRECATED ATTRIBUTES*/
                planilhaIdosos: item.planilhaIdosos,
                planilhaGerenciamento: item.planilhaGerenciamento,
                fichaVigilancia: item.fichaVigilancia,
                idPlanilhaIdosos: item.idPlanilhaIdosos,
                idPlanilhaGerenciamento: item.idPlanilhaGerenciamento,
                idFichaVigilancia: item.idFichaVigilancia,
                collectionPrefix: item.collectionPrefix,
                ativo: item.ativo,
                autoSync: item.autoSync,
                lastSyncDate: item.lastSyncDate,
                vigilantes: item.vigilantes,
            }
        });
    };

    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            // Initialize the unordered Batch
            const batch = collection.initializeUnorderedBulkOp({useLegacyOps: true});
            for(let i = 0; i < array.length; i++) {
                addToBatch(batch, array[i]);
            };

            const result = batch.execute();

            return result;

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();
    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
    //         const collection = db.collection(collectionName);

    //         // Initialize the unordered Batch
    //         const batch = collection.initializeUnorderedBulkOp({useLegacyOps: true});
    //         for(let i = 0; i < array.length; i++) {
    //             addToBatch(batch, array[i]);
    //         };

    //         // Execute the operations
    //         batch.execute(function(err, result) {
    //             // console.log(result)
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result.ok);
    //             }
               
    //         });
    //     });

    // });

    // return promise;
}

/**
 * Encontra uma unidade pelo id 
 * @param {*} id 
 */
const getById = async (id) => {
    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            return await collection.findOne({ _id: ObjectId(id) });

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();
    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
            
    //         const collection = db.collection(collectionName);

    //         collection.findOne({ _id: ObjectId(id) }, function(err, result) {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result);
    //             }
    //         });
    //     });

    // });

    // return promise;
}


/**
 * Exclusão lógica de registro
 * 
 * Seta _isDeleted para true
 * @param {*} id
 */
const softDeleteOne = async (id) => {
    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            const result = await collection.updateOne({ _id: ObjectId(id) }, {
                $set: {
                    _isDeleted: true
                }
            });

            return id;

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();

    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
    //         const collection = db.collection(collectionName);

    //         collection.updateOne({ _id: ObjectId(id) }, {
    //             $set: {
    //                 _isDeleted: true
    //             }
    //         }, function(err, result) {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(id);
    //             }
    //         });
    //     });

    // });

    // return promise;
}

/**
 * Insere um item
 * @param {*} item 
 */
// TODO todos os inserts e updates do sistema deveriam retornar o id
const insertOne = async (item) => {
    // Create a new MongoClient
    const client = new MongoClient(process.env.MONGO_URIS);

    async function run() {
        try {
            // Connect the client to the server
            await client.connect();
            const db = await client.db(dbName);
            const collection = db.collection(collectionName);

            const result = await collection.insertOne(item);
            return result ? result.insertedId : null;

        } finally {
            // Ensures that the client will close when you finish/error
            await client.close();
             
        }
    }
    return run();

    // const promise = new Promise( (resolve, reject) => {
    //     var MongoClient = require( 'mongodb' ).MongoClient;
    //     MongoClient.connect( process.env.MONGO_URIS, { useUnifiedTopology: false }, function( err, client ) {
    //         if(err) return reject(err);
    //         const db = client.db(dbName);
    //         const collection = db.collection(collectionName);

    //         collection.insertOne(item, function(err, result) {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(result.insertedId);
    //             }
    //         });
    //     });

    // });

    // return promise;
}

    return { findAll, findAtivos, upsertOne, bulkUpdateOne, getById, softDeleteOne, insertOne };
}