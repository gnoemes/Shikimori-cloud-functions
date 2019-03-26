const express = require('express');
const app = express();
const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');
const videoParser = require('./video-parsing');
const cookieJar = request.jar();

// https://del.dog/ejibujajif

syncUsers()
let proxyUsers = []

app.get('/:animeId/:episodeId/topic', async (req, res) => {
  let userIndex = updateCookies();

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

  increaseHighLoad(userIndex);

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
        decreaseHighLoad(userIndex);
        return res
      } else {
        res.status(200).json(({
          id: topicId
        }));
        decreaseHighLoad(userIndex);
        return res
      }

    }).catch((err) => {
      console.error(err);
      res.status(404).json(err)
      decreaseHighLoad(userIndex);
    });
});

app.get('/:animeId/:episodeId/video/:videoId*?', async (req, res) => {
  let userIndex = updateCookies();

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

  increaseHighLoad(userIndex);

  rp(options)
    .then(($) => {
      const URL_QUERY = "div.video-link a";
      const TITLE_QUERY = "a.b-link>span[itemprop]";

      playerUrl = $($(URL_QUERY).first()).attr('href');

      if (playerUrl.indexOf("http") === -1) {
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
      decreaseHighLoad(userIndex);
      return res
    })
    .catch((err) => {
      console.error(err);
      res.status(404).json(err);
      decreaseHighLoad(userIndex);
      return res
    });
});

app.get('/:animeId/:episodeId/translations/', async (req, res) => {
  const availableParams = ["fandub", "subtitles", "raw", "all"];
  if (availableParams.indexOf(req.query.type) === -1) {
    res.status(400).send("TYPE must be one of " + availableParams);
    return res
  }

  let userIndex = updateCookies();

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

  increaseHighLoad(userIndex);

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
            type: type,
            quality: quality,
            hosting: hosting,
            author: author,
            episodesSize: episodes.length
          }));
        });
      res.status(200).json(translations);
      decreaseHighLoad(userIndex);
      return res
    })
    .catch((err) => {
      console.error(err);
      res.status(404).json(err);
      decreaseHighLoad(userIndex);
    });

});

app.get('/:animeId/series', async (req, res) => {
  let userIndex = updateCookies()

  const url = "https://play.shikimori.org/animes/a" + req.params.animeId + "/video_online";
  const options = {
    uri: url,
    jar: cookieJar,
    headers: {
      'Referer': 'https://shikimori.org/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
    },
    transform: (body) => cheerio.load(body)
  };

  increaseHighLoad(userIndex)

  rp(options)
    .then(($) => {
      const INFO_OBJECT_QUERY = "gon.watch_online=";

      let scriptInfo = $('script').last().html(),
        infoObj = null;

      try {
        infoObj = JSON.parse(scriptInfo.substring(
          scriptInfo.indexOf(INFO_OBJECT_QUERY) + INFO_OBJECT_QUERY.length,
          scriptInfo.lastIndexOf("};") + 1))
      } catch (err) {
        console.log();
      }

      if (infoObj !== null && infoObj.is_licensed) {
        res.status(403).send("Anime under license");
        return res;
      } else {
        const episodes = convertEpisodes($, req.params.animeId);
        console.log('EPISODES: ' + episodes.length);
        res.setHeader('content-type', 'application/json');
        res.json(episodes).status(200);
        decreaseHighLoad(userIndex);
        return res;
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(400).json(err);
      decreaseHighLoad(userIndex);
    });
});

app.get('/highloadTest', async (req, res) => {
  return res.status(400).json(proxyUsers.map(elem =>
    ({
      index: elem.index,
      highLoadIndex: elem.highLoadIndex
    })))
})

async function increaseHighLoad(index) {
  if (typeof proxyUsers === 'undefined') {
    let i = await syncUsers();
  }

  proxyUsers[index].highLoadIndex++;
}

async function decreaseHighLoad(index) {
  if (typeof proxyUsers === 'undefined') {
    let i = await syncUsers();
  }

  let value = --proxyUsers[index].highLoadIndex;
  proxyUsers[index].highLoadIndex = Math.max(0, value);
}

async function syncUsers() {
  require('./index')
    .firestore
    .collection("tokens")
    .doc("tc55uQRPMFVXnMuFXNrZ")
    .get()
    .then(doc => {
      const result = doc.data().cookies.map((elem, index) =>
        ({
          index: index,
          highLoadIndex: 0,
          cookie: elem
        })
      );
      proxyUsers = result;
      return result;
    }).catch(err => {
      console.error(err);
    })
}

function updateCookies() {
  let user = proxyUsers.hasMin('highLoadIndex')
  cookieJar.setCookie(user.cookie, 'https://shikimori.org', function(err, cookie) {
    console.error('err: ' + err);
    console.log('cookie: ' + cookie);
  });
  return user.index
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
  console.log("HTML: " + html);
  kek.each(function(i, elem) {
    const id = $(elem).attr(EPISODE_ID_QUERY);
    const translations = $(EPISODE_TRANSLATIONS_QUERY, elem)
      .text()
      .replace(" ", "")
      .split(",")
      .map(e => {
        return e.trim()
      });

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

Array.prototype.hasMin = function(attrib) {
  return this.reduce(function(prev, curr) {
    return prev[attrib] < curr[attrib] ? prev : curr;
  });
}

module.exports = app;
