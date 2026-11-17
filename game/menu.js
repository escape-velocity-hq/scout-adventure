// Phone layout helpers.
// 1. On narrow screens the twelve games and the side buttons fold into one "Games & More" button.
// 2. Every card gets an x to hide it (the Menu button, top left, brings it back).
(function () {
  const b = document.createElement('button'); b.id = 'scgames'; b.className = 'scbtn'; b.type = 'button';
  const set = o => { document.body.classList.toggle('scgames-open', o); b.textContent = o ? 'Close ▾' : 'Games & More ▴'; b.setAttribute('aria-expanded', o ? 'true' : 'false') };
  b.onclick = e => { e.stopPropagation(); set(!document.body.classList.contains('scgames-open')) };
  const hideBtn = c => {
    if (!c.firstChild || c.querySelector('.scclose,.schide')) return;
    const x = document.createElement('button'); x.className = 'schide'; x.type = 'button'; x.textContent = '×';
    x.title = 'Hide this box. The Menu button brings it back.'; x.setAttribute('aria-label', 'Hide this box');
    x.onclick = () => { c.hidden = true }; c.insertBefore(x, c.firstChild);
  };
  const add = () => {
    const bar = document.getElementById('scbar'), top = document.getElementById('sctop'), card = document.getElementById('sccard');
    if (!bar || !top || !card) return setTimeout(add, 300);
    document.body.appendChild(b); set(false);
    const shut = e => { if (e.target.closest('.scbtn')) set(false) };
    bar.addEventListener('click', shut); top.addEventListener('click', shut);
    hideBtn(card); new MutationObserver(() => hideBtn(card)).observe(card, { childList: true });
  };
  add();
})();
