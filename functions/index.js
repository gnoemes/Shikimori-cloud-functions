const functions = require('firebase-functions');

const express = require('express');
const app = express();
const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');

const cookieJar = request.jar();

var firebase = require('firebase-admin');
firebase.initializeApp(functions.config().firebase);

var cookie = '_kawai_session=UFd5Ly9JcEIxSit0UEJpbjg3cm9YUUpZTk9ZUU9jUUQ0WXZzanAzODlUOUtTMS9FdDZ4SHRGYkxmemYzUHhDQ2pyZktiRUZEZlg4WXIzU09yTEJZWnQ4cmVlTHFFZUt3cHlFTjk3NFJ3YmYwUTVqa1ZsMG1hcFpQaUFLdmJYZGQ2aEVqUkw4MU5qU3drdTRqTzhRTE4rRjlXQ2MxcUJKbDNMOWJsaXM3Z0craFNmeUpTR1VBeThRSDJUNlArV3BlTkFKK2JpRGlyM3hrMGJuWElzK1VhM0hqSVFUbkZsNjRZWlg1T05XR083bEVLc2l3ZG1oZVJmSzNRZkZwS0h4VFc5b3d5Qm5WVU5WbTc4VzhnSXl4aWRqVURSdmVoL2RLTHpocFlWNEl5cFE9LS0zRC9IdXNPK1hPTUtSM2tkU2VzRDhnPT0%3D--086ce10560a6686351b45493b9a076228a1ab2b2; domain=.shikimori.org; path=/; expires=Tue, 09 Jan 2024 11:05:19 -0000; secure; HttpOnly'

cookieJar.setCookie(cookie, 'https://shikimori.org', function(err, cookie) {
  console.log('err: ' + err);
  console.log('cookie: ' + cookie);
})

app.get('/series/:id', (req, res) => {
  const url = "https://play.shikimori.org/animes/"+ req.params.id +"/video_online";
  const options = {
    uri : url,
    jar : cookieJar,
    headers: {
      'Referer' : 'https://shikimori.org/',
      'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0',
  },
    transform:(body) => cheerio.load(body)
  }

  rp(options)
  .then(($) => {
    const ERROR_QUERY = "div.b-errors p";
    const EPISODES_QUERY = "div.c-anime_video_episodes>[data-episode],div.b-show_more-more>[data-episode]";
    const EPISODE_ID_QUERY = "data-episode";
    const EPISODE_TRANSLATIONS_QUERY = ".episode-kinds";
    const EPISODE_HOSTINGS_QUERY = ".episode-hostings";

    const INFO_OBJECT_QUERY = "gon.watch_online="

    var scriptInfo = $('script').last().html()
    var infoObj = null

    try {
      infoObj = JSON.parse(scriptInfo.substring(
           scriptInfo.indexOf(INFO_OBJECT_QUERY) + INFO_OBJECT_QUERY.length,
           scriptInfo.lastIndexOf("};") + 1))
    } catch (err) {console.log(err);}

    if (infoObj !== null && infoObj.is_licensed) {
      res.status(403).send("Anime under licence")
      return res;
    } else if (infoObj !== null && infoObj.is_censored) {
      res.status(404).send("Blocked in Russia")
      return res;
    } else {
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
            .map( e => { return e.trim() });

        const rawHostings = $(EPISODE_HOSTINGS_QUERY, elem).text();
        const videoHostings = rawHostings
            .replace(" ", "")
            .split(",")
            .map( e => { return e.trim() });

        episodes.push(({
          id : id,
          animeId : req.params.id,
          translations: translations,
          rawHostings: rawHostings,
          videoHostings: videoHostings
        }));
    });
        console.log('EPISODES: ' + episodes.length);
        res.setHeader('content-type', 'application/json');
        res.json(episodes).status(200);
        return res;
    }
  })
  .catch((err) => {
    console.log(err)
    res.status(400).json(err)
  });
});

app.listen('8081')

exports.api = functions.https.onRequest(app);
