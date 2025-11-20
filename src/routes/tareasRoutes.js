const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/tareasController');

router.use(auth);

// Profesor/Admin
router.post('/', authorizeRoles('profesor', 'admin'), ctrl.crearTarea);
router.get('/curso/:curso_id', authorizeRoles('profesor', 'admin'), ctrl.listarTareasCurso);
router.get('/tarea/:tarea_id/entregas', authorizeRoles('profesor', 'admin'), ctrl.listarEntregasDeTarea);

// Estudiante
router.get('/mias', authorizeRoles('estudiante'), ctrl.listarTareasEstudiante); // usa req.user.id
router.get('/estudiante/:estudiante_id', authorizeRoles('admin','profesor'), ctrl.listarTareasEstudiante);
router.post('/entregar', authorizeRoles('estudiante'), ctrl.entregarTarea);
router.put('/entrega/:entrega_id', authorizeRoles('estudiante'), ctrl.actualizarEntrega);
router.get('/mis-entregas', authorizeRoles('estudiante'), ctrl.misEntregas);

module.exports = router;