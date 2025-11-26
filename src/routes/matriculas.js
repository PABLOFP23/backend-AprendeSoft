const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/matriculasController');

router.use(auth);

// listar matriculas con filtros (admin/profesor)
router.get('/', ctrl.listar);

// actualizar estado de matrícula (activar/desactivar)
router.put('/:id', authorizeRoles('admin','profesor'), ctrl.actualizar);

module.exports = router;