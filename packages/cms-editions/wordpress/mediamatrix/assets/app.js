(function () {
  'use strict';
  var config = window.mediaMatrixConfig || {};
  var grid = document.getElementById('mm-grid');
  var status = document.getElementById('mm-status');
  var detail = document.getElementById('mm-detail');
  var sectionTitle = document.getElementById('mm-section-title');
  if (!grid || !status || !detail) return;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function message(text, isError) {
    status.textContent = text;
    status.classList.toggle('mm-error', Boolean(isError));
    status.classList.remove('mm-hidden');
  }
  async function request(path, params) {
    if (!config.restBase) throw new Error('MediaMatrix is not configured. Open Appearance → MediaMatrix in WordPress administration.');
    var query = new URLSearchParams(params || {});
    var response = await fetch(config.restBase + path + '?' + query.toString(), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    var data = await response.json();
    if (!response.ok) throw new Error(data && (data.message || (data.error && data.error.message)) || 'The request could not be completed.');
    return data;
  }
  function safeImage(path, width) {
    return typeof path === 'string' && path.charAt(0) === '/' ? 'https://image.tmdb.org/t/p/' + (width || 'w500') + path : '';
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function card(media) {
    var button = element('button', 'mm-card');
    button.type = 'button';
    button.setAttribute('aria-label', 'View details for ' + media.title);
    var image = element('img', 'mm-poster');
    image.loading = 'lazy'; image.alt = media.title + ' poster'; image.width = 500; image.height = 750;
    var src = safeImage(media.posterPath, 'w500');
    if (src) image.src = src;
    button.appendChild(image);
    button.appendChild(element('h3', '', media.title));
    button.appendChild(element('p', '', (media.releaseDate || 'Date unavailable') + (media.rating ? ' · ★ ' + Number(media.rating).toFixed(1) : '')));
    button.addEventListener('click', function () { loadTitle(media.type, media.id); });
    return button;
  }
  function renderItems(data) {
    clear(grid); clear(detail); detail.classList.add('mm-hidden'); grid.classList.remove('mm-hidden');
    var items = (data.results || []).filter(function (item) { return item.type === 'movie' || item.type === 'tv'; });
    if (!items.length) { message('No titles matched this request. Try a different search or catalog.'); return; }
    status.classList.add('mm-hidden');
    items.forEach(function (media) { grid.appendChild(card(media)); });
  }
  async function discover() {
    var type = document.getElementById('mm-type').value;
    sectionTitle.textContent = type === 'tv' ? 'Discover TV series' : 'Discover movies';
    grid.classList.add('mm-hidden'); message('Loading real TMDB metadata…');
    try { renderItems(await request('/discover', { type: type, page: 1 })); } catch (error) { message(error.message, true); }
  }
  async function search(query) {
    sectionTitle.textContent = 'Results for “' + query + '”';
    grid.classList.add('mm-hidden'); message('Searching…');
    try { renderItems(await request('/search', { q: query, page: 1 })); } catch (error) { message(error.message, true); }
  }
  async function loadTitle(type, id) {
    grid.classList.add('mm-hidden'); detail.classList.add('mm-hidden'); message('Loading title details and availability…');
    try {
      var data = await request('/title', { type: type, id: id });
      var media = data.media;
      clear(detail); status.classList.add('mm-hidden'); detail.classList.remove('mm-hidden');
      var poster = element('img'); poster.alt = media.title + ' poster'; poster.width = 500; poster.height = 750;
      var src = safeImage(media.posterPath, 'w500'); if (src) poster.src = src;
      var body = element('div'); body.appendChild(element('span', 'mm-eyebrow', type === 'tv' ? 'TV series' : 'Movie'));
      body.appendChild(element('h2', '', media.title));
      body.appendChild(element('p', 'mm-overview', media.overview || 'No overview is available.'));
      body.appendChild(element('p', '', (media.releaseDate || 'Date unavailable') + (media.rating ? ' · ★ ' + Number(media.rating).toFixed(1) : '')));
      var providers = element('div', 'mm-providers');
      var offers = data.availability && Array.isArray(data.availability.offers) ? data.availability.offers : [];
      offers.forEach(function (offer) {
        if (!offer.url) return;
        var link = element('a', 'mm-provider', 'Watch on ' + offer.providerName + ' · ' + offer.type + ' ↗');
        try { var url = new URL(offer.url); if (url.protocol !== 'https:' && url.protocol !== 'http:') return; link.href = url.href; } catch { return; }
        link.target = '_blank'; link.rel = 'noopener noreferrer'; providers.appendChild(link);
      });
      if (providers.childNodes.length) { body.appendChild(element('h3', '', 'Official availability')); body.appendChild(providers); }
      else if (data.availability && data.availability.configured) body.appendChild(element('p', 'mm-status', 'No provider options were returned for the selected country. This is not proof of universal unavailability.'));
      else body.appendChild(element('p', 'mm-status', 'Streaming availability is not configured on the connected application.'));
      if (config.appUrl) { var appLink = element('a', 'mm-button', 'Open in MediaMatrix'); appLink.href = config.appUrl.replace(/\/$/, '') + '/' + type + '/' + id; appLink.style.display = 'inline-flex'; appLink.style.alignItems = 'center'; appLink.style.textDecoration = 'none'; body.appendChild(appLink); }
      var back = element('button', 'mm-button', 'Back to results'); back.type = 'button'; back.style.marginLeft = '12px'; back.addEventListener('click', function () { detail.classList.add('mm-hidden'); grid.classList.remove('mm-hidden'); sectionTitle.scrollIntoView(); });
      body.appendChild(back); detail.appendChild(poster); detail.appendChild(body); detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { message(error.message, true); grid.classList.remove('mm-hidden'); }
  }
  document.getElementById('mm-search').addEventListener('submit', function (event) { event.preventDefault(); var query = document.getElementById('mm-query').value.trim(); if (query.length >= 2) search(query); });
  document.getElementById('mm-type').addEventListener('change', discover);
  discover();
}());
