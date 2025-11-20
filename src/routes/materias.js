const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/materiasController');

router.use(auth);

// listar (cualquiera autenticado)
router.get('/', ctrl.listar);

// crear (admin/profesor)
router.post('/', authorizeRoles('admin','profesor'), ctrl.crear);

// asignar profesor/curso (admin)
router.post('/:id/asignar-profesor', authorizeRoles('admin'), ctrl.asignarProfesor);
router.post('/:id/asignar-curso', authorizeRoles('admin'), ctrl.asignarCurso);

module.exports = router;