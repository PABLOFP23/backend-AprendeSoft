//rutas protegidas
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Ruta protegida con JWT
router.get('/profile', authMiddleware, (req, res) => {// se ingresa el token despues del bearer
  res.json({
    message: 'Accediste a una ruta protegida',
    userId: req.user.id
  });
});


module.exports = router;

