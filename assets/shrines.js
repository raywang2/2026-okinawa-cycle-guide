import { shrinePoints } from './shrine-data.js';
export { shrinePoints };

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const externalLink = (url, label) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label} ↗</a>`;
export const shrineMapUrl = shrine => `https://www.google.com/maps/search/?api=1&query=${shrine.lat},${shrine.lon}`;
export const shrineIcon = shrine => shrine.kind === 'temple' ? '🪷' : '⛩️';
const kindLabels = { shrine: '神社', temple: '寺院', combined: '神社／寺院' };
const islandLabels = { main: '本島／橋連接島嶼' };

function shrineLinks(shrine) {
  return `${shrine.officialUrl ? externalLink(shrine.officialUrl, '官方資訊') : ''} ${externalLink(`${shrine.sourceUrl}goshuins/`, '御朱印紀錄')} ${externalLink(shrineMapUrl(shrine), 'Google Maps')}`;
}

export function renderShrines() {
  const list = document.querySelector('#shrine-list');
  list.innerHTML = shrinePoints.map(shrine => `
    <article class="card shrine-card" data-shrine-id="${shrine.id}">
      <div class="shrine-heading"><span class="shrine-thumb ${shrine.kind === 'temple' ? 'shrine-thumb-temple' : ''}" aria-hidden="true">${shrineIcon(shrine)}</span><div><div class="shrine-tags"><span>${shrine.area}</span><span>${kindLabels[shrine.kind]}</span>${shrine.island !== 'main' ? `<span>${islandLabels[shrine.island]}</span>` : ''}${shrine.ryukyuEight ? '<span>琉球八社</span>' : ''}${shrine.confirmBeforeVisit ? '<span class="shrine-confirm">需事前確認</span>' : ''}${shrine.templeGoshuin ? '<span class="shrine-confirm">寺院御朱印</span>' : ''}</div><h3>${escapeHtml(shrine.name)}</h3>${shrine.reading ? `<p class="muted small">${escapeHtml(shrine.reading)}</p>` : ''}</div></div>
      <p class="shrine-address">${escapeHtml(shrine.address)}</p>
      <div class="shrine-reception"><b>御朱印授與處｜${escapeHtml(shrine.reception)}</b><p>${escapeHtml(shrine.note)}</p></div>
      ${shrine.hours ? `<p class="muted small">${escapeHtml(shrine.hours)}</p>` : ''}
      <label class="shrine-collection"><input type="checkbox" data-save="shrine-${shrine.id}" data-group="shrine" aria-label="標記 ${escapeHtml(shrine.collectionName || shrine.name)} 已領取御朱印"><span>${shrine.templeGoshuin ? '已領取金武觀音寺御朱印' : '已領取御朱印'}</span></label>
      <div class="shrine-actions"><button class="text-button" type="button" disabled data-shrine-focus="${shrine.id}">在地圖定位</button>${shrine.receptionId ? `<button class="text-button" type="button" disabled data-shrine-focus="${shrine.receptionId}">定位授與處</button>` : ''}${shrineLinks(shrine)}</div>
    </article>`).join('');

  const query = document.querySelector('#shrine-query');
  const category = document.querySelector('#shrine-category');
  const kind = document.querySelector('#shrine-kind');
  category.innerHTML = '<option value="">全部地區</option><option value="eight">琉球八社路線</option>'
    + `<optgroup label="市町村">${[...new Set(shrinePoints.map(shrine => shrine.area))].map(area => `<option value="${area}">${area}</option>`).join('')}</optgroup>`;
  const count = document.querySelector('#shrine-result-count');
  const update = () => {
    const term = query.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const shrine of shrinePoints) {
      const matchesCategory = !category.value || (category.value === 'eight' ? shrine.ryukyuEight : category.value.startsWith('island:') ? shrine.island === category.value.slice(7) : shrine.area === category.value);
      const matchesKind = !kind.value || shrine.kind === kind.value || shrine.kind === 'combined';
      const matchesQuery = [shrine.name, shrine.reading, shrine.address, shrine.area, shrine.reception, shrine.note, kindLabels[shrine.kind], islandLabels[shrine.island], shrine.ryukyuEight ? '琉球八社' : ''].join(' ').toLocaleLowerCase().includes(term);
      const card = list.querySelector(`[data-shrine-id="${shrine.id}"]`);
      card.hidden = !(matchesCategory && matchesKind && matchesQuery);
      if (!card.hidden) visible++;
    }
    count.textContent = `${visible} / ${shrinePoints.length} 個巡禮點`;
    document.querySelector('#shrine-empty').hidden = visible > 0;
  };
  query.addEventListener('input', update);
  category.addEventListener('change', update);
  kind.addEventListener('change', update);
  update();
}

export function updateShrineProgress() {
  const count = [...document.querySelectorAll('[data-group="shrine"]')].filter(input => input.checked).length;
  document.querySelector('#shrine-count').textContent = `${count} / ${shrinePoints.length} 個巡禮點`;
  document.querySelector('#shrine-bar').style.width = `${count / shrinePoints.length * 100}%`;
}

export function setupShrineMap(map, L, layer, selectPanel) {
  const markers = new Map();
  for (const shrine of shrinePoints) {
    const icon = L.divIcon({ className: `shrine-marker ${shrine.kind === 'temple' ? 'shrine-marker-temple' : ''}`, html: `<span aria-hidden="true">${shrineIcon(shrine)}</span>`, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
    const popup = `<b>${shrineIcon(shrine)} ${escapeHtml(shrine.name)}</b><br>${escapeHtml(shrine.address)}<br><b>御朱印授與處：${escapeHtml(shrine.reception)}</b><p>${escapeHtml(shrine.note)}</p>${shrine.hours ? `<p>${escapeHtml(shrine.hours)}</p>` : ''}<div class="shrine-popup-links">${shrineLinks(shrine)}</div>`;
    markers.set(shrine.id, L.marker([shrine.lat, shrine.lon], { icon, keyboard: true, title: `御朱印｜${shrine.name}` }).bindPopup(popup).addTo(layer));
  }
  const focus = id => {
    const shrine = shrinePoints.find(point => point.id === id);
    if (!shrine) return;
    map.flyTo([shrine.lat, shrine.lon], 16, { duration: .6 });
    markers.get(id).openPopup();
  };
  document.querySelectorAll('[data-shrine-focus]').forEach(button => {
    button.addEventListener('click', () => {
      selectPanel();
      focus(button.dataset.shrineFocus);
      document.querySelector('#route').scrollIntoView({ behavior: 'smooth' });
    });
    button.disabled = false;
  });
  const overview = document.querySelector('[data-shrine-overview]');
  overview.addEventListener('click', () => {
    selectPanel();
    document.querySelector('#route').scrollIntoView({ behavior: 'smooth' });
  });
  overview.disabled = false;
  return focus;
}
