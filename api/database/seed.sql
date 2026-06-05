-- Echelon seed data — community users, events, posts (matches mob.tsx)
SET NAMES utf8mb4;

INSERT INTO users (id, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded) VALUES
('c9',  'Iris Moon',      '@irismoon',   '😍', '#FFD9B0', 4.90, 0.35, 1, 72, 58, 'ID-4951', 1),
('c1',  'Naomi Vale',     '@naomiglows', '🥰', '#FFD1E1', 4.80, 0.55, 1, 22, 28, 'ID-8698', 1),
('c2',  'Theo Brightman', '@theobright', '😁', '#D6ECFF', 4.60, 0.82, 1, 68, 38, 'ID-5912', 1),
('c3',  'Priya Sundara',  '@priyasun',   '😄', '#E6DBFF', 4.30, 0.72, 0, 48, 72, 'ID-3301', 1),
('c4',  'Marcus Bell',    '@marcusb',    '😊', '#CFF5E7', 4.10, 0.48, 1, 38, 48, 'ID-7720', 1),
('c5',  'Lena Park',      '@lenap',      '🙂', '#FFE6CF', 3.80, 0.91, 0, 55, 65, 'ID-1144', 1),
('c6',  'Davey Cruz',     '@daveyc',     '😀', '#FFE9A8', 3.40, 0.62, 1, 78, 68, 'ID-2188', 1),
('c10', 'Quinn Adeyemi',  '@quinnade',   '🙂', '#D9EEDD', 3.10, 1.35, 1, 15, 55, 'ID-9022', 1),
('c7',  'Rosa Klein',     '@rosak',      '😐', '#E4E1E8', 2.90, 1.80, 0, 30, 78, 'ID-6610', 1),
('c8',  'Sam Okafor',     '@samok',      '😕', '#E0D6D6', 2.30, 2.40, 1, 85, 25, 'ID-4409', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO events (id, name, type, emoji, scene_json, miles, req, venue, when_text) VALUES
('ev2', 'Pastel Bloom Pop-Up',   'Pop-Up',   '🌸', '["#FFD9E3","#E6DBFF"]', 0.8,  3.8, 'Lumen Court',        'Today · 4:00 PM'),
('ev7', 'Community Smile Walk',  'Wellness', '🚶', '["#D9EEDD","#EFF6E4"]', 0.5,  2.6, 'Riverside Path',     'Sat · 9:00 AM'),
('ev3', 'Sunrise Breathwork',    'Wellness', '🧘', '["#CFF5E7","#D8ECFF"]', 1.4,  3.2, 'Still Studio',       'Sun · 6:30 AM'),
('ev1', 'Rosewood Rooftop Gala', 'Gala',     '🥂', '["#FFE9A8","#FFD1E1"]', 2.1,  4.5, 'The Aerie',          'Sat · 8:00 PM'),
('ev5', 'Aura Members Mixer',    'Social',   '🍸', '["#E6DBFF","#D6ECFF"]', 3.2,  4.2, 'Tier Lounge',        'Fri · 9:00 PM'),
('ev4', 'Naomi & Theo: Vows',    'Wedding',  '💍', '["#FFF1D6","#FFD1E1"]', 5.6,  4.6, 'Glasshouse Gardens', 'Jun 14 · 5 PM'),
('ev6', 'Atelier Opening Night', 'Opening',  '🖼️', '["#FFE6CF","#FFE9A8"]', 7.9,  4.4, 'Maison Vell',        'Thu · 7:00 PM'),
('ev8', 'Golden Hour Supperclub','Social',   '🍽️', '["#FFD1E1","#FFE9A8"]', 12.3, 4.0, 'Vista Table',        'Sun · 6:00 PM'),
('ev9', 'Founders Skybox',       'Gala',     '🌃', '["#E6DBFF","#FFD1E1"]', 18.4, 4.8, 'Apex Tower',         'Sat · 10 PM')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO posts (id, author_id, caption, scene_json, emoji, likes, premium, ts) VALUES
('p1', 'c1', 'morning light + oat flat white. grateful for this little life 🤍', '["#FFD1E1","#FFE9A8"]', '🥐', 1284, 1, UNIX_TIMESTAMP(NOW()) * 1000 - 7200000),
('p2', 'c9', 'petals before pilates. choose softness today, loves ✨', '["#FFD9B0","#FFC6DA"]', '🌸', 2031, 1, UNIX_TIMESTAMP(NOW()) * 1000 - 10800000),
('p3', 'c3', 'sunday reset. fresh linens, fresh outlook, fresh me 💫', '["#E6DBFF","#D8ECFF"]', '🫧', 642, 0, UNIX_TIMESTAMP(NOW()) * 1000 - 14400000),
('p4', 'c4', 'matcha + a tiny gratitude list. what''s lighting you up?', '["#CFF5E7","#EFF6E4"]', '🍵', 318, 0, UNIX_TIMESTAMP(NOW()) * 1000 - 18000000),
('p5', 'c2', 'checked in early (priority lane, obviously). see you tier-side 😁', '["#D6ECFF","#FFE9A8"]', '🏝️', 1755, 1, UNIX_TIMESTAMP(NOW()) * 1000 - 21600000),
('p6', 'c5', 'trying to stay positive this week. sending warmth to everyone 🙂', '["#FFE6CF","#FFF1D6"]', '🌿', 96, 0, UNIX_TIMESTAMP(NOW()) * 1000 - 25200000)
ON DUPLICATE KEY UPDATE caption=VALUES(caption);
