export function setupMapFullscreen(map) {
  const stage = document.querySelector('.map-stage');
  const button = document.querySelector('#map-fullscreen');
  const dateControl = document.querySelector('#day-tabs').closest('.map-control');
  const datePlaceholder = document.createComment('Date control position in the map panel');
  dateControl.before(datePlaceholder);
  const dateToolbar = document.createElement('details');
  dateToolbar.className = 'map-fullscreen-settings';
  dateToolbar.hidden = true;
  const summary = document.createElement('summary');
  summary.textContent = '地圖設定 · 日期／圖層';
  const settingsContent = document.createElement('div');
  settingsContent.className = 'map-fullscreen-settings-content';
  const layerControls = document.createElement('fieldset');
  layerControls.className = 'map-fullscreen-layers';
  layerControls.innerHTML = '<legend>顯示圖層</legend>';
  const layers = [...document.querySelectorAll('[data-map-layer]')].map(source => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    const name = source.closest('.layer-toggle').querySelector('[data-map-panel]').textContent;
    label.append(input, document.createTextNode(name));
    layerControls.append(label);
    input.addEventListener('change', () => {
      source.checked = input.checked;
      source.dispatchEvent(new Event('change', { bubbles: true }));
    });
    source.addEventListener('change', syncSettings);
    return { source, input, label };
  });
  settingsContent.append(layerControls);
  dateToolbar.append(summary, settingsContent);
  stage.prepend(dateToolbar);
  function syncSettings() {
    const select = dateControl.querySelector('select');
    summary.textContent = `地圖設定 · ${select?.selectedOptions[0]?.textContent || '日期／圖層'}`;
    layers.forEach(({ source, input, label }) => {
      input.checked = source.checked;
      label.hidden = source.closest('.layer-toggle').hidden;
    });
  }
  dateControl.addEventListener('change', () => {
    syncSettings();
    dateToolbar.open = false;
    summary.focus({ preventScroll: true });
  });
  let active = false;
  let previousOverflow;
  let background = [];

  function setActive(value) {
    if (active === value) return;
    active = value;
    stage.classList.toggle('is-fullscreen', active);
    button.textContent = active ? '⤢ 退出全螢幕' : '⤢ 全螢幕';
    button.setAttribute('aria-pressed', String(active));
    if (active) {
      settingsContent.prepend(dateControl);
      dateToolbar.open = false;
      dateToolbar.hidden = false;
      syncSettings();
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Keep keyboard focus in the map while preserving existing inert states.
      for (let node = stage; node.parentElement; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling === node) continue;
          background.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
    } else {
      datePlaceholder.after(dateControl);
      dateToolbar.hidden = true;
      document.body.style.overflow = previousOverflow;
      background.forEach(([element, inert]) => { element.inert = inert; });
      background = [];
    }
    button.focus({ preventScroll: true });
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
  }

  async function exit() {
    if (document.fullscreenElement === stage) {
      await document.exitFullscreen();
    } else {
      setActive(false);
    }
  }

  button.addEventListener('click', async () => {
    if (active) return exit();
    setActive(true);
    if (stage.requestFullscreen) {
      try { await stage.requestFullscreen(); }
      catch { /* The viewport layout also works when native fullscreen is denied. */ }
    }
  });
  document.addEventListener('fullscreenchange', () => {
    setActive(document.fullscreenElement === stage);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      exit();
    } else if (event.key === 'Tab') {
      const focusable = [...stage.querySelectorAll('button, a[href], input, select, summary, [tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
  });
}
