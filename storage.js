;(function StorageModule(){
  'use strict';

  const KEY = 'kinopoisk_movies';

  function load(){
    return Lampa.Storage.get(KEY, []);
  }

  function save(list){
    Lampa.Storage.set(KEY, list);
  }

  window.KinopoiskStorage = { load, save };
})();
