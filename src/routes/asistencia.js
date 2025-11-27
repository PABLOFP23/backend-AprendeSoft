const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
// storage para justificantes de asistencia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'asistencias');
    try { const fs = require('fs'); if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true }); cb(null, dest); } catch (err) { cb(err); }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });




// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ==================== RUTAS DE ASISTENCIA ====================

// Tomar asistencia (solo profesores y admin)
router.post(
  '/tomar',
  authorizeRoles('profesor', 'admin'),
  asistenciaController.tomarAsistencia
);

router.get(
  '/materias/mias',
  authorizeRoles('profesor','admin'),
  (req, res) => require('../controllers/asistenciaController').misMaterias(req, res)
);

// Roster por materia y fecha (profesor/admin)
router.get(
  '/materia/:materia_id/fecha/:fecha',
  authorizeRoles('profesor','admin'),
  (req, res) => require('../controllers/asistenciaController').obtenerAsistenciaPorMateriaFecha(req, res)
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
            attributes: ['id','nombre','apellido1','apellido2','email']
          },
          {
            model: Curso,
            as: 'curso', // <- alias correcto
            attributes: ['id','nombre','grado','grupo'] // 'grupo' en vez de 'seccion'
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

router.get(
  '/llamado',
  authorizeRoles('profesor','admin'),
  asistenciaController.llamadoLista
);

router.post(
  '/solicitar',
  authorizeRoles('estudiante','padre'),
  upload.single('archivo_justificacion'),
  asistenciaController.solicitarJustificacion
);

router.post(
  '/excusas',
  authorizeRoles('padre','estudiante','profesor','admin'),
  upload.single('archivo_justificacion'),
  asistenciaController.crearExcusa
);

// Listar excusas (scope por rol, filtros)
router.get(
  '/excusas',
  authorizeRoles('padre','estudiante','profesor','admin'),
  asistenciaController.listarExcusas
);

// Cambiar estado (aprobar/rechazar) — solo profesor/admin
router.put(
  '/excusas/:id/estado',
  authorizeRoles('profesor','admin'),
  asistenciaController.cambiarEstadoExcusa
);

module.exports = router;
