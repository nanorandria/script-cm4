// Stockage des notes de relecture du site (lu et écrit par ../notes.js).
// GET  → liste des notes (sans la clé de suppression)
// POST → { action: 'ajouter' | 'statut' | 'supprimer', ... }

const COLONNES = 'id, date, auteur, type, passage, avant, apres, pos, section, note, statut';
const ORIGINES = ['https://nanorandria.github.io', 'http://127.0.0.1:8765'];

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

    if (req.method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT ${COLONNES} FROM notes ORDER BY date`).all();
      return json(results);
    }

    if (req.method !== 'POST') return json({ ok: false, erreur: 'Méthode non permise' }, 405);

    let d;
    try { d = await req.json(); } catch { return json({ ok: false, erreur: 'Requête invalide' }, 400); }
    const txt = (v, max) => String(v ?? '').slice(0, max);

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
