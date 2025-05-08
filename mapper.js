;(function MapperModule(){
  'use strict';

  async function mapMovie(item){
    const id       = item.movie.id;
    const titleObj = item.movie.title;
    // 1. Детали из Kinopoisk
    const kp = await KinopoiskApi.fetchMovieDetailsKP(id);
    const imdb     = kp.imdbId;
    const name     = kp.nameOriginal || kp.nameRu || titleObj.localized || titleObj.original;
    const isTv     = kp.type === 'TV_SERIES';
    const year     = kp.year;

    // 2. Попытка по IMDB
    let tmdb = imdb 
      ? await KinopoiskApi.fetchTmdbByImdb(imdb).catch(()=>null)
      : null;

    // 3. Если не нашлось — поиск по названию
    if(!tmdb || (!tmdb.movie_results && !tmdb.tv_results)){
      tmdb = await KinopoiskApi.fetchTmdbBySearch(name, year, isTv).catch(()=>null);
    }

    const res = tmdb?.movie_results?.[0] || tmdb?.tv_results?.[0] || tmdb?.results?.[0];
    if(!res) return null;

    const dateStr = res.release_date || res.first_air_date;
    if(new Date(dateStr) > new Date()) return null; // ещё не вышло

    res.kinopoisk_id = String(id);
    res.source        = 'tmdb';
    return res;
  }

  window.KinopoiskMapper = { mapMovie };
})();
