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

const parseFunctions = [
  sibnetParsing
]

const regexArray = [
  SIBNET_REGEX
]

module.exports = {
  getTracks: function(url, $) {
    console.log(url);
    for (var i = 0; i < regexArray.length; i++) {
      if (url.match(regexArray[i])) {
        return parseFunctions[i]($)
      }
    }
    return [({quality : "unknown", url : url})]
  },

  getHosting : function(url) {
    return findHosting(url)
  }
}

function smotretAnimeParsing(url) {

}

function sibnetParsing($) {
  const tracks = []
  const srcRegex = /(?:player.src.+?(".+?"))/g

  var src = null

  $('script').each(function(i, elem) {
    const data = $(elem).html()

    const srcArray = srcRegex.exec(data)
    srcRegex.lastIndex = 0
    if (srcArray !== null && src === null) {
      src = srcArray[1]
    }
  })

  if (src !== null) {
    src = "https://video.sibnet.ru/" + src.replace(/["']/g,"")
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
  } else {
    return "unknown"
  }
}
