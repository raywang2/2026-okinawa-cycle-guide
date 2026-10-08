export const pikminOfficialUrl = 'https://pikminbloom.com/zh_hant/news/oct26-oceanexpominiwalk';
export const pikminMapUrl = 'https://www.google.com/maps/d/viewer?mid=1psf0F_jbPeqTvA9POrWWMYlEJmFAKOo';
// Coordinates and reward labels supplied by the trip organizer.
export const pikminPoints = [
  { id: 'postcard-1', name: '明信片 ①', reward: '明信片', icon: '💌', lat: 26.6935110, lon: 127.8778510 },
  { id: 'postcard-2', name: '明信片 ②', reward: '明信片', icon: '💌', lat: 26.6929250, lon: 127.8758320 },
  { id: 'postcard-3', name: '明信片 ③', reward: '明信片', icon: '💌', lat: 26.6848810, lon: 127.8751850 },
  { id: 'summer', name: '夏季貼紙', reward: '金色花苗｜夏季貼紙', icon: '☀️', lat: 26.6909370, lon: 127.8775180 },
  { id: 'coral', name: '珊瑚', reward: '金色花苗｜珊瑚', icon: '🪸', lat: 26.6906540, lon: 127.8779720 },
  { id: 'photo', name: '照片鈕扣', reward: '金色花苗｜照片鈕扣', icon: '📷', lat: 26.6877270, lon: 127.8761570 },
  { id: 'surfboard', name: '衝浪板鑰匙圈', reward: '金色花苗｜衝浪板鑰匙圈', icon: '🏄', lat: 26.6984690, lon: 127.8785900 }
].map(point => ({ ...point, mapUrl: `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}` }));

export function renderPikmin() {
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date());
  document.querySelector('#pikmin-year').textContent = `${year} 年收集進度`;
  document.querySelector('#pikmin-list').innerHTML = pikminPoints.map(point => `
    <article class="poi poke-item pikmin-item">
      <label class="poke-task-main">
        <input type="checkbox" data-save="pikmin-${year}-${point.id}" data-group="pikmin" aria-label="標記 ${point.name} 已滑動領取">
        <span class="poke-task-thumb pikmin-task-thumb" aria-hidden="true">${point.icon}</span>
        <span class="poke-task-copy"><b>${point.name}</b><span class="poke-task-address">${point.reward}</span><span class="poke-task-address">${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}</span></span>
      </label>
      <footer class="poke-task-footer" aria-label="${point.name} 連結">
        <button class="text-button" type="button" disabled data-pikmin-focus="${point.id}">在地圖定位</button>
        <a href="${point.mapUrl}" target="_blank" rel="noopener">Google Maps ↗</a>
        <a href="${pikminMapUrl}" target="_blank" rel="noopener">活動地圖 ↗</a>
      </footer>
    </article>`).join('');
}

export function updatePikminProgress() {
  const count = [...document.querySelectorAll('[data-group="pikmin"]')].filter(input => input.checked).length;
  document.querySelector('#pikmin-count').textContent = `${count} / ${pikminPoints.length} 個地點`;
  document.querySelector('#pikmin-bar').style.width = `${count / pikminPoints.length * 100}%`;
  document.querySelector('#pikmin-mission').textContent = count >= 4
    ? '已記錄 4 個特殊地點：可於遊戲內確認並領取藍色皮克敏的金色禮物貼紙花苗。'
    : `任務進度 ${count} / 4：再滑動 ${4 - count} 個不同特殊地點，可獲得藍色皮克敏的金色禮物貼紙花苗。`;
}
