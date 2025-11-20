const { Sequelize, Op } = require('sequelize');
const { sequelize, Tarea, Curso, Materia, User, TareaEstudiante } = require('../models');

// Helpers
async function assertCursoDelProfesor(cursoId, user) {
  if (user.rol === 'admin') return true;
  const curso = await Curso.findByPk(cursoId);
  if (!curso) return { ok: false, code: 404, msg: 'Curso no encontrado' };
  if (user.rol !== 'profesor' || curso.profesor_id !== user.id) {
    return { ok: false, code: 403, msg: 'No tienes permisos sobre este curso' };
  }
  return { ok: true, curso };
}

async function assertMateriaDelCurso(materiaId, cursoId) {
  if (!materiaId) return { ok: true };
  const materia = await Materia.findOne({ where: { id: materiaId, curso_id: cursoId } });
  if (!materia) return { ok: false, code: 400, msg: 'La materia no pertenece al curso' };
  return { ok: true, materia };
}

async function cursosDelEstudiante(estudianteId) {
  // Usamos la relación N:M Curso <-> User (as: 'estudiantes')
  const cursos = await Curso.findAll({
    include: [{ model: User, as: 'estudiantes', where: { id: estudianteId }, attributes: [], through: { attributes: [] } }],
    attributes: ['id']
  });
  return cursos.map(c => c.id);
}

// ===================== CREAR TAREA (profesor/admin) =====================
exports.crearTarea = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_entrega, prioridad, curso_id, materia_id } = req.body;
    if (!['profesor', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para crear tareas' });
    }
    if (!titulo || !fecha_entrega || !curso_id) {
      return res.status(400).json({ error: 'titulo, fecha_entrega y curso_id son obligatorios' });
    }

    const perm = await assertCursoDelProfesor(curso_id, req.user);
    if (perm.ok === false) return res.status(perm.code).json({ error: perm.msg });

    const m = await assertMateriaDelCurso(materia_id, curso_id);
    if (m.ok === false) return res.status(m.code).json({ error: m.msg });

    const tarea = await Tarea.create({
      titulo,
      descripcion: descripcion || null,
      fecha_entrega,
      prioridad: prioridad || 'media',
      curso_id,
      materia_id: materia_id || null,
      profesor_id: req.user.id
    });

    return res.status(201).json({ message: 'Tarea creada', tarea });
  } catch (err) {
    console.error('crearTarea:', err);
    return res.status(500).json({ error: 'Error al crear tarea' });
  }
};

// ===================== LISTAR TAREAS POR CURSO =====================
exports.listarTareasCurso = async (req, res) => {
  try {
    const { curso_id } = req.params;
    const { materia_id } = req.query;

    const where = { curso_id };
    if (materia_id !== undefined) where.materia_id = materia_id || null;

    // Permisos: profesor dueño del curso o admin
    const perm = await assertCursoDelProfesor(curso_id, req.user);
    if (perm.ok === false) return res.status(perm.code).json({ error: perm.msg });

    const tareas = await Tarea.findAll({
      where,
      include: [
        { model: Curso, as: 'curso', attributes: ['id', 'nombre', 'grado', 'grupo'] }, // <- usar 'as'
        { model: Materia, as: 'materia', required: false },
        {
          model: TareaEstudiante,
          as: 'entregas',
          where: { estudiante_id },
          required: false,
          attributes: ['id', 'imagen_ruta', 'archivo_ruta', 'created_at', 'updated_at']
        }
      ],
      order: [['fecha_entrega', 'ASC'], ['created_at', 'DESC']]
    });

    return res.json(tareas);
  } catch (err) {
    console.error('listarTareasCurso:', err);
    return res.status(500).json({ error: 'Error al listar tareas del curso' });
  }
};

// ===================== LISTAR TAREAS DE UN ESTUDIANTE =====================
exports.listarTareasEstudiante = async (req, res) => {
  try {
    const estudiante_id = req.params.estudiante_id ? Number(req.params.estudiante_id) : req.user.id;
    // Solo el propio estudiante, profesor/admin. (Padre opcional: agrega validación si tienes esa relación lista)
    if (req.user.rol === 'estudiante' && req.user.id !== estudiante_id) {
      return res.status(403).json({ error: 'No puedes ver tareas de otros estudiantes' });
    }

    const cursoIds = await cursosDelEstudiante(estudiante_id);

    const where = { curso_id: { [Op.in]: cursoIds } };
    if (req.query.materia_id !== undefined) where.materia_id = req.query.materia_id || null;

    const tareas = await Tarea.findAll({
      where,
      include: [
        { model: Curso, attributes: ['id', 'nombre', 'grado', 'grupo'] },
        { model: Materia, as: 'materia', required: false },
        {
          model: TareaEstudiante,
          as: 'entregas',
          where: { estudiante_id },
          required: false,
          attributes: ['id', 'imagen_ruta', 'archivo_ruta', 'created_at', 'updated_at']
        }
      ],
      order: [['fecha_entrega', 'ASC'], ['created_at', 'DESC']]
    });

    // Enriquecer con flag entregada
    const result = tareas.map(t => {
      const entregada = (t.entregas || []).length > 0;
      return { ...t.toJSON(), entregada };
    });

    return res.json(result);
  } catch (err) {
    console.error('listarTareasEstudiante:', err);
    return res.status(500).json({ error: 'Error al listar tareas del estudiante' });
  }
};

