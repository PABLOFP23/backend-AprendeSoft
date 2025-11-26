const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/eventosController');

router.use(auth);

router.get('/', ctrl.listar);
router.post('/', authorizeRoles('profesor','admin'), ctrl.crear);
router.put('/:id', authorizeRoles('profesor','admin'), ctrl.editar);
router.delete('/:id', authorizeRoles('profesor','admin'), ctrl.eliminar);

module.exports = router;