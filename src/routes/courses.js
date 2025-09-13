const express = require('express');
const router = express.Router();
const Course = require('../models/course');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Crear un curso (ruta protegida) - solo profesores y administradores
router.post('/', authMiddleware, authorizeRoles('profesor', 'administrador'), async (req, res) => {
  try {
    const { title, description } = req.body;

    const course = await Course.create({
      title,
      description, 
      userId: req.user.id
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

// Obtener un curso específico
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar curso - solo profesores y administradores
router.put('/:id', authMiddleware, authorizeRoles('profesor', 'administrador'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el usuario sea el creador del curso o sea administrador
    if (course.userId !== req.user.id && req.user.role !== 'administrador') {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    await course.update({ title, description });
    res.json({ message: 'Curso actualizado exitosamente', course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar curso - solo profesores y administradores
router.delete('/:id', authMiddleware, authorizeRoles('profesor', 'administrador'), async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el usuario sea el creador del curso o sea administrador
    if (course.userId !== req.user.id && req.user.role !== 'administrador') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este curso' });
    }

    await course.destroy();
    res.json({ message: 'Curso eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