// ===================== ENTREGAR TAREA (estudiante) =====================
exports.entregarTarea = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const estudiante_id = req.user.id;
    if (req.user.rol !== 'estudiante') {
      await tx.rollback();
      return res.status(403).json({ error: 'Solo estudiantes pueden entregar tareas' });
    }

    const { tarea_id, imagen_ruta, archivo_ruta, curso_id, materia_id } = req.body;
    if (!tarea_id) {
      await tx.rollback();
      return res.status(400).json({ error: 'tarea_id es obligatorio' });
    }
    if (!imagen_ruta && !archivo_ruta) {
      await tx.rollback();
      return res.status(400).json({ error: 'Debes enviar imagen_ruta o archivo_ruta' });
    }

    const tarea = await Tarea.findByPk(tarea_id, { transaction: tx });
    if (!tarea) {
      await tx.rollback();
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Validar que el estudiante pertenece al curso de la tarea
    const cursosIds = await cursosDelEstudiante(estudiante_id);
    if (!cursosIds.includes(tarea.curso_id)) {
      await tx.rollback();
      return res.status(403).json({ error: 'No perteneces al curso de esta tarea' });
    }

    // materia_id debe coincidir si la tarea la tiene
    if (tarea.materia_id && materia_id && Number(materia_id) !== Number(tarea.materia_id)) {
      await tx.rollback();
      return res.status(400).json({ error: 'materia_id no coincide con la tarea' });
    }

    // Upsert por restricción única (tarea_id, estudiante_id)
    const [entrega, created] = await TareaEstudiante.findOrCreate({
      where: { tarea_id: tarea.id, estudiante_id },
      defaults: {
        tarea_id: tarea.id,
        estudiante_id,
        curso_id: tarea.curso_id,
        materia_id: tarea.materia_id || null,
        imagen_ruta: imagen_ruta || null,
        archivo_ruta: archivo_ruta || null
      },
      transaction: tx
    });

    if (!created) {
      await entrega.update(
        {
          imagen_ruta: imagen_ruta || entrega.imagen_ruta,
          archivo_ruta: archivo_ruta || entrega.archivo_ruta
        },
        { transaction: tx }
      );
    }

    await tx.commit();
    return res.status(created ? 201 : 200).json({
      message: created ? 'Entrega registrada' : 'Entrega actualizada',
      entrega
    });
  } catch (err) {
    await tx.rollback();
    // Si viola el CHECK (ambas rutas null), devolvemos error claro
    if (err instanceof Sequelize.DatabaseError) {
      return res.status(400).json({ error: 'La entrega debe incluir imagen_ruta o archivo_ruta' });
    }
    console.error('entregarTarea:', err);
    return res.status(500).json({ error: 'Error al guardar la entrega' });
  }
};

// ===================== ACTUALIZAR ENTREGA (estudiante) =====================
exports.actualizarEntrega = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    if (req.user.rol !== 'estudiante') {
      await tx.rollback();
      return res.status(403).json({ error: 'Solo estudiantes pueden actualizar sus entregas' });
    }
    const { entrega_id } = req.params;
    const { imagen_ruta, archivo_ruta } = req.body;
    if (!imagen_ruta && !archivo_ruta) {
      await tx.rollback();
      return res.status(400).json({ error: 'Debes enviar imagen_ruta o archivo_ruta' });
    }

    const entrega = await TareaEstudiante.findByPk(entrega_id, { transaction: tx });
    if (!entrega || entrega.estudiante_id !== req.user.id) {
      await tx.rollback();
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    await entrega.update(
      {
        imagen_ruta: imagen_ruta || entrega.imagen_ruta,
        archivo_ruta: archivo_ruta || entrega.archivo_ruta
      },
      { transaction: tx }
    );

    await tx.commit();
    return res.json({ message: 'Entrega actualizada', entrega });
  } catch (err) {
    await tx.rollback();
    console.error('actualizarEntrega:', err);
    return res.status(500).json({ error: 'Error al actualizar la entrega' });
  }
};

// ===================== LISTAR ENTREGAS DE UNA TAREA (profesor/admin) =====================
exports.listarEntregasDeTarea = async (req, res) => {
  try {
    const { tarea_id } = req.params;
    const tarea = await Tarea.findByPk(tarea_id, { include: [{ model: Curso }] });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const perm = await assertCursoDelProfesor(tarea.curso_id, req.user);
    if (perm.ok === false) return res.status(perm.code).json({ error: perm.msg });

    const entregas = await TareaEstudiante.findAll({
      where: { tarea_id },
      include: [
        { model: User, as: 'estudiante', attributes: ['id', 'nombre', 'apellido1', 'apellido2', 'email'] }
      ],
      order: [['updated_at', 'DESC']]
    });

    return res.json({ tarea_id, entregas });
  } catch (err) {
    console.error('listarEntregasDeTarea:', err);
    return res.status(500).json({ error: 'Error al listar entregas' });
  }
};

// ===================== MIS ENTREGAS (estudiante) =====================
exports.misEntregas = async (req, res) => {
  try {
    if (req.user.rol !== 'estudiante') {
      return res.status(403).json({ error: 'Solo estudiantes pueden ver sus entregas' });
    }
    const entregas = await TareaEstudiante.findAll({
      where: { estudiante_id: req.user.id },
      include: [
        { model: Tarea, attributes: ['id', 'titulo', 'fecha_entrega', 'curso_id', 'materia_id'] },
        { model: Curso, attributes: ['id', 'nombre', 'grado', 'grupo'] },
        { model: Materia, as: 'materia', required: false }
      ],
      order: [['updated_at', 'DESC']]
    });
    return res.json(entregas);
  } catch (err) {
    console.error('misEntregas:', err);
    return res.status(500).json({ error: 'Error al obtener entregas' });
  }
};