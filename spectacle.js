/* Spectacle audio (V2) — la fiction audio complète du CM4 (dialogues joués, chansons,
   musiques, bruitages). Un bouton « 🎭 Spectacle » sur chaque titre de tableau lance le
   spectacle à cet endroit ; « 🎭 Spectacle audio » dans la barre ouvre la liste des chapitres.
   Fichiers : spectacle/CHn.mp3 + spectacle/index.json (07-Production/FICTION_AUDIO/fiction.py). */
(function () {
  'use strict';
  var BASE = 'spectacle/';
  var root = document.querySelector('main');
  if (!root) return;

  var css = document.createElement('style');
  css.textContent = [
    '.sp-btn{font:600 12px/1 "Inter",system-ui,sans-serif;margin-left:6px;padding:4px 9px;border-radius:999px;border:1px solid var(--song-line,#8a6d22);background:var(--paper);color:var(--ink);cursor:pointer;vertical-align:4px;letter-spacing:0;text-transform:none;white-space:nowrap}',
    '.sp-btn:hover,.sp-btn:focus-visible{background:var(--song-line,#8a6d22);color:var(--paper)}',
    '.sp-ouvrir{font:inherit;padding:4px 10px;border:1px solid var(--song-line,#8a6d22);border-radius:8px;background:var(--bg);color:var(--ink);cursor:pointer;font-weight:600}',
    'h2.sp-on{outline:2px solid var(--song-line,#8a6d22);outline-offset:6px;border-radius:4px}',
    '#sp-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:45;display:flex;align-items:center;gap:6px;width:min(720px,calc(100vw - 32px));box-sizing:border-box;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:8px 10px;box-shadow:0 8px 28px rgba(0,0,0,.35);font:600 13px/1.2 "Inter",system-ui,sans-serif}',
    '#sp-bar[hidden]{display:none}',
    '#sp-bar .lab{flex:0 1 auto;max-width:34%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}',
    '#sp-bar input[type=range]{flex:1 1 auto;min-width:60px;accent-color:var(--song-line,#8a6d22)}',
    '#sp-bar .tps{font-variant-numeric:tabular-nums;font-weight:500;color:var(--muted);white-space:nowrap}',
    '#sp-bar button{border:0;background:var(--bg);color:var(--ink);border-radius:999px;min-width:32px;height:32px;cursor:pointer;font-size:13px;flex:0 0 auto}',
    '@media (max-width:560px){#sp-bar .tps{display:none}#sp-bar .lab{max-width:28%}}',
    '#sp-panneau{position:fixed;inset:0;z-index:50;background:rgba(10,9,7,.78);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:28px 16px}',
    '#sp-panneau[hidden]{display:none}',
    '#sp-panneau .boite{background:var(--paper);color:var(--ink);border-radius:14px;max-width:760px;width:100%;padding:18px 22px 24px;font:14px/1.5 "Inter",system-ui,sans-serif}',
    '#sp-panneau h3{margin:0 0 4px;font-size:19px}',
    '#sp-panneau h4{margin:16px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '#sp-panneau .tete{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
    '#sp-panneau .liste button{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;font:inherit;padding:6px 10px;margin:2px 0;border:0;border-radius:8px;background:var(--bg);color:var(--ink);cursor:pointer}',
    '#sp-panneau .liste button:hover{outline:1px solid var(--song-line,#8a6d22)}',
    '#sp-panneau .liste span.t{color:var(--muted);font-variant-numeric:tabular-nums}',
    '#sp-panneau .fermer{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer}',
    '#sp-panneau a{color:inherit}',
    '@media print{.sp-btn,.sp-ouvrir,#sp-bar,#sp-panneau{display:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  var el = function (tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  var hms = function (s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  };

  var idx = [], chapitres = [], au = new Audio(), cur = null, cible = null, titres = {}, courant = null;
  au.preload = 'none';

  /* ---------- Lecteur ---------- */
  var bar = el('div'); bar.id = 'sp-bar'; bar.hidden = true;
  var lab = el('span', 'lab'), prec = el('button', null, '−15'), pp = el('button', null, '⏸'),
      suiv = el('button', null, '+15'), rg = el('input'), tps = el('span', 'tps'), fermer = el('button', null, '✕');
  rg.type = 'range'; rg.min = 0; rg.max = 1000; rg.value = 0; rg.setAttribute('aria-label', 'Position dans le chapitre');
  prec.title = 'Reculer de 15 s'; suiv.title = 'Avancer de 15 s'; pp.title = 'Pause / lecture'; fermer.title = 'Arrêter';
  lab.title = 'Aller au tableau dans le script';
  [lab, prec, pp, suiv, rg, tps, fermer].forEach(function (x) { bar.appendChild(x); });
  document.body.appendChild(bar);

  function arreterLignes() {
    var stop = document.querySelector('#lecteur:not([hidden]) .stop');
    if (stop) stop.click();
  }
  function jouer(ch, t, e) {
    arreterLignes();
    bar.hidden = false;
    if (e) {
      if (courant && titres[courant.num]) titres[courant.num].classList.remove('sp-on');
      courant = e; lab.textContent = '🎭 ' + e.tableau; tps.textContent = 'chargement…';
      if (titres[e.num]) titres[e.num].classList.add('sp-on');
    }
    if (cur !== ch) { cur = ch; au.src = BASE + ch + '.mp3'; au.preload = 'auto'; }
    cible = t || 0;
    if (au.readyState >= 1) { au.currentTime = cible; cible = null; }
    au.play().catch(function () {});
    pp.textContent = '⏸';
  }
  au.addEventListener('loadedmetadata', function () {
    if (cible != null) { au.currentTime = cible; cible = null; }
  });
  au.addEventListener('ended', function () {
    var i = chapitres.indexOf(cur);
    if (i >= 0 && i < chapitres.length - 1) jouer(chapitres[i + 1], 0);
    else { pp.textContent = '▶'; }
  });
  au.addEventListener('timeupdate', function () {
    if (!au.duration) return;
    rg.value = Math.round(au.currentTime / au.duration * 1000);
    tps.textContent = hms(au.currentTime) + ' / ' + hms(au.duration);
    var e = null;
    idx.forEach(function (x) { if (x.chapitre === cur && x.debut <= au.currentTime + 0.5) e = x; });
    if (e && e !== courant) {
      if (courant && titres[courant.num]) titres[courant.num].classList.remove('sp-on');
      courant = e;
      lab.textContent = '🎭 ' + e.tableau;
      if (titres[e.num]) titres[e.num].classList.add('sp-on');
    }
  });
  pp.addEventListener('click', function () {
    if (au.paused) { arreterLignes(); au.play().catch(function () {}); pp.textContent = '⏸'; }
    else { au.pause(); pp.textContent = '▶'; }
  });
  prec.addEventListener('click', function () { au.currentTime = Math.max(0, au.currentTime - 15); });
  suiv.addEventListener('click', function () { au.currentTime = Math.min(au.duration || 0, au.currentTime + 15); });
  rg.addEventListener('input', function () { if (au.duration) au.currentTime = rg.value / 1000 * au.duration; });
  fermer.addEventListener('click', function () {
    au.pause(); bar.hidden = true;
    if (courant && titres[courant.num]) titres[courant.num].classList.remove('sp-on');
  });
  lab.addEventListener('click', function () {
    if (courant && titres[courant.num]) titres[courant.num].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // Le lecteur réplique par réplique et le spectacle ne jouent pas en même temps.
  document.addEventListener('click', function (e) {
    if (e.target.closest('button.ecoute, .replique[data-a] .cue') && !au.paused) { au.pause(); pp.textContent = '▶'; }
  }, true);

  /* ---------- Panneau des chapitres ---------- */
  var pan = el('div'); pan.id = 'sp-panneau'; pan.hidden = true;
  var boite = el('div', 'boite'); boite.setAttribute('role', 'dialog'); boite.setAttribute('aria-modal', 'true');
  pan.appendChild(boite); document.body.appendChild(pan);
  pan.addEventListener('click', function (e) {
    if (e.target === pan || e.target.closest('.fermer')) pan.hidden = true;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') pan.hidden = true; });

  function remplirPanneau() {
    boite.innerHTML = '';
    var tete = el('div', 'tete'), t = el('div');
    t.appendChild(el('h3', null, '🎭 Spectacle audio · version 2'));
    var p = el('p', null, 'Tout le spectacle en audio : dialogues joués, chansons, musiques et bruitages. Maquette de travail (voix et chansons générées par IA) : durée ' + hms(idx.length ? idx[idx.length - 1].debut_global + 60 : 0) + ' environ. ');
    var a = el('a', null, 'Paroles des chansons'); a.href = 'paroles.html'; a.target = '_blank'; a.rel = 'noopener';
    p.appendChild(a);
    t.appendChild(p);
    var f = el('button', 'fermer', 'Fermer ✕'); f.type = 'button';
    tete.appendChild(t); tete.appendChild(f); boite.appendChild(tete);
    var liste = el('div', 'liste'), dernier = null;
    idx.forEach(function (x) {
      if (x.chapitre !== dernier) {
        dernier = x.chapitre;
        var nom = x.chapitre === 'CH0' ? 'Scène 0' : 'Chapitre ' + x.chapitre.slice(2);
        liste.appendChild(el('h4', null, nom));
      }
      var b = el('button'); b.type = 'button';
      b.appendChild(el('span', null, x.tableau));
      b.appendChild(el('span', 't', hms(x.debut_global)));
      b.addEventListener('click', function () { pan.hidden = true; jouer(x.chapitre, x.debut, x); });
      liste.appendChild(b);
    });
    boite.appendChild(liste);
  }

  var ouvrir = el('button', 'sp-ouvrir', '🎭 Spectacle audio');
  ouvrir.type = 'button'; ouvrir.title = 'Écouter tout le spectacle (version 2, avec les chansons)';
  ouvrir.addEventListener('click', function () { pan.hidden = false; });

  fetch(BASE + 'index.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (data) {
    idx = data;
    idx.forEach(function (x) {
      x.num = x.tableau.split(' ')[0];
      if (chapitres.indexOf(x.chapitre) < 0) chapitres.push(x.chapitre);
    });
    root.querySelectorAll('h2.tableau').forEach(function (h) {
      var num = ((h.firstChild && h.firstChild.textContent) || '').trim().split(' ')[0];
      var e = idx.filter(function (x) { return x.num === num; })[0];
      if (!e) return;
      titres[num] = h;
      var b = el('button', 'sp-btn', '🎭 Spectacle');
      b.type = 'button'; b.title = 'Écouter le spectacle à partir de ce tableau';
      b.addEventListener('click', function () { jouer(e.chapitre, e.debut, e); });
      h.appendChild(b);
    });
    remplirPanneau();
    (document.querySelector('.bar') || document.body).appendChild(ouvrir);
  }).catch(function () {});
})();
