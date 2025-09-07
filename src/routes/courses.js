// Importamos las dependencias
const express = require('express');
const router = express.Router();
const Course = require('../models/course');
const authMiddleware = require('../middleware/authMiddleware');
//const { userId } = require('react');
const authorizeRoles = require('../middleware/roleMiddleware');

// Crear un curso (ruta protegida) (ahora si con permisos de solo teacher o admin)
router.post('/', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description } = req.body;

    // Creamos el curso en la BD
    const course = await Course.create({ //await trabajar con resultado directo y no promesa
      title,
      description, 
      userId: req.user.id // deja ver todos los datos del que creo el curso
    });

    res.json({ message: 'Curso creado exitosamente', course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos los cursos (ruta protegida)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const courses = await Course.findAll();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
