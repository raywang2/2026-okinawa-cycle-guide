import { attractionPoints } from './attraction-data.js';
export { attractionPoints };

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const mapUrl = point => `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}`;
const links = point => `<a href="${mapUrl(point)}" target="_blank" rel="noopener">Google Maps ↗</a>`;

export function renderAttractions() {
  const list = document.querySelector('#attraction-list');
  list.innerHTML = attractionPoints.map(point => `<article class="card attraction-card" data-attraction-id="${point.id}"><h3>📍 ${escapeHtml(point.name)}</h3><div class="tools"><button type="button" class="text-button" disabled data-attraction-focus="${point.id}">在地圖定位</button>${links(point)}</div></article>`).join('');
  const query = document.querySelector('#attraction-query');
  const update = () => {
    const term = query.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const point of attractionPoints) {
      const card = list.querySelector(`[data-attraction-id="${point.id}"]`);
      card.hidden = !point.name.toLocaleLowerCase().includes(term);
      if (!card.hidden) count++;
    }
    document.querySelector('#attraction-count').textContent = `${count} / ${attractionPoints.length} 個地點`;
    document.querySelector('#attraction-empty').hidden = count > 0;
  };
  query.addEventListener('input', update);
  update();
}

export function setupAttractionMap(map, L, layer, selectPanel) {
  const markers = new Map();
  for (const point of attractionPoints) {
    const icon = L.divIcon({ className: 'attraction-marker', html: '<span aria-hidden="true">📍</span>', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18] });
    markers.set(point.id, L.marker([point.lat, point.lon], { icon, title: `景點｜${point.name}` }).bindPopup(`<b>📍 ${escapeHtml(point.name)}</b><p>${links(point)}</p>`).addTo(layer));
  }
  const focus = id => {
    const marker = markers.get(id);
    if (!marker) return;
    map.flyTo(marker.getLatLng(), 16, { duration: .6 });
    marker.openPopup();
  };
  document.querySelectorAll('[data-attraction-focus]').forEach(button => {
    button.addEventListener('click', () => {
      selectPanel();
      focus(button.dataset.attractionFocus);
      document.querySelector('#route').scrollIntoView({ behavior: 'smooth' });
    });
    button.disabled = false;
  });
  const overview = document.querySelector('[data-attraction-overview]');
  overview.addEventListener('click', () => {
    selectPanel();
    document.querySelector('#route').scrollIntoView({ behavior: 'smooth' });
  });
  overview.disabled = false;
  return focus;
}
