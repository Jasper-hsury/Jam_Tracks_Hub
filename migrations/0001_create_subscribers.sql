CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY,
    subscribed_at TEXT NOT NULL,
    source TEXT,
    page TEXT,
    user_agent TEXT
);
