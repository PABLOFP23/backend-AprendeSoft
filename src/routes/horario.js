const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { horarioEstudiante, horarioCurso } = require('../controllers/horarioController');

router.use(auth);

router.get('/estudiante/:estudiante_id', horarioEstudiante);

router.get('/curso/:curso_id', horarioCurso);

module.exports = router;