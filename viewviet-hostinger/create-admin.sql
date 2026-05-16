-- Create the default admin account
-- Password below is: admin123
-- IMPORTANT: Change the password after first login via the admin panel

INSERT INTO users (username, email, password_hash, role, display_name)
VALUES (
  'admin',
  'admin@viewviet.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'Administrator'
)
ON CONFLICT (email) DO NOTHING;
