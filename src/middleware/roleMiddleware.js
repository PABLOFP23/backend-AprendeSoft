// Middleware para validar roles
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
  //usar rol o role para comptaiblidad
    const userRole = req.user.rol || req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }

    next();
  };
}

module.exports = authorizeRoles;
