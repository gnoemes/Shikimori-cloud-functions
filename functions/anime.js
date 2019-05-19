const express = require('express');
const app = express();
const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');
const videoParser = require('./video-parsing');
const cookieJar = request.jar();
const functions = require('firebase-functions');
const cookie = '_kawai_session=UFd5Ly9JcEIxSit0UEJpbjg3cm9YUUpZTk9ZUU9jUUQ0WXZzanAzODlUOUtTMS9FdDZ4SHRGYkxmemYzUHhDQ2pyZktiRUZEZlg4WXIzU09yTEJZWnQ4cmVlTHFFZUt3cHlFTjk3NFJ3YmYwUTVqa1ZsMG1hcFpQaUFLdmJYZGQ2aEVqUkw4MU5qU3drdTRqTzhRTE4rRjlXQ2MxcUJKbDNMOWJsaXM3Z0craFNmeUpTR1VBeThRSDJUNlArV3BlTkFKK2JpRGlyM3hrMGJuWElzK1VhM0hqSVFUbkZsNjRZWlg1T05XR083bEVLc2l3ZG1oZVJmSzNRZkZwS0h4VFc5b3d5Qm5WVU5WbTc4VzhnSXl4aWRqVURSdmVoL2RLTHpocFlWNEl5cFE9LS0zRC9IdXNPK1hPTUtSM2tkU2VzRDhnPT0%3D--086ce10560a6686351b45493b9a076228a1ab2b2; domain=.shikimori.org; path=/; expires=Tue, 09 Jan 2024 11:05:19 -0000; secure; HttpOnly';
// https://del.dog/ejibujajif

cookieJar.setCookie(cookie, 'https://shikimori.org', function(err, cookie) {
  console.error('err: ' + err);
  console.log('cookie: ' + cookie);
});

//TODO refactor
app.post('/player', async (req, res) => {
  const _include_headers = function(body, response) {
    return {
      'response': response,
      'data': body
    };
  };

  let playerUrl = req.body.playerUrl
  let response;

  const options = {
    uri: playerUrl,
    transform: _include_headers
  }

  rp(options)
    .then((data) => {
      const q = videoParser.getTracks(playerUrl, cheerio.load(data.data));
      console.log(q);
      return q;
    }).then((tracks) => {
      response = ({
        animeId: req.body.animeId,
        episodeId: req.body.episodeId,
        player: playerUrl,
        hosting: videoParser.getHosting(playerUrl),
        tracks: tracks
      });

      if (playerUrl.indexOf("sibnet.ru") !== -1) {
        const _handleRedirect = function(err, res) {
          if (err !== null) {
            console.error(err);
          }
          return "https:" + res.headers.location.replace("/manifest.mpd", ".mp4")
        };
        const options = {
          uri: tracks,
          followAllRedirects: false,
          followRedirect: false,
          simple: false,
          headers: {
            'Referer': playerUrl
          },
          transform: _handleRedirect
        };

        return rp(options)
      } else {
        return response
      }

    })
    .then((url) => {
      if (playerUrl.indexOf("sibnet.ru") !== -1) {
        const track = (({
          quality: "unknown",
          url: url
        }));

        response = ({
          animeId: req.body.animeId,
          episodeId: req.body.episodeId,
          player: playerUrl,
          hosting: "sibnet.ru",
          tracks: [track]
        })
      }

      res.status(200).json(response);
      return res
    })
    .catch((err) => {
      console.error(err);
      res.status(404).json(err);
      return res
    });
})

