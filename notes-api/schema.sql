CREATE TABLE IF NOT EXISTS notes (
  id      TEXT PRIMARY KEY,
  date    TEXT NOT NULL,
  auteur  TEXT NOT NULL,
  type    TEXT NOT NULL,
  passage TEXT NOT NULL,
  avant   TEXT,
  apres   TEXT,
  pos     INTEGER,
  section TEXT,
  note    TEXT NOT NULL,
  statut  TEXT NOT NULL DEFAULT 'à traiter',
  cle     TEXT
);

-- Références (lien ou audio) attachées à un titre, une mention LED/PLATEAU/FX ou une chanson
CREATE TABLE IF NOT EXISTS refs (
  id      TEXT PRIMARY KEY,
  date    TEXT NOT NULL,
  auteur  TEXT NOT NULL,
  cible   TEXT NOT NULL,  -- clé de l'emplacement (type|tableau|début du texte)
  cible2  TEXT,           -- clé de secours (type|tableau|#rang)
  label   TEXT,           -- description lisible de l'emplacement
  genre   TEXT NOT NULL,  -- 'lien' ou 'audio'
  url     TEXT NOT NULL,  -- lien externe, ou /audio/<id> pour un fichier
  titre   TEXT,
  taille  INTEGER,
  cle     TEXT
);
