const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/citacionesController');

router.use(auth);

// Enviar citación (profesor/admin)
router.post('/', authorizeRoles('profesor','admin'), ctrl.enviarCitacion);

router.get('/', ctrl.listarRecibidas);

module.exports = router;