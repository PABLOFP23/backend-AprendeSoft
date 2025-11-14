const express = require('express');
const router = express.Router();

// Aquí agregamos tus routers existentes, sin tocarlos
router.use('/auth', require('./auth'));
router.use('/asistencia', require('./asistencia'));
router.use('/cursos', require('./courses'));
router.use('/protected', require('./protected'));
router.use('/padres', require('./padres'));

module.exports = router;
