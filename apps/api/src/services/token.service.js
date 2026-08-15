const jwt = require("jsonwebtoken");

const cookieSecure = () =>
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

const cookieSameSite = () => process.env.COOKIE_SAME_SITE || (cookieSecure() ? "none" : "lax");

const generateToken = (user, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: cookieSameSite(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

const clearToken = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: cookieSecure(),
    sameSite: cookieSameSite(),
  });
};

module.exports = { generateToken, clearToken };
