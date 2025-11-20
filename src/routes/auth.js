const express = require('express');
const router = express.Router();
const { register, login, adminCreateUser } = require('../controllers/authController');
const usersController = require('../controllers/usersController'); // <-- nuevo
const authorizeRoles = require('../middleware/roleMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { User } = require('../models/index');

// Registro de usuario
router.post('/register', register);

// Login
router.post('/login', login);

// Ver perfil del usuario
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id',
        'username',
        'nombre',
        'segundo_nombre',
        'apellido1',
        'apellido2',
        'email',
        'rol',
        'telefono',
        'direccion',
        'fecha_nacimiento',
        'foto',
        'activo'
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear usuario con rol (solo admin)
router.post('/admin/usuarios', authMiddleware, authorizeRoles('admin'), adminCreateUser);

// Listar usuarios (solo admin)
router.get('/admin/usuarios', authMiddleware, authorizeRoles('admin'), usersController.listUsers);

module.exports = router;