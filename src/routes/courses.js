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

    const { grado, grupo, capacidad, profesor_id } = req.body;

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

    // Determinar profesor asignado:
    let assignedProfesorId = req.user.id;
    if (req.user.rol === 'admin' && profesor_id) {
      const prof = await User.findOne({ where: { id: profesor_id, rol: 'profesor' } });
      if (!prof) {
        return res.status(400).json({ error: 'Profesor inválido' });
      }
      assignedProfesorId = profesor_id;
    }

    const curso = await Curso.create({
      nombre,
      grado,
      grupo: grupoStr,
      capacidad: capacidad || 30,
      profesor_id: assignedProfesorId,
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
            'email',
            'numero_identificacion' 
          ],
          through: { attributes: [], where: { estado: 'activo' } }
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

    // permite editar si eres admin o el profesor asignado
    if (curso.profesor_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    const { grado, grupo, capacidad, profesor_id } = req.body;

    if (
      grado === undefined &&
      grupo === undefined &&
      capacidad === undefined &&
      profesor_id === undefined
    ) {
      return res.status(400).json({ error: 'No se envió ningún campo para actualizar' });
    }

    const updates = {};

    // mantener valores actuales si no se envían
    let nuevoGrado = curso.grado;
    let nuevoGrupo = curso.grupo;

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
      updates.grupo = nuevoGrupo;
    }

    if (grado !== undefined || grupo !== undefined) {
      updates.nombre = formatearNombreCurso(nuevoGrado, nuevoGrupo);
    }

    if (capacidad !== undefined) {
      updates.capacidad = capacidad;
    }

    // Si admin quiere reasignar profesor
    if (profesor_id !== undefined) {
      if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Solo admin puede reasignar profesor' });
      }
      const prof = await User.findOne({ where: { id: profesor_id, rol: 'profesor' } });
      if (!prof) {
        return res.status(400).json({ error: 'Profesor inválido' });
      }
      updates.profesor_id = profesor_id;
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
router.post('/:id/matricular', authMiddleware, authorizeRoles('admin','profesor'), async (req, res) => {
  try {
    const curso_id = Number(req.params.id);
    const { estudiante_id, numero_identificacion } = req.body;

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    // Buscar estudiante por numero_identificacion o por id
    let estudiante = null;
    if (numero_identificacion) {
      const nid = String(numero_identificacion).trim();
      estudiante = await User.findOne({ where: { numero_identificacion: nid, rol: 'estudiante' } });
    } else if (estudiante_id) {
      estudiante = await User.findOne({ where: { id: estudiante_id, rol: 'estudiante' } });
    } else {
      return res.status(400).json({ error: 'Se requiere estudiante_id o numero_identificacion' });
    }

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    // ----- VALIDACIÓN: evitar más de una matrícula ACTIVA por estudiante -----
    const matriculaActiva = await Matricula.findOne({
      where: { estudiante_id: estudiante.id, estado: 'activo' }
    });

    if (matriculaActiva && Number(matriculaActiva.curso_id) !== curso_id) {
      return res.status(400).json({ error: 'El estudiante ya está matriculado en otro curso (desmatricule primero o use la opción de mover)' });
    }

    // control de capacidad
    const matriculasActuales = await Matricula.count({ where: { curso_id, estado: 'activo' } });
    if (matriculasActuales >= curso.capacidad) {
      return res.status(400).json({ error: 'El curso ha alcanzado su capacidad máxima' });
    }

    // Crear o reactivar matrícula: si existe inactiva la reactiva; si no existe la crea
    const [matricula, created] = await Matricula.findOrCreate({
      where: { curso_id, estudiante_id: estudiante.id },
      defaults: {
        fecha_matricula: new Date(),
        estado: 'activo'
      }
    });

    if (!created && matricula.estado === 'inactivo') {
      await matricula.update({ estado: 'activo', fecha_matricula: new Date() });
    }

    return res.json({
      message: created ? 'Estudiante matriculado exitosamente' : (matricula.estado === 'activo' ? 'Estudiante ya estaba matriculado' : 'Matrícula reactivada'),
      matricula
    });
  } catch (err) {
    console.error('matricular error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/desmatricular', authMiddleware, authorizeRoles('admin','profesor'), async (req, res) => {
  try {
    const curso_id = Number(req.params.id);
    const { estudiante_id, numero_identificacion } = req.body;

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    // buscar estudiante por número o id
    let estudiante = null;
    if (numero_identificacion) {
      const nid = String(numero_identificacion).trim();
      estudiante = await User.findOne({ where: { numero_identificacion: nid, rol: 'estudiante' } });
    } else if (estudiante_id) {
      estudiante = await User.findOne({ where: { id: estudiante_id, rol: 'estudiante' } });
    } else {
      return res.status(400).json({ error: 'Se requiere estudiante_id o numero_identificacion' });
    }

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const matricula = await Matricula.findOne({
      where: { curso_id, estudiante_id: estudiante.id, estado: 'activo' }
    });

    if (!matricula) return res.status(404).json({ error: 'Matrícula activa no encontrada para este estudiante en el curso' });

    // marcar como inactivo (no borrar para historial)
    await matricula.update({ estado: 'inactivo' });

    return res.json({ message: 'Estudiante desmatriculado correctamente', matricula });
  } catch (err) {
    console.error('desmatricular error:', err);
    return res.status(500).json({ error: 'Error al desmatricular estudiante' });
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