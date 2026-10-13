/* Références — un petit bouton 🎧 à côté de chaque titre de tableau, mention LED / PLATEAU / FX
   et chanson, pour y attacher un audio ou un lien. Partagé entre tous les visiteurs (API notes-api/). */
(function () {
  'use strict';
  var API = (window.NOTES_API || 'https://cm4-notes.notes-api.workers.dev').replace(/\/$/, '');
  var AUDIO_MAX = 20 * 1024 * 1024;

  var root = document.querySelector('main');
  if (!root) return;

  var ls = function (k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  };
  var mesCles = {};
  try { mesCles = JSON.parse(ls('rf-cles') || '{}') || {}; } catch (e) {}

  var refs = [], cibles = [], parCle = {}, ouverte = null, envoiEnCours = false;

  /* ---------- Styles ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.rf-btn{font:600 11px/1 "Inter",system-ui,sans-serif;margin-left:6px;padding:4px 8px;border-radius:999px;border:1px solid var(--accent);background:var(--paper);color:var(--accent);cursor:pointer;vertical-align:1px;letter-spacing:0;text-transform:none;white-space:nowrap}',
    '.rf-btn:hover,.rf-btn:focus-visible{background:var(--accent);color:var(--paper)}',
    '.rf-btn.plein{opacity:1;border:1px solid var(--accent);background:var(--accent);color:var(--paper)}',
    'h2 .rf-btn{font-size:12px;vertical-align:4px}',
    '.rf-ouvrir{font:inherit;padding:4px 10px;border:1px solid var(--accent);border-radius:8px;background:var(--bg);color:var(--accent);cursor:pointer;font-weight:600}',
    '.rf-ouvrir:hover{background:var(--accent);color:var(--paper)}',
    '#rf-fond{position:fixed;inset:0;z-index:55;background:rgba(10,9,7,.35)}',
    '#rf-fond[hidden],#rf-pop[hidden]{display:none}',
    '#rf-pop{position:fixed;z-index:56;width:min(420px,calc(100vw - 24px));max-height:min(78vh,640px);overflow:auto;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.25);font:14px/1.5 "Inter",system-ui,sans-serif;padding:14px 16px 16px}',
    '#rf-pop.large{width:min(640px,calc(100vw - 24px));left:50%!important;top:6vh!important;transform:translateX(-50%)}',
    '@media (max-width:700px){#rf-pop,#rf-pop.large{left:12px!important;right:12px;top:auto!important;bottom:12px;width:auto;transform:none;max-height:82vh}}',
    '#rf-pop .rf-tete{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px}',
    '#rf-pop .rf-tete h3{margin:0;font-size:15px;line-height:1.35}',
    '#rf-pop button{font:inherit;cursor:pointer;border-radius:8px}',
    '#rf-pop .rf-x{border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:0 9px;font-size:18px;line-height:1.5;flex:none}',
    '#rf-pop .rf-vide{color:var(--muted);font-style:italic;margin:6px 0 12px}',
    '#rf-pop .rf-groupe{margin:14px 0 4px;font-size:12px;letter-spacing:.04em;color:var(--muted);display:flex;justify-content:space-between;gap:8px}',
    '#rf-pop .rf-groupe a{color:var(--accent);white-space:nowrap}',
    '#rf-pop .rf-item{border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:0 0 8px;background:var(--bg)}',
    '#rf-pop .rf-item .rf-ligne{display:flex;justify-content:space-between;gap:8px;align-items:baseline}',
    '#rf-pop .rf-item a.rf-lien{color:var(--accent);font-weight:600;word-break:break-word}',
    '#rf-pop .rf-item .rf-titre{font-weight:600;word-break:break-word}',
    '#rf-pop .rf-item .rf-meta{font-size:12px;color:var(--muted)}',
    '#rf-pop .rf-item audio{width:100%;margin-top:6px;height:36px}',
    '#rf-pop .rf-item .rf-sup{border:1px solid var(--line);background:var(--paper);color:var(--ink);padding:1px 8px;font-size:12px;flex:none}',
    '#rf-pop form{border-top:1px solid var(--line);margin-top:12px;padding-top:10px}',
    '#rf-pop .rf-onglets{display:flex;gap:6px;margin-bottom:6px}',
    '#rf-pop .rf-onglets button{border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:3px 12px;font-size:13px}',
    '#rf-pop .rf-onglets button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}',
    '#rf-pop label{display:block;font-size:12px;color:var(--muted);margin:8px 0 3px}',
    '#rf-pop input[type=text],#rf-pop input[type=url]{width:100%;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink)}',
    '#rf-pop input[type=file]{width:100%;font:13px "Inter",system-ui,sans-serif;color:var(--ink)}',
    '#rf-pop .rf-btns{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:10px}',
    '#rf-pop .rf-btns .ok{background:var(--accent);border:1px solid var(--accent);color:var(--paper);font-weight:600;padding:5px 14px}',
    '#rf-pop .rf-btns .ok:disabled{opacity:.5;cursor:wait}',
    '#rf-pop .rf-err{color:#c0392b;font-size:13px;margin:6px 0 0}',
    '#rf-pop .rf-info{color:var(--muted);font-size:12px}',
    '.rf-flash{animation:rf-flash 1.6s ease}',
    '@keyframes rf-flash{0%,50%{background:rgba(232,190,40,.45)}}',
    '@media print{.rf-btn,.rf-ouvrir,#rf-pop,#rf-fond{display:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  var el = function (tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };

  /* ---------- Emplacements : titres de tableau, mentions LED/PLATEAU/FX, chansons ---------- */
  // Chaque emplacement a une clé tirée de son texte (stable si on réordonne le script)
  // et une clé de secours tirée de son rang dans le tableau (stable si on retouche le texte).
  function reperer() {
    var tableau = '', rangs = {};
    root.querySelectorAll('article.chapter, h2, p.dir, section.song > h3:first-child').forEach(function (e) {
      if (e.matches('article.chapter')) { tableau = e.id; return; }
      if (e.matches('h2')) {
        tableau = e.classList.contains('tableau') ? norm(e.firstChild && e.firstChild.textContent).split(' — ')[0] : e.id;
        if (!e.classList.contains('tableau')) return;
        var titre = norm(e.firstChild && e.firstChild.textContent);
        ajouterCible(e, e, 'titre|' + tableau, 'titre|' + e.id, titre);
        return;
      }
      var genre, texte, apres;
      if (e.matches('p.dir')) {
        var tag = e.querySelector('span.tag');
        if (!tag) return;
        genre = tag.textContent.trim().toLowerCase();
        apres = tag.nextElementSibling && tag.nextElementSibling.matches('button.apercu') ? tag.nextElementSibling : tag;
        var copie = e.cloneNode(true);
        copie.querySelectorAll('span.tag, button').forEach(function (x) { x.remove(); });
        texte = norm(copie.textContent).replace(/^:\s*/, '');
      } else {
        genre = 'chanson';
        apres = null;
        texte = norm(e.textContent);
      }
      var k = genre + '|' + tableau;
      rangs[k] = (rangs[k] || 0) + 1;
      var label = genre === 'chanson' ? texte
        : tableau + ' · ' + genre.toUpperCase() + ' : ' + (texte.length > 70 ? texte.slice(0, 70) + '…' : texte);
      ajouterCible(e, apres, k + '|' + texte.slice(0, 60), k + '|#' + rangs[k], label);
    });
  }

  function ajouterCible(bloc, apres, cle, cle2, label) {
    var b = el('button', 'rf-btn');
    b.type = 'button';
    if (apres && apres !== bloc) apres.after(b); else bloc.appendChild(b);
    var c = { bloc: bloc, btn: b, cle: cle, cle2: cle2, label: label };
    b.addEventListener('click', function (ev) { ev.stopPropagation(); ouvrir(c); });
    cibles.push(c);
    parCle[cle] = c;
    if (!parCle[cle2]) parCle[cle2] = c;
  }

  var ouvrirTout = el('button', 'rf-ouvrir');
  ouvrirTout.type = 'button';
  ouvrirTout.title = 'Tous les audios et liens de référence';
  var bar = document.querySelector('.bar');
  (bar || document.body).appendChild(ouvrirTout);
  ouvrirTout.addEventListener('click', function () { ouvrir(null); });

  var fond = el('div'); fond.id = 'rf-fond'; fond.hidden = true;
  var pop = el('div'); pop.id = 'rf-pop'; pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  document.body.appendChild(fond);
  document.body.appendChild(pop);
  fond.addEventListener('click', fermer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) fermer(); });

  function cibleDe(r) { return parCle[r.cible] || (r.cible2 && parCle[r.cible2]) || null; }
  function refsDe(c) { return refs.filter(function (r) { return cibleDe(r) === c; }); }

  function majBoutons() {
    cibles.forEach(function (c) {
      var n = refsDe(c).length;
      c.btn.textContent = n ? '🎧 Réf. (' + n + ')' : '🎧 + Réf.';
      c.btn.classList.toggle('plein', n > 0);
      c.btn.title = n ? n + ' référence' + (n > 1 ? 's' : '') + ' — cliquer pour écouter ou ajouter' : 'Ajouter un audio ou un lien de référence';
    });
    ouvrirTout.textContent = '🎧 Références' + (refs.length ? ' (' + refs.length + ')' : '');
  }

  /* ---------- Fenêtre ---------- */
  var modeForm = ls('rf-mode') || 'lien', brouillon = {};

  function fermer() {
    pop.hidden = true; fond.hidden = true; ouverte = null;
    pop.querySelectorAll('audio').forEach(function (a) { a.pause(); });
  }

  function ouvrir(c) {
    fermer();
    pop.innerHTML = '';
    ouverte = c || 'tout';
    brouillon = {};
    rendre();
    pop.hidden = false;
    fond.hidden = false;
    pop.classList.add('large');
    charger();
  }

  function rendre(erreur) {
    if (!ouverte) return;
    var c = ouverte === 'tout' ? null : ouverte;
    // Ne jamais reconstruire un formulaire en cours de saisie
    var formExistant = pop.querySelector('form');
    var liste = pop.querySelector('.rf-liste');
    if (!liste) {
      pop.innerHTML = '';
      var tete = el('div', 'rf-tete');
      tete.appendChild(el('h3', null, c ? c.label : '🎧 Toutes les références'));
      var x = el('button', 'rf-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fermer');
      x.addEventListener('click', fermer);
      tete.appendChild(x);
      pop.appendChild(tete);
      liste = el('div', 'rf-liste');
      pop.appendChild(liste);
    }
    // Les lecteurs audio en cours de lecture sont conservés tels quels
    var enLecture = {};
    liste.querySelectorAll('audio').forEach(function (a) { if (!a.paused) enLecture[a.dataset.id] = a.closest('.rf-item'); });
    liste.innerHTML = '';

    if (c) {
      var mes = refsDe(c);
      if (!mes.length) liste.appendChild(el('p', 'rf-vide', 'Aucune référence pour l’instant. Ajoute un lien ou un audio ci-dessous.'));
      mes.forEach(function (r) { liste.appendChild(enLecture[r.id] || item(r)); });
      if (!formExistant) pop.appendChild(formulaire(c));
    } else {
      if (!refs.length) liste.appendChild(el('p', 'rf-vide', 'Aucune référence pour l’instant. Clique sur un bouton « 🎧 + Réf. » à côté d’un titre, d’une mention LED / PLATEAU / FX ou d’une chanson.'));
      var groupes = [];
      cibles.forEach(function (ci) { var l = refsDe(ci); if (l.length) groupes.push([ci, l]); });
      var perdues = refs.filter(function (r) { return !cibleDe(r); });
      groupes.forEach(function (g) {
        var t = el('div', 'rf-groupe');
        t.appendChild(el('span', null, g[0].label));
        var a = el('a', null, 'Voir dans le script ›'); a.href = '#';
        a.addEventListener('click', function (e) { e.preventDefault(); allerA(g[0]); });
        t.appendChild(a);
        liste.appendChild(t);
        g[1].forEach(function (r) { liste.appendChild(enLecture[r.id] || item(r)); });
      });
      if (perdues.length) {
        liste.appendChild(el('div', 'rf-groupe', 'Emplacement introuvable (le script a changé)'));
        perdues.forEach(function (r) {
          var it = enLecture[r.id] || item(r);
          if (!enLecture[r.id]) it.appendChild(el('div', 'rf-meta', 'Était sur : ' + (r.label || r.cible)));
          liste.appendChild(it);
        });
      }
    }
    if (erreur) liste.appendChild(el('p', 'rf-err', erreur));
  }

  function item(r) {
    var it = el('div', 'rf-item');
    var ligne = el('div', 'rf-ligne');
    if (r.genre === 'lien') {
      var a = el('a', 'rf-lien', '🔗 ' + (r.titre || hote(r.url)));
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = r.url;
      ligne.appendChild(a);
    } else {
      ligne.appendChild(el('span', 'rf-titre', '🎧 ' + (r.titre || 'Audio')));
    }
    if (mesCles[r.id]) {
      var sup = el('button', 'rf-sup', 'Supprimer');
      sup.type = 'button';
      sup.addEventListener('click', function () {
        if (!sup.dataset.confirme) { sup.dataset.confirme = '1'; sup.textContent = 'Confirmer ?'; return; }
        sup.disabled = true;
        envoyerJson({ action: 'supprimer', id: r.id, cle: mesCles[r.id] }).then(function () {
          delete mesCles[r.id]; ls('rf-cles', JSON.stringify(mesCles));
          return charger();
        }).catch(function (e) { rendre('Suppression impossible : ' + e.message); });
      });
      ligne.appendChild(sup);
    }
    it.appendChild(ligne);
    if (r.genre === 'audio') {
      var au = el('audio');
      au.controls = true; au.preload = 'none'; au.src = API + r.url; au.dataset.id = r.id;
      it.appendChild(au);
    }
    var d = new Date(r.date), meta = (r.auteur || 'Anonyme');
    if (!isNaN(d)) meta += ' · ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    if (r.genre === 'audio' && r.taille) meta += ' · ' + poids(r.taille);
    if (r.genre === 'lien') meta += ' · ' + hote(r.url);
    it.appendChild(el('div', 'rf-meta', meta));
    return it;
  }

  function poids(o) { return o < 1048576 ? Math.max(1, Math.round(o / 1024)) + ' Ko' : (o / 1048576).toFixed(1).replace('.', ',') + ' Mo'; }

  function hote(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  function formulaire(c) {
    var f = el('form');
    var onglets = el('div', 'rf-onglets');
    var corps = el('div');
    var err = el('p', 'rf-err'); err.hidden = true;
    var btns = el('div', 'rf-btns');
    var info = el('span', 'rf-info');
    var ok = el('button', 'ok', 'Ajouter'); ok.type = 'submit';
    btns.appendChild(info); btns.appendChild(ok);

    function champ(lbl, input) { corps.appendChild(el('label', null, lbl)); corps.appendChild(input); return input; }
    var nom, titre, url, fichier;
    function dessiner() {
      onglets.innerHTML = ''; corps.innerHTML = '';
      [['lien', '🔗 Lien'], ['audio', '🎧 Audio']].forEach(function (o) {
        var b = el('button', o[0] === modeForm ? 'on' : null, o[1]); b.type = 'button';
        b.addEventListener('click', function () { modeForm = o[0]; ls('rf-mode', modeForm); err.hidden = true; dessiner(); });
        onglets.appendChild(b);
      });
      if (modeForm === 'lien') {
        url = champ('Lien (YouTube, Spotify, Drive…)', el('input'));
        url.type = 'text'; url.inputMode = 'url'; url.autocapitalize = 'off'; url.placeholder = 'https://…'; url.required = true; url.maxLength = 1000;
        url.value = brouillon.url || '';
        url.addEventListener('input', function () { brouillon.url = url.value; });
        fichier = null;
      } else {
        fichier = champ('Fichier audio (20 Mo maximum)', el('input'));
        fichier.type = 'file'; fichier.accept = 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.aif,.aiff,.caf'; fichier.required = true;
        url = null;
      }
      titre = champ('Titre (facultatif)', el('input'));
      titre.type = 'text'; titre.maxLength = 200; titre.value = brouillon.titre || '';
      titre.placeholder = modeForm === 'lien' ? 'Ex. : ambiance pour la descente' : 'Ex. : maquette voix Henika';
      titre.addEventListener('input', function () { brouillon.titre = titre.value; });
      nom = champ('Ton nom', el('input'));
      nom.type = 'text'; nom.maxLength = 60; nom.required = true; nom.value = ls('nr-nom') || '';
      nom.addEventListener('input', function () { ls('nr-nom', nom.value.trim()); });
      ok.textContent = modeForm === 'lien' ? 'Ajouter le lien' : 'Envoyer l’audio';
    }
    f.appendChild(onglets); f.appendChild(corps); f.appendChild(err); f.appendChild(btns);
    dessiner();

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (envoiEnCours) return;
      err.hidden = true;
      var cle = Math.random().toString(36).slice(2) + Date.now().toString(36);
      var base = { auteur: nom.value.trim(), cible: c.cle, cible2: c.cle2, label: c.label, titre: titre.value.trim(), cle: cle };
      var envoi;
      if (modeForm === 'lien') {
        var u = url.value.trim();
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        envoi = envoyerJson(Object.assign({ action: 'lien', url: u }, base));
      } else {
        var fi = fichier.files[0];
        if (!fi) return;
        if (fi.size > AUDIO_MAX) { err.textContent = 'Ce fichier fait ' + (fi.size / 1048576).toFixed(1).replace('.', ',') + ' Mo : le maximum est 20 Mo.'; err.hidden = false; return; }
        var fd = new FormData();
        Object.keys(base).forEach(function (k) { fd.append(k, base[k]); });
        fd.append('fichier', fi);
        envoi = envoyerFichier(fd, function (p) { info.textContent = 'Envoi… ' + p + ' %'; });
      }
      envoiEnCours = true; ok.disabled = true; info.textContent = 'Envoi…';
      envoi.then(function (r) {
        mesCles[r.id] = cle; ls('rf-cles', JSON.stringify(mesCles));
        brouillon = {};
        envoiEnCours = false; ok.disabled = false; info.textContent = '';
        if (url) url.value = '';
        if (fichier) fichier.value = '';
        titre.value = '';
        return charger();
      }).catch(function (e2) {
        envoiEnCours = false; ok.disabled = false; info.textContent = '';
        err.textContent = 'Échec : ' + e2.message; err.hidden = false;
      });
    });
    return f;
  }

  function allerA(c) {
    fermer();
    c.bloc.scrollIntoView({ behavior: 'smooth', block: 'center' });
    c.bloc.classList.remove('rf-flash'); void c.bloc.offsetWidth; c.bloc.classList.add('rf-flash');
  }

  /* ---------- Échanges avec l'API ---------- */
  var chargement = null;
  function charger() {
    if (chargement) return chargement;
    chargement = fetch(API + '/refs?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) { refs = Array.isArray(d) ? d : []; majBoutons(); rendre(); })
      .catch(function () { rendre('Impossible de charger les références. Vérifie ta connexion.'); })
      .then(function () { chargement = null; });
    return chargement;
  }

  function lireReponse(r) {
    if (!r || !r.ok) throw new Error((r && r.erreur) || 'erreur inconnue');
    return r;
  }

  function envoyerJson(d) {
    return fetch(API + '/refs', { method: 'POST', body: JSON.stringify(d) })
      .then(function (r) { return r.json(); }).then(lireReponse);
  }

  function envoyerFichier(fd, progression) {
    return new Promise(function (ok, ko) {
      var x = new XMLHttpRequest();
      x.open('POST', API + '/refs');
      x.upload.onprogress = function (e) { if (e.lengthComputable) progression(Math.round(e.loaded / e.total * 100)); };
      x.onload = function () {
        try { ok(lireReponse(JSON.parse(x.responseText))); } catch (e) { ko(e instanceof SyntaxError ? new Error('réponse invalide') : e); }
      };
      x.onerror = function () { ko(new Error('connexion interrompue')); };
      x.send(fd);
    });
  }

  reperer();
  majBoutons();
  charger();
  setInterval(function () { if (!document.hidden && !envoiEnCours) charger(); }, 60000);
})();
