const functions = require('firebase-functions');

const express = require('express');
const app = express();
const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');
const videoParser = require('./video-parsing')

const cookieJar = request.jar();

var firebase = require('firebase-admin');
firebase.initializeApp(functions.config().firebase);

var cookie = '_kawai_session=UFd5Ly9JcEIxSit0UEJpbjg3cm9YUUpZTk9ZUU9jUUQ0WXZzanAzODlUOUtTMS9FdDZ4SHRGYkxmemYzUHhDQ2pyZktiRUZEZlg4WXIzU09yTEJZWnQ4cmVlTHFFZUt3cHlFTjk3NFJ3YmYwUTVqa1ZsMG1hcFpQaUFLdmJYZGQ2aEVqUkw4MU5qU3drdTRqTzhRTE4rRjlXQ2MxcUJKbDNMOWJsaXM3Z0craFNmeUpTR1VBeThRSDJUNlArV3BlTkFKK2JpRGlyM3hrMGJuWElzK1VhM0hqSVFUbkZsNjRZWlg1T05XR083bEVLc2l3ZG1oZVJmSzNRZkZwS0h4VFc5b3d5Qm5WVU5WbTc4VzhnSXl4aWRqVURSdmVoL2RLTHpocFlWNEl5cFE9LS0zRC9IdXNPK1hPTUtSM2tkU2VzRDhnPT0%3D--086ce10560a6686351b45493b9a076228a1ab2b2; domain=.shikimori.org; path=/; expires=Tue, 09 Jan 2024 11:05:19 -0000; secure; HttpOnly'

cookieJar.setCookie(cookie, 'https://shikimori.org', function(err, cookie) {
  console.log('err: ' + err);
  console.log('cookie: ' + cookie);
})

app.get('/test', async (req, res) => {
  const url = "http://vk.com/video_ext.php?oid=-11560005&id=456239748&hash=f7946fd340e686fa"
  const options = {
    uri: url,
    transform: (body) => cheerio.load(body)
  }

  rp(options)
    .then(($) => {
      console.log("after");
      const VIDEOS_QUERY = "video>source[type=\"video/mp4\"]"
      const qualityRegex = /\.(\d+)\./g;
      const tracks = []

      $(VIDEOS_QUERY).each(function(i, elem) {
        const src = $(elem).attr("src")
        const qualityArray = qualityRegex.exec(src)
        qualityRegex.lastIndex = 0
        var quality = "-1"
        if (qualityArray !== null) {
          quality = qualityArray[1]
        }
        console.log(src);
        console.log(quality);

        tracks.push(({
          quality: quality,
          url: src
        }))
      })

      res.status(200).json(tracks)
      return res
    })
    .catch((err) => {
      console.log(err)
      res.status(404).json(err)
    });

})

app.get('/watch/:animeId/:episodeId/:videoId*?', async (req, res) => {
  const availableParams = ["language", "kind", "author", "hosting", "raw"]

  var videoPart = ""
  if (typeof req.params.videoId !== 'undefined') {
    videoPart = "/" + req.params.videoId
  }

  const url = "https://play.shikimori.org/animes/" + req.params.animeId + "/video_online/" + req.params.episodeId + videoPart;
  const options = {
    uri: url,
    jar: cookieJar,
    headers: {
      'Referer': 'https://shikimori.org/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
    },
    transform: (body) => cheerio.load(body)
  }

  const languageCookie = "anime_video_language=" + req.query.language + "; path=/; domain=.play.shikimori.org; Expires=Tue, 19 Jan 2038 03:14:07 GMT;"
  const hostingCookie = "anime_video_hosting=" + req.query.hosting + "; path=/; domain=.play.shikimori.org; Expires=Tue, 19 Jan 2038 03:14:07 GMT;"
  const authorCookie = "anime_video_author=" + req.query.author + "; path=/; domain=.play.shikimori.org; Expires=Tue, 19 Jan 2038 03:14:07 GMT;"
  const kindCookie = "anime_video_kind=" + req.query.kind + "; path=/; domain=.play.shikimori.org; Expires=Tue, 19 Jan 2038 03:14:07 GMT;"

  cookieJar.setCookie(languageCookie, 'https://play.shikimori.org', function(err, cookie) {
    console.log(err);
  })
  cookieJar.setCookie(hostingCookie, 'https://play.shikimori.org', function(err, cookie){
    console.log(err);
  })
  cookieJar.setCookie(authorCookie, 'https://play.shikimori.org', function(err, cookie) {
    console.log(err);
  })
  cookieJar.setCookie(kindCookie, 'https://play.shikimori.org', function(err, cookie) {
    console.log(err);
  })

  let playerUrl

  rp(options)
    .then(($) => {
      const URL_QUERY = "div.video-link a"
      const TITLE_QUERY = "a.b-link>span[itemprop]"

      playerUrl = $($(URL_QUERY).first()).attr('href')

      return rp({
        uri: playerUrl,
        transform: (body) => cheerio.load(body)
      })
    })
    .then(($) => {
      const tracks = videoParser.getTracks(playerUrl, $)
      console.log(tracks);
      var response = ({
        animeId: req.params.animeId,
        episodeId: req.params.episodeId,
        hosting: req.params.hosting,
        tracks: tracks
      })

      res.status(200).json(response)
      return res
    })
    .catch((err) => {
      console.log(err)
      res.status(404).json(err)
    });

});

