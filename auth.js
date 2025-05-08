;(function AuthModule(){
  'use strict';

  const CLIENT_ID     = 'b8b9c7a09b79452094e12f6990009934';
  const CLIENT_SECRET = '0e7001e272944c05ae5a0df16e3ea8bd';

  function generateDeviceId(){
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2,'0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10).join('')}`;
  }

  function requestDeviceCode(){
    const url  = 'https://oauth.yandex.ru/device/code';
    const body = { client_id: CLIENT_ID, device_id: generateDeviceId() };
    return KinopoiskApi.postJson(url, body);
  }

  function requestToken(code, isRefresh = false){
    const url = 'https://oauth.yandex.ru/token';
    const body = isRefresh
      ? { grant_type:'refresh_token', refresh_token:code, client_id:CLIENT_ID, client_secret:CLIENT_SECRET }
      : { grant_type:'device_code', code, client_id:CLIENT_ID, client_secret:CLIENT_SECRET };
    return KinopoiskApi.postJson(url, body);
  }

  window.KinopoiskAuth = { requestDeviceCode, requestToken };
})();
