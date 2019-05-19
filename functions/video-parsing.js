const rp = require('request-promise');
const request = require('request');
const cheerio = require('cheerio');
const SMOTRET_ANIME_REGEX = "https?://smotretanime\\.ru/";
const SIBNET_REGEX = "https?://video\\.sibnet\\.ru/";
const VK_REGEX = "https?://vk\\.com/";
const YOUTUBE_REGEX = "https?://(?:www\\.)?youtube\\.com/";
const RUTUBE_REGEX = "https?://rutube\\.ru/";
const OK_REGEX = "https?://ok\\.ru/";
const SOVET_ROMANTICA_REGEX = "https?://sovetromantica\\.com/";
const ANIMEDIA_REGEX = "https?://online\\.animedia\\.tv/";
const MAIL_RU = "https?://my\\.mail\\.ru/";
const MYVI = "https?://myvi\\.top/";

const parseFunctions = [
  sibnetParsing,
  sovetRomanticaParsing,
];

const regexArray = [
  SIBNET_REGEX,
  SOVET_ROMANTICA_REGEX,
];

module.exports = {
  getTracks: async function (url, $) {
    console.log(url);
    for (let i = 0; i < regexArray.length; i++) {
      if (url.match(regexArray[i])) {
        let q = parseFunctions[i]($, url);
        if (q instanceof Promise) q = await q;
        return q;
      }
    }
    return [({
      quality: "unknown",
      url: url
    })]
  },

  getHosting: function(url) {
    return findHosting(url)
  }
};
// TODO кешировать коды активации для id эпизодов (они, похоже, хранятся оочень долго, код двухмесячной давности спокойно выдает видео)
function smotretAnimeCheck(code, epid) {
  let out = [];
  return  rp({uri: "https://smotretanime.ru/translations/embedActivation?code=" + code})
      .then((rsp) => {
        if (rsp + "" !== '[object Object]') rsp = JSON.parse(rsp);
        if (rsp.error) return smotretAnimeCheck(code, epid);
        br = true;

        if (rsp.sources) {
          let k = JSON.parse(rsp.sources);
          for (let vid of k) {
            if (vid.urls.length > 1)
              out.push(({quality: vid.height + "", url: 'concatenate', urls: vid.urls, epid: epid}));
            else out.push(({quality: vid.height + "", url: vid.urls[0], epid: epid}));
          }
        }
        if (rsp.alternativeSources) {
          let k = JSON.parse(rsp.alternativeSources);
          for (let vid of k) {
            if (vid.urls.length > 1)
              out.push(({quality: vid.height + " (ALT)", url: 'concatenate', urls: vid.urls, epid: epid}));
            else out.push(({quality: vid.height + " (ALT)", url: vid.urls[0], epid: epid}));
          }
        }
        return out;
      })
}

async function smotretAnimeParsing($, url) {
  const epid = url.split('/').pop();
  const A365_REGEX1 = /<script id="[a-zA-Z0-9]+" src="data:text\/javascript;base64,([a-zA-Z0-9/=+]+)">/;
  const A365_REGEX2 = /window\.activateCodeTmp = "([0-f]+)";/;
  const html = $('body').html();
  const code = Buffer.from(html.match(A365_REGEX1)[1], 'base64').toString('utf8').match(A365_REGEX2)[1];
  // const code = "9040e2ceb0d94654cad0d56fe474785d3d3a648a504d7eea298de058c4bba62e6a60e103c1127f5bc92ef98c6e9a726a93e8f8f64e3788752693cbb73292e2d2";
  console.log(code);
  return await smotretAnimeCheck(code, epid)
  // return [({
  //       quality: "unknown",
  //       url: url
  //     })]
}

function sovetRomanticaParsing($) {
  const srcScript = "videojs('sr-video-js-player').src(";
  const srcRegex = /(?:src\((.*)\))/g;

  let src = null;

  $('script').each(function(i, elem) {
    const data = $(elem).html();

    if (data.indexOf(srcScript) !== -1) {
      const srcArray = srcRegex.exec(data);
      srcRegex.lastIndex = 0;
      if (srcArray && src === null) {
        src = srcArray[1].replace(/["]/g, "")
      }
    }
  });

  return [({
    quality: "unknown",
    url: src
  })]
}

function sibnetParsing($) {
  const tracks = [];
  const srcRegex = /(?:player.src.+?(".+?"))/g;

  let src = null;

  $('script').each(function(i, elem) {
    const data = $(elem).html();

    const srcArray = srcRegex.exec(data);
    srcRegex.lastIndex = 0;
    if (srcArray && src === null) {
      src = srcArray[1]
    }
  });

  if (src !== null) {
    src = "https://video.sibnet.ru/" + src.replace(/["']/g, "")
  }

  return src
}

function findHosting(url) {
  if (url.match(VK_REGEX)) {
    return "vk.com"
  } else if (url.match(SMOTRET_ANIME_REGEX)) {
    return "smotretanime.ru"
  } else if (url.match(SIBNET_REGEX)) {
    return "sibnet.ru"
  } else if (url.match(YOUTUBE_REGEX)) {
    return "youtube.com"
  } else if (url.match(RUTUBE_REGEX)) {
    return "rutube.ru"
  } else if (url.match(OK_REGEX)) {
    return "ok.ru"
  } else if (url.match(SOVET_ROMANTICA_REGEX)) {
    return "sovetromantica.com"
  } else if (url.match(ANIMEDIA_REGEX)) {
    return "animedia.tv"
  } else if (url.match(MAIL_RU)) {
    return "mail.ru"
  } else if (url.match(MYVI)) {
    return "myvi.top"
  } else {
    return "unknown"
  }
}
