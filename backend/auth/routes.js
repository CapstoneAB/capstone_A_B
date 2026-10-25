const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {checkPasswordStrength, hashPassword, verifyPassword} = require('./passwords');
const {createRequireAuth, passwordChangedAtSeconds} = require('./middleware');

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
// Same email check as js/login.js
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const TOKEN_LIFETIME_SECONDS = 60 * 60;
const RESET_LIFETIME_SECONDS = 30 * 60;
const LOGIN_FAILED = 'Invalid email or password';
const RESET_SENT = 'If that email is registered, a reset link has been sent.';
const RESET_INVALID = 'This reset link is invalid or has expired.';
const RESET_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

// Express 4 does not catch errors from async handlers, so pass them to next()
const asyncRoute = handler => (req, res, next) => handler(req, res).catch(next);
const normaliseEmail = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');
// Only this hash is stored, so someone who reads the database can't use a reset link
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const nowSeconds = () => Math.floor(Date.now() / 1000);
const publicUser = user => ({user_id: user.user_id, username: user.username, email: user.email});

function createAuthRouter(db, options) {
  const {jwtSecret} = options;
  if (!jwtSecret) throw new Error('createAuthRouter needs a jwtSecret');
  // There is no email service yet: tests pass onResetToken, and in development the
  // token is printed to the server console. In production it is never printed.
  const onResetToken = options.onResetToken || (({userId, token}) => {
    if (process.env.NODE_ENV !== 'production')
      console.log(`Password reset token for user ${userId} (valid for 30 minutes): ${token}`);
  });
  const router = express.Router();
  // Hash of a random password, compared against when the email is unknown so a
  // failed login takes the same time whether or not the email is registered
  const dummyHash = hashPassword(crypto.randomBytes(16).toString('hex'));

  const findByUsername = db.prepare('SELECT user_id FROM users WHERE username = ?');
  const findByEmail = db.prepare('SELECT user_id, username, email, password_hash, password_changed_at FROM users WHERE email = ?');
  const insertUser = db.prepare('INSERT INTO users(username, email, password_hash) VALUES (?, ?, ?)');
  const requireAuth = createRequireAuth(db, jwtSecret);
  const removeExpiredRevoked = db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?');
  const revokeToken = db.prepare('INSERT OR IGNORE INTO revoked_tokens(jti, expires_at) VALUES (?, ?)');
  const logout = db.transaction((jti, expiresAt, now) => {
    removeExpiredRevoked.run(now);
    revokeToken.run(jti, expiresAt);
  });
  const removeOldResets = db.prepare('DELETE FROM password_resets WHERE expires_at < ? OR (user_id = ? AND used_at IS NULL)');
  const insertReset = db.prepare('INSERT INTO password_resets(user_id, token_hash, expires_at) VALUES (?, ?, ?)');
  // A new reset request replaces any earlier unused link for the same user
  const createReset = db.transaction((userId, tokenHash, now) => {
    removeOldResets.run(now, userId);
    insertReset.run(userId, tokenHash, now + RESET_LIFETIME_SECONDS);
  });
  const findReset = db.prepare('SELECT reset_id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?');
  const markResetUsed = db.prepare('UPDATE password_resets SET used_at = ? WHERE reset_id = ? AND used_at IS NULL');
  const updatePassword = db.prepare('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE user_id = ?');
  // Returns false if another request used the same link first
  const finishReset = db.transaction((resetId, userId, passwordHash, now) => {
    if (!markResetUsed.run(now, resetId).changes) return false;
    // password_changed_at makes every login token issued before now stop working
    updatePassword.run(passwordHash, new Date().toISOString(), userId);
    return true;
  });

  // Auth responses contain tokens and user details, so browsers and proxies must not cache them
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/register', asyncRoute(async (req, res) => {
    const {username, email, password} = req.body || {};
    const cleanEmail = normaliseEmail(email);
    const fields = {};
    if (typeof username !== 'string' || !USERNAME_PATTERN.test(username))
      fields.username = 'Username must be 3 to 20 characters: letters, numbers or underscore.';
    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > MAX_EMAIL_LENGTH)
      fields.email = 'Please enter a valid email address.';
    const failedRules = checkPasswordStrength(password);
    if (failedRules.length) fields.password = `Password needs ${failedRules.join(', ')}.`;
    if (Object.keys(fields).length) return res.status(400).json({error: 'Please fix the highlighted fields.', fields});

    const taken = {};
    if (findByUsername.get(username)) taken.username = 'That username is already taken.';
    if (findByEmail.get(cleanEmail)) taken.email = 'An account with that email already exists.';
    if (Object.keys(taken).length) return res.status(409).json({error: 'Username or email is already registered.', fields: taken});

    const passwordHash = await hashPassword(password);
    try {
      const result = insertUser.run(username, cleanEmail, passwordHash);
      res.status(201).json({user_id: Number(result.lastInsertRowid), username, email: cleanEmail});
    } catch (err) {
      // Another request registered the same name while we were hashing
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({error: 'Username or email is already registered.'});
      throw err;
    }
  }));

  router.post('/login', asyncRoute(async (req, res) => {
    const {email, password} = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password)
      return res.status(400).json({error: 'Email and password are required.'});
    const user = findByEmail.get(normaliseEmail(email));
    const passwordOk = await verifyPassword(password, user ? user.password_hash : await dummyHash);
    if (!user || !passwordOk) return res.status(401).json({error: LOGIN_FAILED});

    // Right after a password reset, issue the token from the rounded-up change time
    // (less than a second ahead) so requireAuth doesn't treat it as an old token
    const issuedAt = Math.max(Math.floor(Date.now() / 1000), passwordChangedAtSeconds(user.password_changed_at));
    const token = jwt.sign({username: user.username, iat: issuedAt}, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: TOKEN_LIFETIME_SECONDS,
      subject: String(user.user_id),
      jwtid: crypto.randomUUID()
    });
    res.json({token, expires_in: TOKEN_LIFETIME_SECONDS, user: publicUser(user)});
  }));

  router.get('/verify', requireAuth, (req, res) => res.json({valid: true, user: req.auth.user}));

  router.post('/logout', requireAuth, (req, res) => {
    // Old rows are cleared here because a token past its expiry is rejected anyway
    logout(req.auth.claims.jti, req.auth.claims.exp, nowSeconds());
    res.json({message: 'Logged out'});
  });

  // Same answer whether or not the email exists, so it can't be used to find accounts
  router.post('/forgot-password', (req, res) => {
    const user = findByEmail.get(normaliseEmail((req.body || {}).email));
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      createReset(user.user_id, sha256(token), nowSeconds());
      onResetToken({userId: user.user_id, email: user.email, token});
    }
    res.json({message: RESET_SENT});
  });

  router.post('/reset-password', asyncRoute(async (req, res) => {
    const {token, password} = req.body || {};
    const reset = typeof token === 'string' && RESET_TOKEN_PATTERN.test(token) && findReset.get(sha256(token), nowSeconds());
    if (!reset) return res.status(400).json({error: RESET_INVALID});
    // A weak password doesn't use up the link, so the user can try again
    const failedRules = checkPasswordStrength(password);
    if (failedRules.length)
      return res.status(400).json({error: 'Please choose a stronger password.', fields: {password: `Password needs ${failedRules.join(', ')}.`}});
    const passwordHash = await hashPassword(password);
    if (!finishReset(reset.reset_id, reset.user_id, passwordHash, nowSeconds())) return res.status(400).json({error: RESET_INVALID});
    res.json({message: 'Your password has been reset. Please log in with your new password.'});
  }));

  return router;
}

module.exports = {createAuthRouter, TOKEN_LIFETIME_SECONDS};
