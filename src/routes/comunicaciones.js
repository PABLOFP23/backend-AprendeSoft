const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/comunicacionesController');

router.use(auth);

// enviar comunicación a padres de un estudiante (profesor/admin)
router.post('/enviar', authorizeRoles('profesor','admin'), ctrl.enviarComunicacion);

router.get('/', ctrl.listarRecibidas);


module.exports = router;