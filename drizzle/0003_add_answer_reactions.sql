-- Add answer reactions and comments tables
CREATE TABLE answer_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_id INTEGER NOT NULL REFERENCES answers(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  reaction TEXT NOT NULL, -- 'like' or 'dislike'
  created_at TEXT NOT NULL
);

CREATE TABLE answer_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_id INTEGER NOT NULL REFERENCES answers(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL
);
