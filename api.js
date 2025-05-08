;(function ApiModule(){
  'use strict';

  var network = new Lampa.Reguest();
  const KP_KEYS = [
    '8c8e1a50-6322-4135-8875-5d40a5420d86',
    'f1d94351-2911-4485-b037-97817098724e'
  ];

  function getRandomKey(){
    return KP_KEYS[Math.floor(Math.random() * KP_KEYS.length)];
  }

  function fetchJson(url, headers = {}){
    return new Promise((resolve, reject) => {
      network.silent(
        url,
        data => resolve(data),
        err  => reject(err),
        false,
        { type:'get', headers }
      );
    });
  }

  function postJson(url, body){
    return new Promise((resolve, reject) => {
      network.silent(
        url,
        data => resolve(data),
        err  => reject(err),
        body
      );
    });
  }

  function fetchKinopoiskProfile(oauth){
    const proxy = 'https://script.google.com/macros/s/AKfycbwQhxl9xQPv46uChWJ1UDg6BjSmefbSlTRUoSZz5f1rZDRvdhAGTi6RHyXwcSeyBtPr/exec';
    return fetchJson(`${proxy}?oauth=${oauth}`);
  }

  function fetchMovieDetailsKP(id){
    const url = `https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`;
    return fetchJson(url, { 'X-API-KEY': getRandomKey() });
  }

  function fetchTmdbByImdb(imdb){
    const url = `https://apitmdb.cub.red/3/find/${imdb}?external_source=imdb_id&language=ru&api_key=4ef0d7355d9ffb5151e987764708ce96`;
    return fetchJson(url);
  }

  function fetchTmdbBySearch(query, year, isTv){
    const path = isTv ? 'search/tv' : 'search/movie';
    const url  = `https://apitmdb.cub.red/3/${path}?query=${encodeURIComponent(query)}&year=${year}&language=ru&api_key=4ef0d7355d9ffb5151e987764708ce96`;
    return fetchJson(url);
  }

  window.KinopoiskApi = {
    fetchJson,
    postJson,
    fetchKinopoiskProfile,
    fetchMovieDetailsKP,
    fetchTmdbByImdb,
    fetchTmdbBySearch
  };
})();
