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
  sibnetParsing,
  vkParsing
]

const regexArray = [
  SIBNET_REGEX,
  VK_REGEX,
]

module.exports = {
  getTracks: function(url, $) {
    console.log(url);
    for (var i = 0; i < regexArray.length; i++) {
      if (url.match(regexArray[i])) {
        return parseFunctions[i]($)
      }
    }
    return []
  }
}

function smotretAnimeParsing(url) {

}

function sibnetParsing(url) {
  var tracks = []
  return tracks
}

function vkParsing($) {
  const VIDEOS_QUERY = "video>source[type=\"video/mp4\"]"
  const qualityRegex = /\.(\d+)\./g;
  const tracks = []

  $(VIDEOS_QUERY).each(function(i, elem) {
    const src = $(elem).attr("src")
    const qualityArray = qualityRegex.exec(src)
    qualityRegex.lastIndex = 0
    var quality = "unknown"
    if (qualityArray !== null) {
      quality = qualityArray[1]
    }

    console.log(src)
    tracks.push(({
      quality: quality,
      url: src
    }))
  })

  return tracks
}
