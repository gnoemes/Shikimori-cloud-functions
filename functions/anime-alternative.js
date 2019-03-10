const express = require('express');
const app = express();
const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');

app.get('/translation/:translationId', async (req, res) => {

  if (typeof req.params.translationId == 'undefined') {
    res.status(400).send("Translation id is required");
    return res
  }

  const url = 'https://smotretanime.ru/api/translations/' + req.params.translationId;
  const options = {
    uri: url,
    json: true
  };

  let videoResponse;

  rp(options)
    .then((response) => {
      console.log(response);

      videoResponse = ({
        animeId: response.data.series.myAnimeListId,
        episodeId: response.data.episode.episodeInt,
        player : response.data.embedUrl,
        hosting: "smotretanime",
        tracks: [({quality : "unknown", url : response.data.embedUrl})]
      });

      res.status(200).json(videoResponse);
      return res
    }).catch((err) => {
      console.error(err);
      res.status(404).json(err)
    });
});

app.get('/:animeId/:episodeId/translations', async (req, res) => {
  const availableParams = ["fandub", "subtitles", "raw", "all"];
  if (availableParams.indexOf(req.query.type) === -1) {
    res.status(400).send("TYPE must be one of " + availableParams);
    return res
  }

  const translationType = convertTranslation(req.query.type);

  const query = '?episodeId=' + req.params.episodeId + "&type=" + translationType;
  const url = 'https://smotretanime.ru/api/translations' + query;
  const options = {
    uri: url,
    json: true
  };

  rp(options)
    .then((response) => {
      console.log(response);

      const translations = [];

      response.data
        .forEach(elem => {
          console.log(elem);
          translations.push(({
            id: elem.id,
            animeId: req.params.animeId,
            episodeId: req.params.episodeId,
            type: req.query.type,
            quality: elem.qualityType,
            hosting: "smotretanime",
            author: elem.authorsSummary,
            episodesSize: elem.series.numberOfEpisodes
          }));
        });


      res.status(200).json(translations);
      return res
    }).catch((err) => {
      console.error(err);
      res.status(404).json(err)
    });
});

app.get('/:animeId/series', async (req, res) => {
  const query = '?myAnimeListId=' + req.params.animeId;
  const url = 'https://smotretanime.ru/api/series' + query;
  const options = {
    uri: url,
    json: true
  };

  rp(options)
    .then((series) => {

      const episodes = [];

      if (typeof series.data[0].episodes !== 'undefined') {
        series.data[0].episodes
          .filter(elem =>
            (elem.episodeType === "tv" || elem.episodeType) &&
            elem.episodeFull.indexOf("OVA") === -1 &&
            elem.episodeFull.indexOf("Special") === -1 &&
            elem.episodeFull.indexOf("Movie") === -1 &&
            elem.episodeFull.indexOf("ONA") === -1
          )
          .forEach(elem => {
            episodes.push(({
              id: elem.id,
              index: parseInt(elem.episodeInt),
              animeId: req.params.animeId,
              translations: [],
              rawHostings: "smotretanime",
              videoHostings: ["smotretanime"]
            }));
          });
      }

      res.status(200).json(episodes);
      return res
    }).catch((err) => {
      console.error(err);
      res.status(404).json(err)
    });
});

function convertTranslation(type) {
  if (type === "fandub") {
    return "voiceRu"
  } else if (type === "subtitles") {
    return "subRu"
  } else {
    return type
  }
}

module.exports = app;
