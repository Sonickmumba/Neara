const ensureAuth = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Unauthorized', });
  }
  next();
};

module.exports = ensureAuth;

