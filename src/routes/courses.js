const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { Curso, User } = require('../models/index');
const authorizeRoles = require('../middleware/roleMiddleware');

// Crear un curso (ruta protegida) - solo profesores y administradores
router.post('/', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    const { nombre, grado, seccion, capacidad } = req.body;

    const curso = await Curso.create({
      nombre,
      grado, 
      seccion: seccion || 'A',
      capacidad: capacidad || 30,
      profesor_id: req.user.id,
      año_lectivo: new Date().getFullYear()
    });

    res.json({ message: 'Curso creado exitosamente', course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos los cursos (ruta protegida)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cursos = await Curso.findAll(
      {
        include: [
        {model: User,
        as: 'profesor',
        attributes: ['id', 'nombre', 'apellido', 'email']
      }]
  });
    res.json(cursos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un curso específico
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const curso = await Curso.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'profesor',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: User,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          through:{attributes: []}
        }
      ]
    });
    
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar curso - solo profesores y administradores
router.put('/:id', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    const { nombre, grado, seccion, capacidad } = req.body;
    const curso = await Curso.findByPk(req.params.id);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el usuario sea el creador del curso o sea administrador
    if (curso.profesor_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    await curso.update({ nombre, grado, seccion, capacidad });
    res.json({ message: 'Curso actualizado exitosamente', curso });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar curso - solo profesores y administradores
router.delete('/:id', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    const curso = await Curso.findByPk(req.params.id);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el usuario sea el creador del curso o sea administrador
    if (curso.userId !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este curso' });
    }

    await curso.destroy();
    res.json({ message: 'Curso eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  //matricular estudiante en curso
router.post('/:id/matricular', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { estudiante_id } = req.body;
    const curso_id = req.params.id;
    const { Matricula } = require('../models');

    // Verificar que el curso existe
    const curso = await Curso.findByPk(curso_id);
    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el estudiante existe y es estudiante
    const estudiante = await User.findOne({
      where: { 
        id: estudiante_id,
        rol: 'estudiante'
      }
    });

    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // Verificar capacidad
    const matriculasActuales = await Matricula.count({
      where: { 
        curso_id,
        estado: 'activo'
      }
    });

    if (matriculasActuales >= curso.capacidad) {
      return res.status(400).json({ error: 'El curso ha alcanzado su capacidad máxima' });
    }

    // Crear matrícula
    const matricula = await Matricula.create({
      estudiante_id,
      curso_id,
      fecha_matricula: new Date(),
      estado: 'activo'
    });

    res.json({ 
      message: 'Estudiante matriculado exitosamente',
      matricula 
    });

  } catch (err) {
    // Si es error de duplicado
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El estudiante ya está matriculado en este curso' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


