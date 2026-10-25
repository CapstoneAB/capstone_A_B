const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {checkPasswordStrength, hashPassword, verifyPassword} = require('./passwords');

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
// Same email check as js/login.js
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const TOKEN_LIFETIME_SECONDS = 60 * 60;
const LOGIN_FAILED = 'Invalid email or password';

// Express 4 does not catch errors from async handlers, so pass them to next()
const asyncRoute = handler => (req, res, next) => handler(req, res).catch(next);
const normaliseEmail = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const publicUser = user => ({user_id: user.user_id, username: user.username, email: user.email});

function createAuthRouter(db, options) {
  const {jwtSecret} = options;
  if (!jwtSecret) throw new Error('createAuthRouter needs a jwtSecret');
  const router = express.Router();
  // Hash of a random password, compared against when the email is unknown so a
  // failed login takes the same time whether or not the email is registered
  const dummyHash = hashPassword(crypto.randomBytes(16).toString('hex'));

  const findByUsername = db.prepare('SELECT user_id FROM users WHERE username = ?');
  const findByEmail = db.prepare('SELECT user_id, username, email, password_hash FROM users WHERE email = ?');
  const insertUser = db.prepare('INSERT INTO users(username, email, password_hash) VALUES (?, ?, ?)');

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

    const token = jwt.sign({username: user.username}, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: TOKEN_LIFETIME_SECONDS,
      subject: String(user.user_id),
      jwtid: crypto.randomUUID()
    });
    res.json({token, expires_in: TOKEN_LIFETIME_SECONDS, user: publicUser(user)});
  }));

  return router;
}

module.exports = {createAuthRouter, TOKEN_LIFETIME_SECONDS};
