const functions = require('firebase-functions');

const express = require('express');
const app = express();

const animeAltApi = require('./anime-alternative');

const firebase = require('firebase-admin');
firebase.initializeApp(functions.config().firebase);
module.exports.firestore = firebase.firestore();

const animeApi = require('./anime');

app.use('/anime/alternative', animeAltApi);

app.use('/anime', animeApi);

app.listen('8081')

exports.api = functions.https.onRequest(app);
