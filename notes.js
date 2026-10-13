/* Notes de relecture — on sélectionne un passage du script, on y attache une note.
   Les notes sont partagées entre tous les visiteurs via l'API Cloudflare de notes-api/. */
(function () {
  'use strict';
  var API = window.NOTES_API || 'https://cm4-notes.notes-api.workers.dev';

  var root = document.querySelector('main');
  if (!root) return;

  var ls = function (k, v) {
    try {
      if (v === undefined) return localStorage.getItem('nr-' + k);
      localStorage.setItem('nr-' + k, v);
    } catch (e) { return null; }
  };
  var mesCles = {};
  try { mesCles = JSON.parse(ls('cles') || '{}') || {}; } catch (e) {}

  var notes = [], filtre = ls('filtre') || 'ouvertes', brouillon = null, envoiEnCours = false;

  /* ---------- Styles ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.nr-ouvrir{font:inherit;padding:4px 10px;border:1px solid var(--accent);border-radius:8px;background:var(--bg);color:var(--accent);cursor:pointer;font-weight:600}',
    '.nr-ouvrir:hover{background:var(--accent);color:var(--paper)}',
    '#nr-panel{position:fixed;top:0;right:0;bottom:0;width:min(380px,100vw);z-index:40;background:var(--paper);color:var(--ink);border-left:1px solid var(--line);box-shadow:-10px 0 30px rgba(0,0,0,.14);display:flex;flex-direction:column;font:14px/1.5 "Inter",system-ui,sans-serif;transform:translateX(105%);transition:transform .2s ease;visibility:hidden}',
    'body.nr-open #nr-panel{transform:none;visibility:visible}',
    '@media (min-width:1520px){body.nr-open{padding-right:380px}}',
    '#nr-panel .nr-tete{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px 10px;border-bottom:1px solid var(--line)}',
    '#nr-panel .nr-tete h2{margin:0;font-size:16px;border:0;padding:0}',
    '#nr-panel button{font:inherit;cursor:pointer;border-radius:8px}',
    '#nr-panel .nr-x{border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:2px 10px;font-size:18px;line-height:1.4}',
    '#nr-panel .nr-onglets{display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid var(--line)}',
    '#nr-panel .nr-onglets button{border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:3px 10px;font-size:13px}',
    '#nr-panel .nr-onglets button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}',
    '#nr-panel .nr-corps{flex:1;overflow:auto;padding:12px 16px 24px}',
    '#nr-panel .nr-aide{color:var(--muted);font-size:13px;margin:4px 0 12px}',
    '#nr-panel .nr-etat{color:var(--muted);font-style:italic;margin:16px 0}',
    '#nr-panel .nr-etat.err{color:#c0392b;font-style:normal}',
    '.nr-carte{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 10px;background:var(--bg)}',
    '.nr-carte.flash{outline:2px solid var(--accent)}',
    '.nr-carte.fait{opacity:.6}',
    '.nr-carte .nr-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted)}',
    '.nr-type{font:700 10.5px/1 "Inter",system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:4px 6px;border-radius:5px;color:#fff}',
    '.nr-type.modification{background:#c0503c}.nr-type.remarque{background:#2f6db5}',
    '.nr-carte .nr-section{font-size:12px;color:var(--muted);margin-top:4px}',
    '.nr-carte .nr-cite{display:block;width:100%;text-align:left;margin:6px 0;padding:6px 8px;border:0;border-left:3px solid var(--accent);border-radius:4px;background:var(--paper);color:var(--ink);font:italic 13px/1.45 "Literata",Georgia,serif;cursor:pointer;max-height:7.5em;overflow:hidden}',
    '.nr-carte .nr-cite.perdu{text-decoration:line-through;cursor:default;border-left-color:var(--muted)}',
    '.nr-carte .nr-texte{white-space:pre-wrap;word-wrap:break-word;margin:4px 0 6px}',
    '.nr-carte .nr-actions{display:flex;gap:6px;justify-content:flex-end}',
    '.nr-carte .nr-actions button{border:1px solid var(--line);background:var(--paper);color:var(--ink);padding:2px 9px;font-size:12px}',
    '.nr-form{border:1px solid var(--accent);border-radius:10px;padding:10px 12px;margin:0 0 14px;background:var(--bg)}',
    '.nr-form label{display:block;font-size:12px;color:var(--muted);margin:8px 0 3px}',
    '.nr-form input[type=text],.nr-form textarea{width:100%;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink)}',
    '.nr-form textarea{min-height:90px;resize:vertical}',
    '.nr-form .nr-types{display:flex;gap:14px}',
    '.nr-form .nr-types label{display:inline-flex;gap:5px;align-items:center;margin:0;color:var(--ink);font-size:14px;cursor:pointer}',
    '.nr-form .nr-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}',
    '.nr-form .nr-btns button{border:1px solid var(--line);background:var(--paper);color:var(--ink);padding:5px 12px}',
    '.nr-form .nr-btns button.ok{background:var(--accent);border-color:var(--accent);color:var(--paper);font-weight:600}',
    '.nr-form .nr-btns button:disabled{opacity:.5;cursor:wait}',
    'mark.nr-mark{background:rgba(232,190,40,.32);color:inherit;border-bottom:2px solid #d9a400;border-radius:2px;cursor:pointer;padding:0}',
    'mark.nr-mark.modification{background:rgba(220,80,60,.16);border-bottom-color:#c0503c}',
    'mark.nr-mark.fait{background:transparent;border-bottom:1px dashed var(--muted)}',
    'mark.nr-mark.flash{animation:nr-flash 1.4s ease}',
    '@keyframes nr-flash{0%,60%{background:rgba(232,190,40,.85)}}',
    '#nr-ajout{position:fixed;z-index:45;font:600 13px/1 "Inter",system-ui,sans-serif;padding:8px 12px;border-radius:999px;border:0;background:var(--ink);color:var(--paper);box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}',
    '#nr-ajout[hidden]{display:none}',
    '@media (pointer:coarse){#nr-ajout{left:50%!important;top:auto!important;bottom:18px;transform:translateX(-50%);padding:12px 18px;font-size:15px}}',
    '@media print{#nr-panel,#nr-ajout,.nr-ouvrir{display:none!important}mark.nr-mark{background:none;border:0}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- Interface ---------- */
  var el = function (tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };

  var ouvrir = el('button', 'nr-ouvrir');
  ouvrir.type = 'button';
  ouvrir.title = 'Notes de relecture : sélectionne un passage pour en ajouter une';
  var bar = document.querySelector('.bar');
  (bar || document.body).appendChild(ouvrir);

  var panel = el('aside');
  panel.id = 'nr-panel';
  panel.setAttribute('aria-label', 'Notes de relecture');
  var tete = el('div', 'nr-tete');
  tete.appendChild(el('h2', null, '📝 Notes de relecture'));
  var fermer = el('button', 'nr-x', '×');
  fermer.type = 'button';
  fermer.setAttribute('aria-label', 'Fermer');
  tete.appendChild(fermer);
  var onglets = el('div', 'nr-onglets');
  var corps = el('div', 'nr-corps');
  panel.appendChild(tete);
  panel.appendChild(onglets);
  panel.appendChild(corps);
  document.body.appendChild(panel);

  var ajout = el('button', null, '📝 Ajouter une note');
  ajout.id = 'nr-ajout';
  ajout.type = 'button';
  ajout.hidden = true;
  document.body.appendChild(ajout);

  var estOuvert = function () { return document.body.classList.contains('nr-open'); };
  var basculer = function (oui) {
    document.body.classList.toggle('nr-open', oui);
    ls('ouvert', oui ? '1' : '0');
    if (oui) charger();
  };
  ouvrir.addEventListener('click', function () { basculer(!estOuvert()); });
  fermer.addEventListener('click', function () { basculer(false); });

  /* ---------- Texte du script : index et ancrage ---------- */
  function indexer() {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, nodes = [], txt = '';
    while ((n = w.nextNode())) { nodes.push({ n: n, s: txt.length }); txt += n.data; }
    return { nodes: nodes, txt: txt };
  }

  function offsetDe(container, offset) {
    var r = document.createRange();
    r.setStart(root, 0);
    r.setEnd(container, offset);
    return r.toString().length;
  }

  function communFin(a, b) { var i = 0; while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++; return i; }
  function communDebut(a, b) { var i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }

  function localiser(nt, txt) {
    var q = String(nt.passage || '');
    if (!q) return -1;
    var avant = String(nt.avant || ''), apres = String(nt.apres || '');
    var best = -1, score = -Infinity, i = txt.indexOf(q);
    while (i !== -1) {
      var s = communFin(txt.slice(Math.max(0, i - avant.length), i), avant) +
              communDebut(txt.substr(i + q.length, apres.length), apres) -
              Math.abs(i - (Number(nt.pos) || 0)) / 1e7;
      if (s > score) { score = s; best = i; }
      i = txt.indexOf(q, i + 1);
    }
    return best;
  }

  var PARENTS_INTERDITS = /^(TABLE|TBODY|THEAD|TFOOT|TR|UL|OL|DL|SELECT)$/;

  function surligner(debut, fin, nt) {
    var ix = indexer(), segs = [];
    ix.nodes.forEach(function (e) {
      var a = e.s, b = e.s + e.n.data.length;
      if (b <= debut || a >= fin) return;
      segs.push({ n: e.n, de: Math.max(0, debut - a), a: Math.min(e.n.data.length, fin - a) });
    });
    segs.forEach(function (sg) {
      var node = sg.n;
      if (sg.a < node.data.length) node.splitText(sg.a);
      if (sg.de > 0) node = node.splitText(sg.de);
      if (!/\S/.test(node.data) || PARENTS_INTERDITS.test(node.parentNode.nodeName)) return;
      var m = el('mark', 'nr-mark ' + typeCle(nt.type) + (estFaite(nt) ? ' fait' : ''));
      m.dataset.nr = nt.id;
      m.title = (nt.type || 'Note') + ' — ' + (nt.auteur || '');
      node.parentNode.insertBefore(m, node);
      m.appendChild(node);
    });
  }

  function effacerMarques() {
    root.querySelectorAll('mark.nr-mark').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }

  var typeCle = function (t) { return t === 'Modification' ? 'modification' : 'remarque'; };
  var estFaite = function (nt) { return nt.statut === 'traitée'; };

  function appliquer() {
    effacerMarques();
    var txt = indexer().txt;
    notes.forEach(function (nt) { nt._at = localiser(nt, txt); });
    notes.filter(function (nt) { return nt._at >= 0; })
      .forEach(function (nt) { surligner(nt._at, nt._at + String(nt.passage).length, nt); });
    var ouvertes = notes.filter(function (nt) { return !estFaite(nt); }).length;
    ouvrir.textContent = '📝 Relecture' + (ouvertes ? ' (' + ouvertes + ')' : '');
    rendre();
  }

  /* ---------- Rendu du panneau ---------- */
  function rendre(etat, erreur) {
    onglets.innerHTML = '';
    [['ouvertes', 'À traiter', notes.filter(function (n) { return !estFaite(n); }).length],
     ['faites', 'Traitées', notes.filter(estFaite).length],
     ['toutes', 'Toutes', notes.length]].forEach(function (o) {
      var b = el('button', o[0] === filtre ? 'on' : null, o[1] + ' (' + o[2] + ')');
      b.type = 'button';
      b.addEventListener('click', function () { filtre = o[0]; ls('filtre', filtre); rendre(); });
      onglets.appendChild(b);
    });

    corps.innerHTML = '';
    if (brouillon) corps.appendChild(formulaire());
    else corps.appendChild(el('p', 'nr-aide', 'Sélectionne un passage du script, puis clique sur « Ajouter une note ».'));

    if (!API) { corps.appendChild(el('p', 'nr-etat err', 'Le stockage des notes n’est pas encore branché.')); return; }
    if (erreur) corps.appendChild(el('p', 'nr-etat err', erreur));
    if (etat) { corps.appendChild(el('p', 'nr-etat', etat)); return; }

    var liste = notes.filter(function (n) {
      return filtre === 'toutes' || (filtre === 'faites' ? estFaite(n) : !estFaite(n));
    }).sort(function (a, b) {
      var pa = a._at < 0 ? Infinity : a._at, pb = b._at < 0 ? Infinity : b._at;
      return pa - pb || String(a.date).localeCompare(String(b.date));
    });
    if (!liste.length) corps.appendChild(el('p', 'nr-etat', filtre === 'faites' ? 'Aucune note traitée.' : 'Aucune note pour l’instant.'));
    liste.forEach(function (nt) { corps.appendChild(carte(nt)); });
  }

  function carte(nt) {
    var c = el('div', 'nr-carte' + (estFaite(nt) ? ' fait' : ''));
    c.dataset.nr = nt.id;
    var meta = el('div', 'nr-meta');
    meta.appendChild(el('span', 'nr-type ' + typeCle(nt.type), nt.type || 'Remarque'));
    meta.appendChild(el('strong', null, nt.auteur || 'Anonyme'));
    var d = new Date(nt.date);
    if (!isNaN(d)) meta.appendChild(el('span', null, '· ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })));
    c.appendChild(meta);
    if (nt.section) c.appendChild(el('div', 'nr-section', nt.section));
    var cite = el('button', 'nr-cite' + (nt._at < 0 ? ' perdu' : ''), '« ' + citation(nt) + ' »');
    cite.type = 'button';
    cite.title = nt._at < 0 ? 'Ce passage a été modifié ou supprimé du script' : 'Aller au passage';
    cite.addEventListener('click', function () { if (nt._at >= 0) allerAuPassage(nt.id); });
    c.appendChild(cite);
    c.appendChild(el('div', 'nr-texte', nt.note));
    var act = el('div', 'nr-actions');
    var st = el('button', null, estFaite(nt) ? '↺ Rouvrir' : '✓ Traitée');
    st.type = 'button';
    st.addEventListener('click', function () {
      action({ action: 'statut', id: nt.id, statut: estFaite(nt) ? 'à traiter' : 'traitée' });
    });
    act.appendChild(st);
    if (mesCles[nt.id]) {
      var sup = el('button', null, 'Supprimer');
      sup.type = 'button';
      sup.addEventListener('click', function () {
        if (sup.dataset.confirme) { action({ action: 'supprimer', id: nt.id, cle: mesCles[nt.id] }); return; }
        sup.dataset.confirme = '1';
        sup.textContent = 'Confirmer ?';
      });
      act.appendChild(sup);
    }
    c.appendChild(act);
    return c;
  }

  /* Texte du passage pour l'affichage : « / » entre deux blocs (répliques, paragraphes) */
  function citation(nt) {
    var ms = root.querySelectorAll('mark.nr-mark[data-nr="' + nt.id + '"]');
    if (!ms.length) return nt.passage;
    var out = '', bloc = null;
    ms.forEach(function (m) {
      var b = m.closest('p,li,td,th,h1,h2,h3,h4,blockquote,div');
      if (out && b !== bloc) out += ' / ';
      out += m.textContent;
      bloc = b;
    });
    return out;
  }

  function formulaire() {
    var f = el('form', 'nr-form');
    f.appendChild(el('div', 'nr-section', brouillon.section || ''));
    var cite = el('div', 'nr-cite', '« ' + (brouillon.apercu || brouillon.passage) + ' »');
    f.appendChild(cite);

    f.appendChild(el('label', null, 'Ton nom'));
    var nom = el('input');
    nom.type = 'text'; nom.maxLength = 60; nom.required = true;
    nom.value = ls('nom') || '';
    nom.addEventListener('input', function () { ls('nom', nom.value.trim()); });
    f.appendChild(nom);

    f.appendChild(el('label', null, 'Type'));
    var types = el('div', 'nr-types');
    ['Modification', 'Remarque'].forEach(function (t) {
      var l = el('label'), r = el('input');
      r.type = 'radio'; r.name = 'nr-type'; r.value = t; r.checked = (brouillon.type || 'Modification') === t;
      r.addEventListener('change', function () { brouillon.type = t; });
      l.appendChild(r);
      l.appendChild(document.createTextNode(t));
      types.appendChild(l);
    });
    f.appendChild(types);

    f.appendChild(el('label', null, 'Note'));
    var ta = el('textarea');
    ta.maxLength = 3000; ta.required = true;
    ta.placeholder = 'Ce qu’il faut changer, ou ta remarque…';
    ta.value = brouillon.note || '';
    ta.addEventListener('input', function () { brouillon.note = ta.value; });
    f.appendChild(ta);

    var btns = el('div', 'nr-btns');
    var annuler = el('button', null, 'Annuler');
    annuler.type = 'button';
    annuler.addEventListener('click', function () { brouillon = null; rendre(); });
    var ok = el('button', 'ok', envoiEnCours ? 'Envoi…' : 'Enregistrer');
    ok.type = 'submit';
    ok.disabled = envoiEnCours || !API;
    btns.appendChild(annuler);
    btns.appendChild(ok);
    f.appendChild(btns);

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (envoiEnCours || !ta.value.trim() || !nom.value.trim()) return;
      ls('nom', nom.value.trim());
      var cle = Math.random().toString(36).slice(2) + Date.now().toString(36);
      var d = {
        action: 'ajouter', auteur: nom.value.trim(), type: brouillon.type || 'Modification',
        passage: brouillon.passage, avant: brouillon.avant, apres: brouillon.apres, pos: brouillon.pos,
        section: brouillon.section, note: ta.value.trim(), cle: cle
      };
      envoiEnCours = true;
      ok.disabled = true; ok.textContent = 'Envoi…';
      envoyer(d).then(function (r) {
        mesCles[r.id] = cle;
        ls('cles', JSON.stringify(mesCles));
        brouillon = null;
        envoiEnCours = false;
        return charger();
      }).catch(function (err) {
        envoiEnCours = false;
        rendre(null, 'Échec de l’enregistrement : ' + err.message + '. Réessaie.');
      });
    });
    setTimeout(function () { (nom.value ? ta : nom).focus(); }, 50);
    return f;
  }

  function allerAuPassage(id) {
    var m = root.querySelector('mark.nr-mark[data-nr="' + id + '"]');
    if (!m) return;
    m.scrollIntoView({ behavior: 'smooth', block: 'center' });
    root.querySelectorAll('mark.nr-mark[data-nr="' + id + '"]').forEach(function (x) {
      x.classList.remove('flash'); void x.offsetWidth; x.classList.add('flash');
    });
    if (window.matchMedia('(max-width:900px)').matches) basculer(false);
  }

  /* ---------- Sélection → bouton « Ajouter une note » ---------- */
  function selectionCourante() {
    var s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    var r = s.getRangeAt(0);
    if (!root.contains(r.commonAncestorContainer)) return null;
    var txt = indexer().txt;
    var debut = offsetDe(r.startContainer, r.startOffset), fin = offsetDe(r.endContainer, r.endOffset);
    while (debut < fin && /\s/.test(txt[debut])) debut++;
    while (fin > debut && /\s/.test(txt[fin - 1])) fin--;
    if (fin - debut < 2) return null;
    if (fin - debut > 1500) fin = debut + 1500;
    var section = '';
    root.querySelectorAll('h2, h1').forEach(function (h) {
      if (h.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) section = h.textContent.trim();
    });
    return {
      rect: r.getBoundingClientRect(), passage: txt.slice(debut, fin), pos: debut,
      apercu: s.toString().trim().replace(/\s*\n+\s*/g, ' / ').slice(0, 1500),
      avant: txt.slice(Math.max(0, debut - 40), debut), apres: txt.slice(fin, fin + 40), section: section
    };
  }

  var selEnCours = null, minuterie = null;
  function majBoutonAjout() {
    selEnCours = selectionCourante();
    if (!selEnCours) { ajout.hidden = true; return; }
    var r = selEnCours.rect;
    ajout.hidden = false;
    var top = r.top - 44;
    if (top < 60) top = r.bottom + 8;
    ajout.style.top = Math.round(top) + 'px';
    ajout.style.left = Math.round(Math.min(window.innerWidth - 190, Math.max(8, r.left + r.width / 2 - 85))) + 'px';
  }
  document.addEventListener('selectionchange', function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(majBoutonAjout, 250);
  });
  window.addEventListener('scroll', function () { if (!ajout.hidden) majBoutonAjout(); }, { passive: true });
  ajout.addEventListener('mousedown', function (e) { e.preventDefault(); });
  ajout.addEventListener('click', function () {
    if (!selEnCours) return;
    brouillon = {
      passage: selEnCours.passage, avant: selEnCours.avant, apres: selEnCours.apres,
      pos: selEnCours.pos, section: selEnCours.section, apercu: selEnCours.apercu, type: 'Modification', note: ''
    };
    ajout.hidden = true;
    var s = window.getSelection(); if (s) s.removeAllRanges();
    basculer(true);
    rendre();
  });

  /* Clic sur un passage surligné → sa note dans le panneau */
  root.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('mark.nr-mark');
    if (!m || !window.getSelection().isCollapsed) return;
    var id = m.dataset.nr, nt = notes.filter(function (n) { return n.id === id; })[0];
    if (nt && filtre !== 'toutes' && (filtre === 'faites') !== estFaite(nt)) { filtre = 'toutes'; }
    basculer(true);
    rendre();
    var c = corps.querySelector('.nr-carte[data-nr="' + id + '"]');
    if (c) {
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      c.classList.add('flash');
      setTimeout(function () { c.classList.remove('flash'); }, 1600);
    }
  });

  /* ---------- Échanges avec le stockage ---------- */
  var chargement = null;
  function charger() {
    if (!API) { appliquer(); return Promise.resolve(); }
    if (chargement) return chargement;
    if (!notes.length) rendre('Chargement des notes…');
    chargement = fetch(API + (API.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) { notes = Array.isArray(d) ? d : []; appliquer(); })
      .catch(function () { rendre(null, 'Impossible de charger les notes. Vérifie ta connexion.'); })
      .then(function () { chargement = null; });
    return chargement;
  }

  function envoyer(d) {
    return fetch(API, { method: 'POST', body: JSON.stringify(d) })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r || !r.ok) throw new Error((r && r.erreur) || 'erreur inconnue'); return r; });
  }

  function action(d) {
    envoyer(d).then(function () {
      if (d.action === 'supprimer') { delete mesCles[d.id]; ls('cles', JSON.stringify(mesCles)); }
      return charger();
    }).catch(function (err) { rendre(null, 'Action impossible : ' + err.message); });
  }

  /* Démarrage + rafraîchissement régulier tant que l'onglet est visible */
  charger();
  if (ls('ouvert') === '1') basculer(true);
  setInterval(function () { if (!document.hidden && !brouillon) charger(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !brouillon) charger(); });
})();
