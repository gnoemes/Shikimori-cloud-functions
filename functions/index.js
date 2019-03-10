const functions = require('firebase-functions');

const express = require('express');
const app = express();
const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');
const animeApi = require('./anime');
const animeAltApi = require('./anime-alternative');

var firebase = require('firebase-admin');
firebase.initializeApp(functions.config().firebase);

app.use('/anime/alternative', animeAltApi);

app.use('/anime', animeApi);

app.listen('8081');

exports.api = functions.https.onRequest(app);
