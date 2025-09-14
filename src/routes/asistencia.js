const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ==================== RUTAS DE ASISTENCIA ====================

// Tomar asistencia (solo profesores y admin)
router.post(
  '/tomar',
  authorizeRoles('profesor', 'admin'),
  asistenciaController.tomarAsistencia
);

// Actualizar asistencia individual (profesores y admin)
router.put(
  '/:id',
  authorizeRoles('profesor', 'admin'),
  asistenciaController.actualizarAsistencia
);

// Obtener asistencia de un curso por fecha
router.get(
  '/curso/:curso_id/fecha/:fecha',
  asistenciaController.obtenerAsistenciaPorFecha
);

// Obtener historial de asistencia de un estudiante
router.get(
  '/estudiante/:estudiante_id/historial',
  asistenciaController.obtenerHistorialEstudiante
);

// Obtener reporte de asistencia de un curso
router.get(
  '/curso/:curso_id/reporte',
  authorizeRoles('profesor', 'admin'),
  asistenciaController.obtenerReporteCurso
);

// Justificar una falta (padres, profesores y admin)
router.put(
  '/:id/justificar',
  authorizeRoles('padre', 'profesor', 'admin'),
  asistenciaController.justificarFalta
);

// Configurar límites de asistencia para un curso
router.post(
  '/curso/:curso_id/configuracion',
  authorizeRoles('profesor', 'admin'),
  asistenciaController.configurarLimites
);

// Obtener configuración de asistencia de un curso
router.get(
  '/curso/:curso_id/configuracion',
  async (req, res) => {
    try {
      const { curso_id } = req.params;
      const { ConfigAsistencia } = require('../models');
      
      const config = await ConfigAsistencia.findOne({
        where: { curso_id }
      });

      if (!config) {
        return res.json({
          curso_id,
          limite_faltas_notificacion: 3,
          limite_faltas_alerta: 5,
          porcentaje_minimo_asistencia: 75,
          notificar_padres: true,
          notificar_cada_falta: false
        });
      }

      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener configuración' });
    }
  }
);

// Obtener resumen de asistencia del día (dashboard)
router.get(
  '/resumen/hoy',
  async (req, res) => {
    try {
      const { Asistencia, Curso, User } = require('../models');
      const { Op } = require('sequelize');
      const hoy = new Date().toISOString().split('T')[0];

      let whereClause = { fecha: hoy };

       // Si es profesor, solo sus cursos
      if (req.user.rol === 'profesor') {
        const cursos = await Curso.findAll({
          where: { profesor_id: req.user.id },
          attributes: ['id']
        });
        const cursosIds = cursos.map(c => c.id);
        whereClause.curso_id = { [Op.in]: cursosIds };
      }

      // Si es estudiante, solo su asistencia
      if (req.user.rol === 'estudiante') {
        whereClause.estudiante_id = req.user.id;
      }
   // Si es padre, asistencia de sus hijos
      if (req.user.rol === 'padre') {
        const { PadreEstudiante } = require('../models');
        const relaciones = await PadreEstudiante.findAll({
          where: { padre_id: req.user.id },
          attributes: ['estudiante_id']
        });
        const hijosIds = relaciones.map(r => r.estudiante_id);
        whereClause.estudiante_id = { [Op.in]: hijosIds };
      }

      const asistencias = await Asistencia.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'estudiante',
            attributes: ['nombre', 'apellido']
          },
          {
            model: Curso,
            attributes: ['nombre', 'grado', 'seccion']
          }
        ]
      });

      const resumen = {
        fecha: hoy,
        total: asistencias.length,
        presentes: asistencias.filter(a => a.estado === 'presente').length,
        ausentes: asistencias.filter(a => a.estado === 'ausente').length,
        tardanzas: asistencias.filter(a => a.estado === 'tardanza').length,
        justificados: asistencias.filter(a => a.estado === 'justificado').length,
        detalles: asistencias
      };

      res.json(resumen);
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      res.status(500).json({ error: 'Error al obtener resumen de asistencia' });
    }
  }
);

module.exports = router;
