function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated" });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ ok: false, message: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