app.get('/:animeId/:episodeId/topic', async (req, res) => {
  const url = "https://play.shikimori.org/animes/a" + req.params.animeId + "/video_online/" + req.params.episodeId;
  const options = {
    uri: url,
    jar: cookieJar,
    headers: {
      'Referer': 'https://shikimori.org/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
    },
    transform: (body) => cheerio.load(body)
  };

  var topicId = -1;

  rp(options)
    .then(($) => {
      const TOPIC_QUERY = "div.b-topic";
      const FAYE_QUERY = "data-faye";

      const resultRaw = $(TOPIC_QUERY).attr(FAYE_QUERY);

      if (typeof resultRaw != 'undefined') {
        const result = parseInt(resultRaw.replace(/[\["topic\-\]]/g, ""));

        console.log(result);
        if (typeof result == 'number' && !isNaN(result)) {
          topicId = result
        }
      }

      if (topicId === -1) {
        res.status(404).json("topic not found");
        return res
      } else {
        res.status(200).json(({
          id: topicId
        }));
        return res
      }

    }).catch((err) => {
      console.error(err);
      res.status(404).json(err)
    });
});

app.get('/:animeId/:episodeId/video/:videoId*?', async (req, res) => {
  const availableParams = ["language", "kind", "author", "hosting", "raw"];

  let videoPart = "";
  if (typeof req.params.videoId !== 'undefined') {
    videoPart = "/" + req.params.videoId
  }

  const url = "https://play.shikimori.org/animes/a" + req.params.animeId + "/video_online/" + req.params.episodeId + videoPart;
  const options = {
    uri: url,
    jar: cookieJar,
    headers: {
      'Referer': 'https://shikimori.org/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
    },
    transform: (body) => cheerio.load(body)
  };
  for (let q of availableParams)
    cookieJar.setCookie("anime_video_" + q + "=" + req.query[q] + "; path=/; domain=.play.shikimori.org; Expires=Tue, 19 Jan 2038 03:14:07 GMT;",
      'https://play.shikimori.org',
      function(err) {
        if (err !== null) {
          console.error(err);
        }
      });
  const _include_headers = function(body, response) {
    return {
      'response': response,
      'data': body
    };
  };

  let playerUrl;
  let response;

  rp(options)
    .then(($) => {
      const URL_QUERY = "div.video-link a";
      const TITLE_QUERY = "a.b-link>span[itemprop]";

      playerUrl = $($(URL_QUERY).first()).attr('href');

      if (typeof playerUrl === 'undefined') {
        res.status(404).send();
        return res
      } else if (playerUrl.indexOf("http") === -1) {
        playerUrl = "http:" + playerUrl
      }

      return rp({
        uri: playerUrl,
        transform: _include_headers
      })
    })
    .then((data) => {
      const q = videoParser.getTracks(playerUrl, cheerio.load(data.data));
      console.log(q);
      return q;
    }).then((tracks) => {
      response = ({
        animeId: req.params.animeId,
        episodeId: req.params.episodeId,
        player: playerUrl,
        hosting: videoParser.getHosting(playerUrl),
        tracks: tracks
      });

      if (playerUrl.indexOf("sibnet.ru") !== -1 && req.query.hosting === "sibnet.ru") {
        const _handleRedirect = function(err, res) {
          if (err !== null && err !== '') {
            console.error(err);
          }
          return "https:" + res.headers.location.replace("/manifest.mpd", ".mp4")
        };
        const options = {
          uri: tracks,
          followAllRedirects: false,
          followRedirect: false,
          simple: false,
          headers: {
            'Referer': playerUrl
          },
          transform: _handleRedirect
        };

        return rp(options)
      } else {
        return response
      }

    })
    .then((url) => {
      if (playerUrl.indexOf("sibnet.ru") !== -1 && req.query.hosting === "sibnet.ru") {
        const track = (({
          quality: "unknown",
          url: url
        }));

        response = ({
          animeId: req.params.animeId,
          episodeId: req.params.episodeId,
          player: playerUrl,
          hosting: "sibnet",
          tracks: [track]
        })
      }

      res.status(200).json(response);
      return res
    })
    .catch((err) => {
      console.error(err);
      res.status(404).json(err);
      return res
    });
});

app.get('/:animeId/:episodeId/translations/', async (req, res) => {
  const availableParams = ["fandub", "subtitles", "raw", "all"];
  if (availableParams.indexOf(req.query.type) === -1) {
    res.status(400).send("TYPE must be one of " + availableParams);
    return res
  }

  const baseUrl = "https://play.shikimori.org/animes/a" + req.params.animeId + "/video_online/" + req.params.episodeId;

  const getTranslations = url => {
    const options = {
      uri: url,
      jar: cookieJar,
      headers: {
        'Referer': 'https://shikimori.org/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
      },
      transform: (body) => cheerio.load(body)
    };

    rp(options)
      .then(($) => {
        const ALL_QUERY = "div.video-variant-group[data-kind=%s]";
        const TRANSLATIONS_QUERY = "div.b-video_variant[data-video_id]";
        const VIDEO_ID_QUERY = "data-video_id";

        const REJECTED_QUERY = "rejected";
        const BROKEN_QUERY = "broken";
        const BANNED_QUERY = "banned_hosting";

        const VIDEO_QUALITY_QUERY = ".video-quality";
        const VIDEO_TYPE_QUERY = ".video-kind";
        const VIDEO_HOSTING_QUERY = ".video-hosting";
        const VIDEO_AUTHOR_QUERY = ".video-author";

        let translations = [],
          episodes = convertEpisodes($, req.params.animeId);

        if (req.params.episodeId > episodes.length) {
          res.status(404).send("There is only " + episodes.length + " episodes.");
          return res
        }

        let all = $(require('util').format(ALL_QUERY, req.query.type));
        $(TRANSLATIONS_QUERY, all)
          .each(function(i, elem) {
            const videoId = $(elem).attr(VIDEO_ID_QUERY);
            const rawQuality = $(VIDEO_QUALITY_QUERY, elem).attr('class');
            let quality = "tv";
            if (typeof rawQuality !== 'undefined' && rawQuality !== null) {
              quality = rawQuality.split(' ')[1]
            }
            const author = $(VIDEO_AUTHOR_QUERY, elem).text().trim();
            const hosting = $(VIDEO_HOSTING_QUERY, elem).text().trim();
            const type = $(VIDEO_TYPE_QUERY, elem).text().trim().toLowerCase();

            translations.push(({
              id: videoId,
              animeId: req.params.animeId,
              episodeId: req.params.episodeId,
              type: checkTranslationType(type),
              quality: quality,
              hosting: hosting,
              author: author,
              episodesSize: episodes.length
            }));
          });
        res.status(200).json(translations);
        return res
      })
      .catch((err) => {
        console.log(err.statusCode);
        if (url.indexOf("api") === -1 && err.statusCode === 429) {
          const apiKey = functions.config().scraper.key
          return getTranslations('http://api.scraperapi.com?api_key=apiKey&url=' + baseUrl);
        } else {
          console.error(err);
          res.status(400).json(err)
          return res;
        }
      });

  }
  return getTranslations(baseUrl);
});

app.get('/:animeId/series', async (req, res) => {
  const baseUrl = "https://play.shikimori.org/animes/a" + req.params.animeId + "/video_online";

  const getEpisodes = url => {
    const options = {
      uri: url,
      jar: cookieJar,
      headers: {
        'Referer': 'https://shikimori.org/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
      },
      transform: (body) => cheerio.load(body)
    };

    return rp(options)
      .then(($) => {
        const episodes = convertEpisodes($, req.params.animeId);
        console.log('EPISODES: ' + episodes.length);
        res.setHeader('content-type', 'application/json');
        res.json(episodes).status(200);
        return res;
      })
      .catch((err) => {
        console.log(err.statusCode);
        if (url.indexOf("api") === -1 && err.statusCode === 429) {
          const apiKey = functions.config().scraper.key
          return getEpisodes('http://api.scraperapi.com?api_key=apiKey&url=' + baseUrl);
        } else {
          console.error(err);
          res.status(400).json(err)
          return res;
        }
      });
  };
  return getEpisodes(baseUrl);
});

function checkTranslationType(type) {
  if (type == 'озвучка') {
    return 'fandub'
  } else if (type == 'субтитры') {
    return 'subtitles'
  } else if (type == 'оригинал') {
    return "raw"
  } else {
    return type
  }
}

function convertEpisodes($, animeId) {
  const ERROR_QUERY = "div.b-errors p";
  const EPISODES_QUERY = "div.c-anime_video_episodes>[data-episode],div.b-show_more-more>[data-episode]";
  const EPISODE_ID_QUERY = "data-episode";
  const EPISODE_TRANSLATIONS_QUERY = ".episode-kinds";
  const EPISODE_HOSTINGS_QUERY = ".episode-hostings";

  let episodes = [],
    kek = $(EPISODES_QUERY),
    html = kek.html();
  kek.each(function(i, elem) {
    const id = $(elem).attr(EPISODE_ID_QUERY);
    const translations = $(EPISODE_TRANSLATIONS_QUERY, elem)
      .text()
      .replace(" ", "")
      .split(",")
      .map(e => {
        return e.trim()
      })
      .map(checkTranslationType);

    const rawHostings = $(EPISODE_HOSTINGS_QUERY, elem).text();
    const videoHostings = rawHostings
      .replace(" ", "")
      .split(",")
      .map(e => {
        return e.trim()
      });

    episodes.push(({
      id: id,
      index: id,
      animeId: animeId,
      translations: translations,
      rawHostings: rawHostings,
      videoHostings: videoHostings
    }));
  });
  return episodes
}

module.exports = app;
