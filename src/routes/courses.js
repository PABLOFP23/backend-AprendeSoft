const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { Curso, User, Matricula } = require('../models');

// ----------------- Helpers de grado/grupo -----------------
const GRADOS_VALIDOS = [
  'prejardin',
  'jardin',
  'preescolar',
  'primero',
  'segundo',
  'tercero',
  'cuarto',
  'quinto'
];

const GRUPOS_PRE = ['1', '2', '3'];

const GRUPOS_PRIMARIA = [
  '101', '102',
  '201', '202',
  '301', '302', '303',
  '401', '402',
  '501', '502'
];

function formatearNombreCurso(grado, grupo) {
  const mapaGrados = {
    prejardin: 'Prejardín',
    jardin: 'Jardín',
    preescolar: 'Preescolar',
    primero: 'Primero',
    segundo: 'Segundo',
    tercero: 'Tercero',
    cuarto: 'Cuarto',
    quinto: 'Quinto'
  };
  const nombreGrado = mapaGrados[grado] || grado;
  return `${nombreGrado} ${grupo}`;
}

function esGrupoValidoParaGrado(grado, grupo) {
  const g = String(grupo);
  if (['prejardin', 'jardin', 'preescolar'].includes(grado)) {
    return GRUPOS_PRE.includes(g);
  }
  return GRUPOS_PRIMARIA.includes(g);
}

// ----------------- RUTAS -----------------

// Crear un curso (ruta protegida) - solo profesores y administradores
router.post('/', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    console.log('BODY CREAR CURSO:', req.body);

    const { grado, grupo, capacidad } = req.body;

    if (!grado || !grupo) {
      return res.status(400).json({
        error: 'grado y grupo son obligatorios',
        bodyRecibido: req.body
      });
    }

    if (!GRADOS_VALIDOS.includes(grado)) {
      return res.status(400).json({
        error: 'grado inválido',
        grados_permitidos: GRADOS_VALIDOS
      });
    }

    if (!esGrupoValidoParaGrado(grado, grupo)) {
      return res.status(400).json({
        error: 'grupo inválido para ese grado',
        grupos_pre: GRUPOS_PRE,
        grupos_primaria: GRUPOS_PRIMARIA
      });
    }

    const grupoStr = String(grupo);
    const nombre = formatearNombreCurso(grado, grupoStr);

    const curso = await Curso.create({
      nombre,
      grado,
      grupo: grupoStr,        // AQUÍ seteamos la columna grupo del modelo/BD
      capacidad: capacidad || 30,
      profesor_id: req.user.id,
      año_lectivo: new Date().getFullYear()
});

    res.json({ message: 'Curso creado exitosamente', curso });
  } catch (err) {
    console.error('Error al crear curso:', err);
    res.status(500).json({ error: err.message });
  }
});

// Listar todos los cursos (ruta protegida)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cursos = await Curso.findAll({
      include: [
        {
          model: User,
          as: 'profesor',
          attributes: [
            'id',
            'username',
            'nombre',
            'segundo_nombre',
            'apellido1',
            'apellido2',
            'email'
          ]
        }
      ]
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
          attributes: [
            'id',
            'username',
            'nombre',
            'segundo_nombre',
            'apellido1',
            'apellido2',
            'email'
          ]
        },
        {
          model: User,
          as: 'estudiantes',
          attributes: [
            'id',
            'username',
            'nombre',
            'segundo_nombre',
            'apellido1',
            'apellido2',
            'email'
          ],
          through: { attributes: [] }
        }
      ]
    });
    
    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(curso);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar curso - solo profesores y administradores
router.put('/:id', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    console.log('BODY EDITAR CURSO:', req.body);

    const curso = await Curso.findByPk(req.params.id);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    if (curso.profesor_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    const { grado, grupo, capacidad } = req.body;

    if (
      grado === undefined &&
      grupo === undefined &&
      capacidad === undefined
    ) {
      return res.status(400).json({ error: 'No se envió ningún campo para actualizar' });
    }

    const updates = {};

    // usamos curso.seccion como el grupo actual
    let nuevoGrado = curso.grado;
    let nuevoGrupo = curso.seccion;

    if (grado !== undefined) {
      if (!GRADOS_VALIDOS.includes(grado)) {
        return res.status(400).json({
          error: 'grado inválido',
          grados_permitidos: GRADOS_VALIDOS
        });
      }
      nuevoGrado = grado;
      updates.grado = grado;
    }

    if (grupo !== undefined) {
      if (!esGrupoValidoParaGrado(nuevoGrado, grupo)) {
        return res.status(400).json({
          error: 'grupo inválido para ese grado',
          grupos_pre: GRUPOS_PRE,
          grupos_primaria: GRUPOS_PRIMARIA
        });
      }
      nuevoGrupo = String(grupo);
    }

    if (grado !== undefined || grupo !== undefined) {
      updates.nombre = formatearNombreCurso(nuevoGrado, nuevoGrupo);
    }

    if (capacidad !== undefined) {
      updates.capacidad = capacidad;
    }

    await curso.update(updates);

    res.json({ message: 'Curso actualizado exitosamente', curso });
  } catch (err) {
    console.error('Error al actualizar curso:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar curso
router.delete('/:id', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    const curso = await Curso.findByPk(req.params.id);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    if (curso.profesor_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este curso' });
    }

    await curso.destroy();
    res.json({ message: 'Curso eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Matricular estudiante en curso - solo admin
router.post('/:id/matricular', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { estudiante_id } = req.body;
    const curso_id = req.params.id;

    const curso = await Curso.findByPk(curso_id);
    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    const estudiante = await User.findOne({
      where: { 
        id: estudiante_id,
        rol: 'estudiante'
      }
    });

    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    const matriculasActuales = await Matricula.count({
      where: { 
        curso_id,
        estado: 'activo'
      }
    });

    if (matriculasActuales >= curso.capacidad) {
      return res.status(400).json({ error: 'El curso ha alcanzado su capacidad máxima' });
    }

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
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El estudiante ya está matriculado en este curso' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Generar/renovar código para un curso (profesor/admin)
router.post('/:id/generar-codigo', authMiddleware, authorizeRoles('profesor', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const curso = await Curso.findByPk(id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    if (req.user.rol === 'profesor' && curso.profesor_id && curso.profesor_id !== req.user.id) {
      return res.status(403).json({ error: 'No puedes generar el código de este curso' });
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    curso.join_code = code;
    await curso.save();

    res.json({ join_code: code });
  } catch (err) {
    console.error('generar-codigo error:', err);
    res.status(500).json({ error: 'Error al generar código' });
  }
});

// Unirse a un curso por código (estudiante)
router.post('/unirse', authMiddleware, authorizeRoles('estudiante'), async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código requerido' });
    }

    const curso = await Curso.findOne({ where: { join_code: code } });
    if (!curso) return res.status(400).json({ error: 'Código inválido' });

    await Matricula.findOrCreate({
      where: { estudiante_id: req.user.id, curso_id: curso.id },
      defaults: { estado: 'activo', fecha_matricula: new Date() }
    });

    res.json({ ok: true, curso_id: curso.id });
  } catch (err) {
    console.error('unirse error:', err);
    res.status(500).json({ error: 'No se pudo unir al curso' });
  }
});

module.exports = router;

