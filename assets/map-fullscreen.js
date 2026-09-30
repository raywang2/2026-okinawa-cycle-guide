export function setupMapFullscreen(map) {
  const stage = document.querySelector('.map-stage');
  const button = document.querySelector('#map-fullscreen');
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
