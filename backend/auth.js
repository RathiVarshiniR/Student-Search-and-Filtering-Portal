const jwt = require('jsonwebtoken');

// In production, set JWT_SECRET as an environment variable.
// A random fallback is used so the app still runs out of the box for local/demo use,
// but tokens won't survive a server restart if you rely on the fallback.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn(
    '[auth] JWT_SECRET not set in environment — using an auto-generated ' +
    'secret for this run only. Set JWT_SECRET for a stable secret across restarts.'
  );
  return require('crypto').randomBytes(32).toString('hex');
})();

const TOKEN_EXPIRY = '8h';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.display_name },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { signToken, authenticate, requireRole };
