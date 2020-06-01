var express = require('express');
var path = require('path');
var app = express();

var port = process.env.PORT || 3000;

app.get('/', function (req, res) {
    res.send('Hello World!');
});
                                
app.listen(port, function () {
    console.log('api-frenteprevencaocovidrn-orb-br listening on port %s', port);
});