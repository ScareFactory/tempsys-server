-- Tabellen für Firmen und Nutzer
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  UNIQUE(company_id, username)
);

CREATE TABLE IF NOT EXISTS features (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS company_features (
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  feature_id INTEGER REFERENCES features(id) ON DELETE CASCADE,
  PRIMARY KEY(company_id, feature_id)
);