const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/tareasController');
const multer = require('multer');
const path = require('path');

// simple disk storage (ajusta según tu estructura)
// guarda en backend/uploads/tareas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'tareas');
    try {
      const fs = require('fs');
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },  
filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

router.use(auth);

// Profesor/Admin
router.post('/', authorizeRoles('profesor', 'admin'), ctrl.crearTarea);
router.get('/curso/:curso_id', authorizeRoles('profesor', 'admin'), ctrl.listarTareasCurso);
router.get('/tarea/:tarea_id/entregas', authorizeRoles('profesor', 'admin'), ctrl.listarEntregasDeTarea);

// Estudiante: ver sus tareas (alias /mias)
router.get('/mias', authorizeRoles('estudiante','profesor','admin','padre'), ctrl.listarTareasEstudiante);

// listar tareas de un estudiante específico (padre/profesor/admin/estudiante propio)
router.get('/estudiante/:estudiante_id', authorizeRoles('estudiante','profesor','admin','padre'), ctrl.listarTareasEstudiante);

// Estudiante: entregar / mis entregas
router.post('/entregar', authorizeRoles('estudiante'), upload.single('archivo'), ctrl.entregarTarea);
router.put('/entrega/:entrega_id', authorizeRoles('estudiante'), ctrl.actualizarEntrega);
router.get('/mis-entregas', authorizeRoles('estudiante'), ctrl.misEntregas);

// calificar entrega (profesor/admin)
router.post('/entrega/:entrega_id/calificar', authorizeRoles('profesor','admin'), ctrl.calificarEntrega);


module.exports = router;