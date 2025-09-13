// middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware para verificar el token
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']; // bearer token
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // guardamos datos del usuario (id, rol, username, etc.)
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware para autorizar roles
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { authMiddleware, authorizeRoles };
