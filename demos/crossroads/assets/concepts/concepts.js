const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Menu';
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
  menuButton.textContent = open ? 'Close' : 'Menu';
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
const viewer = document.querySelector('.project-dialog');
const viewerPhoto = viewer.querySelector('.dialog-photo');
let opener;
document.querySelectorAll('[data-project]').forEach(link => {
  link.addEventListener('click', event => {
    if (!viewer.showModal) return;
    event.preventDefault();
    opener = link;
    viewer.querySelector('#project-title').textContent = link.dataset.title;
    viewer.querySelector('.dialog-caption').textContent = link.dataset.caption;
    viewerPhoto.src = link.href;
    viewerPhoto.alt = link.dataset.alt;
    viewer.showModal();
  });
});
viewer.querySelector('.dialog-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => {
  if (event.target !== viewer) return;
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
});
viewer.addEventListener('close', () => opener?.focus());
