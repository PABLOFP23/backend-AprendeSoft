
//proteger rutas verifica cada peticion y da o no acceso.

const jwt = require('jsonwebtoken');

// Middleware para verificar el token
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']; //bearer indica el tipo de token
  const token = authHeader && authHeader.split(' ')[1]; //solo el token toma aqui

  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); //Verifica token
    req.user = decoded; // guardamos los datos del usuario (id, rol, etc.)
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
