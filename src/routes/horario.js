const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/horarioController');

router.use(auth);

// listado general (admin puede filtrar)
router.get('/', authorizeRoles('admin'), ctrl.listar);

// listar horario de un profesor (admin o propio profesor)
router.get('/profesor/:profesor_id', ctrl.listarPorProfesor);

// endpoint para profesor autenticado obtener su horario
router.get('/mi', authorizeRoles('profesor'), ctrl.listarMiHorario);

router.get('/curso/:curso_id',
  authorizeRoles('admin','profesor','estudiante','padre'),
  (req, res) => {
    req.query.curso_id = req.params.curso_id;
    return ctrl.listar(req, res);
  }
);
// CRUD (admin)
router.post('/', authorizeRoles('admin'), ctrl.crear);
router.put('/:id', authorizeRoles('admin'), ctrl.editar);
router.delete('/:id', authorizeRoles('admin'), ctrl.eliminar);

module.exports = router;