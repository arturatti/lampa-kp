(function () {
  'use strict'

  /* === globals =========================================================== */
  const KP_KEYS = [
    '8c8e1a50-6322-4135-8875-5d40a5420d86',
    'f1d94351-2911-4485-b037-97817098724e'
  ]
  const TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96'
  const Y_CLIENT = 'b8b9c7a09b79452094e12f6990009934'
  const Y_SECRET = '0e7001e272944c05ae5a0df16e3ea8bd'
  const network = new Lampa.Reguest()

  /* === helpers =========================================================== */
  const rnd = a => a[Math.floor(Math.random() * a.length)]

  const api = {
    get (url, h = {}) {
      return new Promise((res, rej) => {
        network.silent(
          url,
          d => res(d),
          e => rej(e),
          false,
          { type: 'get', headers: h }
        )
      })
    },
    post (url, body) {
      return new Promise((res, rej) => {
        network.silent(
          url,
          d => res(d),
          e => rej(e),
          body
        )
      })
    }
  }

  const storage = {
    key: 'kinopoisk_movies',
    load () { return Lampa.Storage.get(this.key, []) },
    save (v) { Lampa.Storage.set(this.key, v) }
  }

  const ui = {
    empty () { Lampa.Noty.show('В списке «Буду смотреть» Кинопоиска нет фильмов') },
    done () { Lampa.Noty.show('Обновление списка фильмов Кинопоиска завершено') }
  }

  /* === core ============================================================== */
  async function kpProfile () {
    const oauth = Lampa.Storage.get('kinopoisk_access_token', '')
    if (!oauth) return null
    const url = 'https://script.google.com/macros/s/AKfycbwQhxl9xQPv46uChWJ1UDg6BjSmefbSlTRUoSZz5f1rZDRvdhAGTi6RHyXwcSeyBtPr/exec?oauth=' + oauth
    return api.get(url)
  }

  async function kpDetails (id) {
    const url = `https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`
    return api.get(url, { 'X-API-KEY': rnd(KP_KEYS) })
  }

  async function tmdbByImdb (imdb) {
    const url = `https://apitmdb.cub.red/3/find/${imdb}?external_source=imdb_id&language=ru&api_key=${TMDB_KEY}`
    return api.get(url)
  }

  async function tmdbBySearch (q, y, tv) {
    const p = tv ? 'tv' : 'movie'
    const url = `https://apitmdb.cub.red/3/search/${p}?query=${encodeURIComponent(q)}&year=${y}&language=ru&api_key=${TMDB_KEY}`
    return api.get(url)
  }

  async function mapMovie (item) {
    const id = item.movie.id
    const kp = await kpDetails(id).catch(() => null)
    if (!kp) return null

    const imdb = kp.imdbId
    const name = kp.nameOriginal || kp.nameRu || item.movie.title.localized || item.movie.title.original
    const tv = kp.type === 'TV_SERIES'
    const year = kp.year

    let tmdb = imdb ? await tmdbByImdb(imdb).catch(() => null) : null
    if (!tmdb || (!tmdb.movie_results && !tmdb.tv_results)) tmdb = await tmdbBySearch(name, year, tv).catch(() => null)

    const m =
      tmdb?.movie_results?.[0] ||
      tmdb?.tv_results?.[0] ||
      tmdb?.results?.[0]

    if (!m) return null
    const d = new Date(m.release_date || m.first_air_date)
    if (d > new Date()) return null

    m.kinopoisk_id = String(id)
    m.source = 'tmdb'
    return m
  }

  async function sync () {
    const prof = await kpProfile()
    const root = prof?.data?.userProfile?.userData?.plannedToWatch?.movies
    const list = root?.items || []
    if (!list.length) {
      ui.empty()
      return
    }

    const current = storage.load()
    const seen = new Set(current.map(m => m.kinopoisk_id))
    const fresh = []

    for (const it of list) {
      const kid = String(it.movie.id)
      if (seen.has(kid)) {
        fresh.push(current.find(m => m.kinopoisk_id === kid))
      } else {
        const mapped = await mapMovie(it)
        if (mapped) fresh.unshift(mapped)
      }
    }

    storage.save(fresh)
    ui.done()
  }

  /* === component ========================================================= */
  function full (p, ok) {
    sync()
      .finally(() => ok({ success: true, page: 1, results: storage.load() }))
  }

  function component (o) {
    const c = new Lampa.InteractionCategory(o)
    c.create = () => full(o, c.build.bind(c))
    c.nextPageReuest = (p, r) => full(p, r.bind(c))
    return c
  }

  /* === auth ============================================================== */
  function uuid4 () {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = b[6] & 0x0f | 0x40
    b[8] = b[8] & 0x3f | 0x80
    return [...b].map((n, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? '-' : '') + n.toString(16).padStart(2, '0')).join('')
  }

  function deviceCode () {
    const body = { client_id: Y_CLIENT, device_id: uuid4() }
    api.post('https://oauth.yandex.ru/device/code', body).then(d => {
      if (!d.user_code || !d.device_code) return
      const html = $(
        `<div>
           <div class="about">Перейдите на ya.ru/device и введите код<br><br><b>${d.user_code}</b><br><br></div>
           <br><div class="broadcast__device selector">Готово</div>
         </div>`
      )
      Lampa.Modal.open({
        title: 'Авторизация',
        html,
        align: 'center',
        onBack: () => Lampa.Modal.close(),
        onSelect: () => token(d.device_code, false)
      })
    })
  }

  function token (code, refresh) {
    const body = refresh
      ? { grant_type: 'refresh_token', refresh_token: code, client_id: Y_CLIENT, client_secret: Y_SECRET }
      : { grant_type: 'device_code', code, client_id: Y_CLIENT, client_secret: Y_SECRET }
    api.post('https://oauth.yandex.ru/token', body).then(t => {
      if (!t.access_token) return
      Lampa.Storage.set('kinopoisk_access_token', t.access_token)
      Lampa.Storage.set('kinopoisk_refresh_token', t.refresh_token)
      Lampa.Storage.set('kinopoisk_token_expires', Date.now() + t.expires_in * 1e3)
      Lampa.Modal.close()
      sync()
    })
  }

  /* === bootstrap ========================================================= */
  function addButton (name) {
    const btn = $(
      `<li class="menu__item selector">
         <div class="menu__ico">
           <svg viewBox="0 0 239 239" fill="currentColor"><path d="M215 121.415l-99.297-6.644 90.943 36.334a106.416 106.416 0 0 0 8.354-29.69z"/><path d="M194.608 171.609C174.933 197.942 143.441 215 107.948 215 48.33 215 0 166.871 0 107.5 0 48.13 48.33 0 107.948 0c35.559 0 67.102 17.122 86.77 43.539l-90.181 48.07L162.57 32.25h-32.169L90.892 86.862V32.25H64.77v150.5h26.123v-54.524l39.509 54.524h32.169l-56.526-57.493 88.564 46.352z"/><path d="M206.646 63.895l-90.308 36.076L215 93.583a106.396 106.396 0 0 0-8.354-29.688z"/></svg>
         </div>
         <div class="menu__text">${name}</div>
       </li>`
    )
    btn.on('hover:enter', () => {
      if (!Lampa.Storage.get('kinopoisk_access_token', '')) deviceCode()
      Lampa.Activity.push({ url: '', title: name, component: 'kinopoisk', page: 1 })
    })
    $('.menu .menu__list').eq(0).append(btn)
  }

  function start () {
    Lampa.Manifest.plugins = { type: 'video', version: '0.4.0', name: 'Кинопоиск', component: 'kinopoisk' }
    Lampa.Component.add('kinopoisk', component)
    if (Lampa.Storage.get('kinopoisk_access_token', '') && Lampa.Storage.get('kinopoisk_token_expires', 0) < Date.now()) token(Lampa.Storage.get('kinopoisk_refresh_token'), true)
    if (window.appready) addButton('Кинопоиск')
    else Lampa.Listener.follow('app', e => { if (e.type === 'ready') addButton('Кинопоиск') })
  }

  if (!window.kinopoisk_ready) start()
})()
