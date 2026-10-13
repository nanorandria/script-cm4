// API du site du script CM4 (lue et écrite par ../notes.js et ../references.js).
//
// Notes de relecture
//   GET  /            → liste des notes (sans la clé de suppression)
//   POST /            → { action: 'ajouter' | 'statut' | 'supprimer', ... }
// Références (liens et audios attachés à un titre, une mention LED/PLATEAU/FX ou une chanson)
//   GET  /refs        → liste des références
//   POST /refs        → JSON { action: 'lien' | 'supprimer', ... }
//                       ou formulaire multipart (champ « fichier ») pour envoyer un audio
//   GET  /audio/<id>  → le fichier audio (avec prise en charge des plages pour Safari)

const COLONNES = 'id, date, auteur, type, passage, avant, apres, pos, section, note, statut';
const COLONNES_REFS = 'id, date, auteur, cible, cible2, label, genre, url, titre, taille';
const ORIGINES = ['https://nanorandria.github.io', 'http://127.0.0.1:8765'];
const AUDIO_MAX = 20 * 1024 * 1024;
const EXT_AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|aif|aiff|caf)$/i;

const txt = (v, max) => String(v ?? '').slice(0, max);

export default {
  async fetch(req, env) {
    const origine = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINES.includes(origine) ? origine : ORIGINES[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const json = (o, status = 200) => new Response(JSON.stringify(o), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const chemin = new URL(req.url).pathname;
    if (chemin.startsWith('/audio/')) return audio(req, env, chemin.slice(7), cors);
    if (chemin === '/refs') return refs(req, env, json);
    if (chemin !== '/') return json({ ok: false, erreur: 'Introuvable' }, 404);

    if (req.method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT ${COLONNES} FROM notes ORDER BY date`).all();
      return json(results);
    }

    if (req.method !== 'POST') return json({ ok: false, erreur: 'Méthode non permise' }, 405);

    let d;
    try { d = await req.json(); } catch { return json({ ok: false, erreur: 'Requête invalide' }, 400); }

    if (d.action === 'ajouter') {
      const note = txt(d.note, 3000).trim();
      const passage = txt(d.passage, 1500);
      if (!note || !passage) return json({ ok: false, erreur: 'Note vide' });
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO notes (id, date, auteur, type, passage, avant, apres, pos, section, note, statut, cle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        id, new Date().toISOString(), txt(d.auteur, 60).trim() || 'Anonyme',
        d.type === 'Remarque' ? 'Remarque' : 'Modification',
        passage, txt(d.avant, 60), txt(d.apres, 60), Number(d.pos) || 0,
        txt(d.section, 200), note, 'à traiter', txt(d.cle, 64)
      ).run();
      return json({ ok: true, id });
    }

    if (d.action === 'statut') {
      const r = await env.DB.prepare('UPDATE notes SET statut = ? WHERE id = ?')
        .bind(d.statut === 'traitée' ? 'traitée' : 'à traiter', txt(d.id, 64)).run();
      return json(r.meta.changes ? { ok: true } : { ok: false, erreur: 'Note introuvable' });
    }

    if (d.action === 'supprimer') {
      const r = await env.DB.prepare("DELETE FROM notes WHERE id = ? AND cle = ? AND cle <> ''")
        .bind(txt(d.id, 64), txt(d.cle, 64)).run();
      return json(r.meta.changes ? { ok: true } : { ok: false, erreur: "Seul l'auteur peut supprimer cette note" });
    }

    return json({ ok: false, erreur: 'Action inconnue' }, 400);
  },
};

async function refs(req, env, json) {
  if (req.method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT ${COLONNES_REFS} FROM refs ORDER BY date`).all();
    return json(results);
  }
  if (req.method !== 'POST') return json({ ok: false, erreur: 'Méthode non permise' }, 405);

  const inserer = (id, d, genre, url, taille) => env.DB.prepare(
    'INSERT INTO refs (id, date, auteur, cible, cible2, label, genre, url, titre, taille, cle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, new Date().toISOString(), txt(d.auteur, 60).trim() || 'Anonyme',
    txt(d.cible, 300), txt(d.cible2, 300), txt(d.label, 200), genre, url,
    txt(d.titre, 200).trim(), taille, txt(d.cle, 64)
  ).run();

  // Envoi d'un fichier audio
  if ((req.headers.get('Content-Type') || '').startsWith('multipart/form-data')) {
    if (Number(req.headers.get('Content-Length') || 0) > AUDIO_MAX + 200000) {
      return json({ ok: false, erreur: 'Fichier trop lourd (20 Mo maximum)' }, 413);
    }
    let f;
    try { f = await req.formData(); } catch { return json({ ok: false, erreur: 'Envoi invalide' }, 400); }
    const fichier = f.get('fichier');
    const d = Object.fromEntries([...f.entries()].filter(([k]) => k !== 'fichier'));
    if (!fichier || typeof fichier === 'string') return json({ ok: false, erreur: 'Aucun fichier' });
    if (!txt(d.cible, 300)) return json({ ok: false, erreur: 'Emplacement manquant' });
    if (fichier.size > AUDIO_MAX) return json({ ok: false, erreur: 'Fichier trop lourd (20 Mo maximum)' });
    const type = fichier.type || '';
    if (!type.startsWith('audio/') && !EXT_AUDIO.test(fichier.name || '')) {
      return json({ ok: false, erreur: 'Ce fichier n’est pas un audio' });
    }
    const id = crypto.randomUUID();
    await env.AUDIO.put(id, await fichier.arrayBuffer(), {
      metadata: { type: type.startsWith('audio/') ? type : 'audio/mpeg', nom: txt(fichier.name, 200) },
    });
    if (!txt(d.titre, 200).trim()) d.titre = txt(fichier.name, 200).replace(/\.[^.]+$/, '');
    await inserer(id, d, 'audio', '/audio/' + id, fichier.size);
    return json({ ok: true, id });
  }

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, erreur: 'Requête invalide' }, 400); }

  if (d.action === 'lien') {
    const url = txt(d.url, 1000).trim();
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return json({ ok: false, erreur: 'Lien invalide (il doit commencer par http:// ou https://)' });
    if (!txt(d.cible, 300)) return json({ ok: false, erreur: 'Emplacement manquant' });
    const id = crypto.randomUUID();
    await inserer(id, d, 'lien', url, null);
    return json({ ok: true, id });
  }

  if (d.action === 'supprimer') {
    const id = txt(d.id, 64);
    const r = await env.DB.prepare("DELETE FROM refs WHERE id = ? AND cle = ? AND cle <> '' RETURNING genre")
      .bind(id, txt(d.cle, 64)).all();
    if (!r.results.length) return json({ ok: false, erreur: "Seul l'auteur peut supprimer cette référence" });
    if (r.results[0].genre === 'audio') await env.AUDIO.delete(id);
    return json({ ok: true });
  }

  return json({ ok: false, erreur: 'Action inconnue' }, 400);
}

async function audio(req, env, id, cors) {
  const { value, metadata } = await env.AUDIO.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!value) return new Response('Introuvable', { status: 404, headers: cors });
  const total = value.byteLength;
  const entetes = {
    ...cors,
    'Content-Type': (metadata && metadata.type) || 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  const plage = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('Range') || '');
  if (plage && (plage[1] || plage[2])) {
    let debut = plage[1] ? Number(plage[1]) : Math.max(0, total - Number(plage[2]));
    let fin = plage[1] && plage[2] ? Math.min(Number(plage[2]), total - 1) : total - 1;
    if (debut >= total || debut > fin) {
      return new Response(null, { status: 416, headers: { ...entetes, 'Content-Range': `bytes */${total}` } });
    }
    return new Response(value.slice(debut, fin + 1), {
      status: 206,
      headers: { ...entetes, 'Content-Range': `bytes ${debut}-${fin}/${total}`, 'Content-Length': String(fin - debut + 1) },
    });
  }
  return new Response(value, { headers: { ...entetes, 'Content-Length': String(total) } });
}
