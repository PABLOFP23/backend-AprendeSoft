const { Sequelize, Op } = require('sequelize');
const { sequelize, Tarea, Curso, Materia, User, TareaEstudiante, Matricula, PadreEstudiante } = require('../models');

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
    const estudiante_id = req.query.estudiante_id ? Number(req.query.estudiante_id) : undefined;
    const { materia_id } = req.query;

    const where = { curso_id };
    if (materia_id !== undefined) where.materia_id = materia_id || null;

    const perm = await assertCursoDelProfesor(curso_id, req.user);
    if (perm.ok === false) return res.status(perm.code).json({ error: perm.msg });

    const entregasInclude = estudiante_id
      ? {
          model: TareaEstudiante,
          as: 'entregas',
          where: { estudiante_id },
          required: false,
          attributes: ['id','imagen_ruta','archivo_ruta','comentario','nota','comentario_profesor','created_at','updated_at']
        }
      : {
          model: TareaEstudiante,
          as: 'entregas',
          required: false,
          attributes: ['id','imagen_ruta','archivo_ruta','comentario','nota','comentario_profesor','created_at','updated_at']
        };

    const tareas = await Tarea.findAll({
      where,
      include: [
        { model: Curso, as: 'curso', attributes: ['id', 'nombre', 'grado', 'grupo'] },
        { model: Materia, as: 'materia', required: false },
        entregasInclude
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

    // Permisos
    if (req.user.rol === 'estudiante' && req.user.id !== estudiante_id) {
      return res.status(403).json({ error: 'No puedes ver tareas de otro estudiante' });
    }
    if (req.user.rol === 'padre') {
      const rel = await PadreEstudiante.findOne({ where: { padre_id: req.user.id, estudiante_id } });
      if (!rel) return res.status(403).json({ error: 'No tienes permisos para ver tareas de este estudiante' });
    }
    // profesor/admin: permitido

    // Cursos en los que está el estudiante
    const cursoIds = await cursosDelEstudiante(estudiante_id);
    if (!cursoIds || cursoIds.length === 0) return res.json([]);

    const where = { curso_id: { [Op.in]: cursoIds } };
    if (req.query.materia_id !== undefined) where.materia_id = req.query.materia_id || null;

    const tareas = await Tarea.findAll({
      where,
      include: [
        { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] },
        { model: Materia, as: 'materia', required: false, attributes: ['id','nombre'] },
        {
          model: TareaEstudiante,
          as: 'entregas',
          where: { estudiante_id },
          required: false,
          attributes: [
            'id','archivo_ruta','imagen_ruta','comentario','nota','comentario_profesor','created_at','updated_at'
          ]
        }
      ],
      order: [['fecha_entrega','ASC'], ['created_at','DESC']]
    });

    const result = tareas.map(t => {
      const entregas = Array.isArray(t.entregas) ? t.entregas : [];
      const entregada = entregas.length > 0;
      return {
        id: t.id,
        titulo: t.titulo,
        descripcion: t.descripcion,
        fecha_entrega: t.fecha_entrega,
        prioridad: t.prioridad,
        curso: t.curso,
        curso_id: t.curso_id,
        materia: t.materia || null,
        materia_id: t.materia_id,
        entregas,
        entregada
      };
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
    const tarea_id = req.body.tarea_id ? Number(req.body.tarea_id) : null;
    if (!tarea_id) return res.status(400).json({ error: 'tarea_id es requerido' });

    const tarea = await Tarea.findByPk(tarea_id, { transaction: tx });
    if (!tarea) {
      await tx.rollback();
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Validar que el estudiante pertenece al curso de la tarea
    const mat = await Matricula.findOne({
      where: { curso_id: tarea.curso_id, estudiante_id, estado: 'activo' },
      transaction: tx
    });
    if (!mat) {
      await tx.rollback();
      return res.status(403).json({ error: 'No estás matriculado en el curso de esta tarea' });
    }

    // Archivos (multer en la ruta guarda req.file)
    const archivo_ruta = req.file ? `/uploads/tareas/${req.file.filename}` : (req.body.archivo_ruta || null);
    const imagen_ruta = req.body.imagen_ruta ? String(req.body.imagen_ruta) : null;
    const comentario = req.body.comentario ? String(req.body.comentario).slice(0, 1000) : null;

    const entrega = await TareaEstudiante.create({
      tarea_id,
      estudiante_id,
      curso_id: tarea.curso_id,
      materia_id: tarea.materia_id || null,
      imagen_ruta,
      archivo_ruta,
      comentario
    }, { transaction: tx });

    await tx.commit();
    return res.status(201).json({ message: 'Entrega registrada', entrega });
  } catch (err) {
    await tx.rollback();
    console.error('entregarTarea:', err);
    return res.status(500).json({ error: 'Error al entregar tarea' });
  }
};

// ===================== ACTUALIZAR ENTREGA (estudiante) =====================
exports.actualizarEntrega = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const entrega_id = Number(req.params.entrega_id);
    const entrega = await TareaEstudiante.findByPk(entrega_id, { transaction: tx });
    if (!entrega) {
      await tx.rollback();
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }
    if (entrega.estudiante_id !== req.user.id) {
      await tx.rollback();
      return res.status(403).json({ error: 'No puedes editar entregas de otro estudiante' });
    }

    const updates = {};
    if (req.body.comentario !== undefined) {
      updates.comentario = req.body.comentario ? String(req.body.comentario).slice(0, 1000) : null;
    }
    // Si quieres permitir reemplazar archivo vía PUT (sin multer), acepta una URL:
    if (req.body.archivo_ruta !== undefined) updates.archivo_ruta = req.body.archivo_ruta || null;
    if (req.body.imagen_ruta !== undefined) updates.imagen_ruta = req.body.imagen_ruta || null;

    await entrega.update(updates, { transaction: tx });
    await tx.commit();
    return res.json({ message: 'Entrega actualizada', entrega });
  } catch (err) {
    await tx.rollback();
    console.error('actualizarEntrega:', err);
    return res.status(500).json({ error: 'Error al actualizar entrega' });
  }
};

// ===================== LISTAR ENTREGAS DE UNA TAREA (profesor/admin) =====================
exports.listarEntregasDeTarea = async (req, res) => {
  try {
    const tarea_id = Number(req.params.tarea_id);
    if (!tarea_id) return res.status(400).json({ error: 'tarea_id inválido' });

    const tarea = await Tarea.findByPk(tarea_id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    // permisos: admin o profesor dueño de la tarea / del curso
    if (req.user.rol !== 'admin') {
      const curso = await Curso.findByPk(tarea.curso_id);
      if (!curso || curso.profesor_id !== req.user.id) {
        return res.status(403).json({ error: 'Sin permisos para ver entregas' });
      }
    }

    const entregas = await TareaEstudiante.findAll({
      where: { tarea_id },
      include: [
        { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1','email','numero_identificacion'] }
      ],
      order: [['updated_at','DESC'], ['created_at','DESC']]
    });

    // devolver tal cual; frontend hará buildFileUrl sobre archivo_ruta/imagen_ruta
    return res.json(Array.isArray(entregas) ? entregas : []);
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
        { model: Tarea, as: 'tarea', attributes: ['id', 'titulo', 'fecha_entrega', 'curso_id', 'materia_id'] },
        { model: Curso, as: 'curso', attributes: ['id', 'nombre', 'grado', 'grupo'] },
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

// ===================== LISTAR ENTREGAS DE UNA TAREA (profesor/admin) =====================
exports.listarEntregasDeTarea = async (req, res) => {
  try {
    const tarea_id = Number(req.params.tarea_id);
    if (!tarea_id) return res.status(400).json({ error: 'tarea_id inválido' });

    const tarea = await Tarea.findByPk(tarea_id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    // permisos: admin o profesor dueño de la tarea / del curso
    if (req.user.rol !== 'admin') {
      const curso = await Curso.findByPk(tarea.curso_id);
      if (!curso || curso.profesor_id !== req.user.id) {
        return res.status(403).json({ error: 'Sin permisos para ver entregas' });
      }
    }

    const entregas = await TareaEstudiante.findAll({
      where: { tarea_id },
      include: [
        { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1','email','numero_identificacion'] }
      ],
      attributes: ['id','tarea_id','estudiante_id','archivo_ruta','imagen_ruta','comentario','nota','comentario_profesor','created_at','updated_at','curso_id','calificado_por','calificado_at'],
      order: [['updated_at','DESC'], ['created_at','DESC']]
    });

    return res.json(Array.isArray(entregas) ? entregas : []);
  } catch (err) {
    console.error('listarEntregasDeTarea:', err);
    return res.status(500).json({ error: 'Error al listar entregas' });
  }
};

// ===================== CALIFICAR / COMENTAR ENTREGA (profesor/admin) =====================
exports.calificarEntrega = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const entrega_id = Number(req.params.entrega_id);
    const entrega = await TareaEstudiante.findByPk(entrega_id, { transaction: tx });
    if (!entrega) {
      await tx.rollback();
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    // Permisos: admin o profesor dueño del curso
    const perm = await assertCursoDelProfesor(entrega.curso_id, req.user);
    if (perm.ok === false) {
      await tx.rollback();
      return res.status(perm.code).json({ error: perm.msg });
    }

    const { nota, comentario_profesor } = req.body;
    const updates = {};
    if (nota !== undefined) updates.nota = nota === null ? null : Number(nota);
    if (comentario_profesor !== undefined) updates.comentario_profesor = comentario_profesor ? String(comentario_profesor).slice(0, 1000) : null;

    await entrega.update(updates, { transaction: tx });
    await tx.commit();
    return res.json({ message: 'Entrega calificada', entrega });
  } catch (err) {
    await tx.rollback();
    console.error('calificarEntrega:', err);
    return res.status(500).json({ error: 'Error al calificar entrega' });
  }
};