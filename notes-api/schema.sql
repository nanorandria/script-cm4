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
