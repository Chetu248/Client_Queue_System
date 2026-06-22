/**
 * Authentication Controller
 *
 * Hardcoded credentials for hackathon prototype.
 * In production: replace USERS lookup with Mongoose User.findOne() + bcrypt.compare().
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  || 'queuecure26-dev-secret-CHANGE-IN-PROD';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '10h'; // covers a full clinic day

// Static user store — swap for DB lookup in production
const USERS = [
  {
    id:    'user-reception-01',
    email: 'reception@queuecure.com',
    password: '123456',
    name: 'Reception Desk',
    role: 'receptionist',
  },
  {
    id:    'user-admin-01',
    email: 'admin@queuecure.com',
    password: '123456',
    name: 'System Admin',
    role: 'admin',
  },
];

/** POST /api/auth/login */
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    // Deliberately vague — don't reveal whether email or password was wrong
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  console.log(`[AUTH] Login: ${user.role} — ${user.email} @ ${new Date().toISOString()}`);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
};

/** GET /api/auth/verify  (protected) */
const verifyToken = (req, res) => {
  // authenticateToken middleware already validated — just echo the decoded user
  res.json({ valid: true, user: req.user });
};

module.exports = { login, verifyToken };
