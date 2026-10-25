const jwt = require('jsonwebtoken');

const INVALID_TOKEN = 'Invalid or expired token';

// JWT "iat" is in whole seconds, so a token issued in the same second as a password
// change can't be told apart from one issued just before it. Rounding the change time
// up to the next second makes every token from that second stop working too.
const passwordChangedAtSeconds = text => (text ? Math.ceil(Date.parse(text) / 1000) : 0);

// Checks "Authorization: Bearer <token>" and puts the token claims and user on req.auth
function createRequireAuth(db, jwtSecret) {
  const isRevoked = db.prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?');
  const findById = db.prepare('SELECT user_id, username, email, password_changed_at FROM users WHERE user_id = ?');
  const reject = res => res.status(401).set('WWW-Authenticate', 'Bearer').json({error: INVALID_TOKEN});

  return function requireAuth(req, res, next) {
    const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
    if (!match) return reject(res);
    let claims;
    try {
      // Only HS256 is accepted, so "alg: none" or other algorithms are refused
      claims = jwt.verify(match[1], jwtSecret, {algorithms: ['HS256']});
    } catch {
      return reject(res);
    }
    if (typeof claims.jti !== 'string' || typeof claims.sub !== 'string' || !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp))
      return reject(res);
    if (isRevoked.get(claims.jti)) return reject(res);
    const user = findById.get(claims.sub);
    if (!user || claims.iat < passwordChangedAtSeconds(user.password_changed_at)) return reject(res);
    req.auth = {claims, user: {user_id: user.user_id, username: user.username, email: user.email}};
    next();
  };
}

module.exports = {createRequireAuth, passwordChangedAtSeconds};
