// Keep anchor navigation usable without JavaScript; enhance its current location.
const navigation = document.querySelector('.nav');
const links = [...document.querySelectorAll('.nav-links a')];
const sections = links.map(link => document.querySelector(link.hash));
let pending = false;
function updateNavigation() {
  const offset = window.innerWidth < 1100 ? navigation.getBoundingClientRect().height + 24 : 40;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= offset) current = section;
  }
  for (const link of links) {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  pending = false;
}
function scheduleUpdate() {
  if (!pending) {
    pending = true;
    requestAnimationFrame(updateNavigation);
  }
}
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate);
updateNavigation();
