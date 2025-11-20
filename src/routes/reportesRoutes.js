const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Reportes estudiante
router.post('/estudiante', authorizeRoles('admin','profesor'), reportesController.crearReporteEstudiante);
router.get('/estudiante', authorizeRoles('admin','profesor','estudiante'), reportesController.listarReportesEstudiante);
router.put('/estudiante/:id', authorizeRoles('admin','profesor'), reportesController.editarReporteEstudiante);

// Reportes curso
router.post('/curso', authorizeRoles('admin','profesor'), reportesController.crearReporteCurso);
router.get('/curso', authorizeRoles('admin','profesor'), reportesController.listarReportesCurso);
router.put('/curso/:id', authorizeRoles('admin','profesor'), reportesController.editarReporteCurso);

module.exports = router;