app.get('/translations/:animeId/:episodeId', async (req, res) => {
  const availableParams = ["fandub", "subtitles", "raw", "all"]
  if (availableParams.indexOf(req.query.type) == -1) {
    res.status(400).send("TYPE must be one of " + availableParams)
    return res
  }

  const url = "https://play.shikimori.org/animes/" + req.params.animeId + "/video_online/" + req.params.episodeId;
  const options = {
    uri: url,
    jar: cookieJar,
    headers: {
      'Referer': 'https://shikimori.org/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
    },
    transform: (body) => cheerio.load(body)
  }

  rp(options)
    .then(($) => {
      const ALL_QUERY = "div.video-variant-group[data-kind=%s]"
      const TRANSLATIONS_QUERY = "div.b-video_variant[data-video_id]"
      const VIDEO_ID_QUERY = "data-video_id"

      const REJECTED_QUERY = "rejected"
      const BROKEN_QUERY = "broken"
      const BANNED_QUERY = "banned_hosting"

      const VIDEO_QUALITY_QUERY = ".video-quality"
      const VIDEO_TYPE_QUERY = ".video-kind"
      const VIDEO_HOSTING_QUERY = ".video-hosting"
      const VIDEO_AUTHOR_QUERY = ".video-author"

      var translations = []
      var episodes = convertEpisodes($, req.params.animeId)

      if (req.params.episodeId > episodes.length) {
        res.status(404).send("There is only " + episodes.length + " episodes.")
        return res
      }

      var all = $(require('util').format(ALL_QUERY, req.query.type))
      $(TRANSLATIONS_QUERY, all)
        .each(function(i, elem) {
          const videoId = $(elem).attr(VIDEO_ID_QUERY)
          const rawQuality = $(VIDEO_QUALITY_QUERY, elem).attr('class')
          var quality = "tv"
          if (typeof rawQuality !== 'undefined' && rawQuality !== null) {
            quality = rawQuality.split(' ')[1]
          }
          const author = $(VIDEO_AUTHOR_QUERY, elem).text().trim()
          const hosting = $(VIDEO_HOSTING_QUERY, elem).text().trim()
          const type = $(VIDEO_TYPE_QUERY, elem).text().trim().toLowerCase()

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
        })
      res.status(200).json(translations)
      return res
    })
    .catch((err) => {
      console.log(err)
      res.status(404).json(err)
    });

});

app.get('/series/:id', async (req, res) => {
  const url = "https://play.shikimori.org/animes/" + req.params.id + "/video_online";
  const options = {
    uri: url,
    jar: cookieJar,
    headers: {
      'Referer': 'https://shikimori.org/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
    },
    transform: (body) => cheerio.load(body)
  }

  rp(options)
    .then(($) => {
      const INFO_OBJECT_QUERY = "gon.watch_online="

      var scriptInfo = $('script').last().html()
      var infoObj = null

      try {
        infoObj = JSON.parse(scriptInfo.substring(
          scriptInfo.indexOf(INFO_OBJECT_QUERY) + INFO_OBJECT_QUERY.length,
          scriptInfo.lastIndexOf("};") + 1))
      } catch (err) {
        console.log(err);
      }

      if (infoObj !== null && infoObj.is_licensed) {
        res.status(403).send("Anime under license")
        return res;
      } else if (infoObj !== null && infoObj.is_censored) {
        res.status(404).send("Blocked in Russia")
        return res;
      } else {
        var episodes = convertEpisodes($, req.params.id)
        console.log('EPISODES: ' + episodes.length);
        res.setHeader('content-type', 'application/json');
        res.json(episodes).status(200);
        return res;
      }
    })
    .catch((err) => {
      console.log(err)
      res.status(404).json(err)
    });
});

app.listen('8081')

async function convertEpisodes($, animeId) {
  const ERROR_QUERY = "div.b-errors p";
  const EPISODES_QUERY = "div.c-anime_video_episodes>[data-episode],div.b-show_more-more>[data-episode]";
  const EPISODE_ID_QUERY = "data-episode";
  const EPISODE_TRANSLATIONS_QUERY = ".episode-kinds";
  const EPISODE_HOSTINGS_QUERY = ".episode-hostings";

  var episodes = [];
  var kek = $(EPISODES_QUERY)
  var html = kek.html()
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
      animeId: animeId,
      translations: translations,
      rawHostings: rawHostings,
      videoHostings: videoHostings
    }));
  });
  return episodes
}

exports.api = functions.https.onRequest(app);
