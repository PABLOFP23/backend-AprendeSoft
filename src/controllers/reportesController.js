const { ReporteEstudiante, ReporteCurso, User, Curso, Materia } = require('../models');
const { Op } = require('sequelize');

// ===================== REPORTES ESTUDIANTE =====================

exports.crearReporteEstudiante = async (req, res) => {
  try {
    const { estudiante_id, curso_id, materia_id, estado_rendimiento, comentario, nota } = req.body;
    if (!estudiante_id || !curso_id || !materia_id) {
      return res.status(400).json({ error: 'estudiante_id, curso_id y materia_id son requeridos' });
    }
    if (!['admin','profesor'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos para crear reporte de estudiante' });
    }

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no existe' });
    if (req.user.rol === 'profesor' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'No puedes crear reportes en cursos de otro profesor' });

    const materia = await Materia.findOne({ where: { id: materia_id, curso_id } });
    if (!materia) return res.status(400).json({ error: 'Materia no pertenece al curso' });

    const estudiante = await User.findByPk(estudiante_id);
    if (!estudiante || estudiante.rol !== 'estudiante')
      return res.status(400).json({ error: 'estudiante_id inválido' });

    const reporte = await ReporteEstudiante.create({
      estudiante_id, curso_id, materia_id,
      estado_rendimiento: estado_rendimiento || 'regular',
      comentario: comentario || null,
      nota: nota ?? null
    });

    return res.status(201).json({ message: 'Reporte estudiante creado', reporte });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError')
      return res.status(409).json({ error: 'Ya existe reporte para ese estudiante/materia/curso' });
    console.error(e);
    return res.status(500).json({ error: 'Error al crear reporte estudiante' });
  }
};

exports.listarReportesEstudiante = async (req, res) => {
  try {
    const { curso_id, materia_id, estudiante_id, estado_rendimiento, min_nota, max_nota } = req.query;
    const where = {};
    if (curso_id) where.curso_id = curso_id;
    if (materia_id) where.materia_id = materia_id;
    if (estudiante_id) where.estudiante_id = estudiante_id;
    if (estado_rendimiento) where.estado_rendimiento = estado_rendimiento;
    if (min_nota || max_nota) {
      where.nota = {};
      if (min_nota) where.nota[Op.gte] = min_nota;
      if (max_nota) where.nota[Op.lte] = max_nota;
    }

    // Permisos básicos: admin o profesor ve todo; estudiante solo los suyos
    if (req.user.rol === 'estudiante') {
      where.estudiante_id = req.user.id;
    }

    const reportes = await ReporteEstudiante.findAll({
      where,
      include: [
        { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1','apellido2','email'] },
        { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] },
        { model: Materia, as: 'materia', attributes: ['id','nombre','codigo'] }
      ],
      order: [['updated_at','DESC']]
    });

    return res.json(reportes);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar reportes de estudiante' });
  }
};

exports.editarReporteEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_rendimiento, comentario, nota } = req.body;
    const reporte = await ReporteEstudiante.findByPk(id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

    const curso = await Curso.findByPk(reporte.curso_id);
    if (req.user.rol === 'profesor' && curso?.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'Sin permisos para editar este reporte' });
    if (!['admin','profesor'].includes(req.user.rol))
      return res.status(403).json({ error: 'Solo admin/profesor puede editar' });

    if (estado_rendimiento && !['regular','bueno','malo'].includes(estado_rendimiento))
      return res.status(400).json({ error: 'estado_rendimiento inválido' });

    await reporte.update({
      estado_rendimiento: estado_rendimiento || reporte.estado_rendimiento,
      comentario: comentario !== undefined ? comentario : reporte.comentario,
      nota: nota !== undefined ? nota : reporte.nota
    });

    return res.json({ message: 'Reporte estudiante actualizado', reporte });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al editar reporte estudiante' });
  }
};

// ===================== REPORTES CURSO =====================

exports.crearReporteCurso = async (req, res) => {
  try {
    const { curso_id, materia_id, nombre_curso, comentario } = req.body;
    if (!curso_id || !nombre_curso) {
      return res.status(400).json({ error: 'curso_id y nombre_curso son requeridos' });
    }
    if (!['admin','profesor'].includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permisos para crear reporte curso' });

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no existe' });
    if (req.user.rol === 'profesor' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'No puedes crear reportes en cursos de otro profesor' });

    if (materia_id) {
      const materia = await Materia.findOne({ where: { id: materia_id, curso_id } });
      if (!materia) return res.status(400).json({ error: 'Materia no pertenece al curso' });
    }

    const reporte = await ReporteCurso.create({
      curso_id,
      materia_id: materia_id || null,
      nombre_curso,
      comentario: comentario || null
    });

    return res.status(201).json({ message: 'Reporte curso creado', reporte });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al crear reporte curso' });
  }
};

exports.listarReportesCurso = async (req, res) => {
  try {
    const { curso_id, materia_id } = req.query;
    const where = {};
    if (curso_id) where.curso_id = curso_id;
    if (materia_id !== undefined) where.materia_id = materia_id; // puede ser null

    // Permisos: profesor solo sus cursos; admin todo.
    if (req.user.rol === 'profesor') {
      const cursosProfesor = await Curso.findAll({ where: { profesor_id: req.user.id }, attributes: ['id'] });
      const ids = cursosProfesor.map(c => c.id);
      where.curso_id = where.curso_id ? where.curso_id : { [Op.in]: ids };
      if (where.curso_id && typeof where.curso_id === 'number' && !ids.includes(where.curso_id))
        return res.status(403).json({ error: 'Curso no pertenece al profesor' });
    } else if (!['admin','profesor'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos para listar reportes de curso' });
    }

    const reportes = await ReporteCurso.findAll({
      where,
      include: [
        { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] },
        { model: Materia, as: 'materia', attributes: ['id','nombre','codigo'] }
      ],
      order: [['updated_at','DESC']]
    });

    return res.json(reportes);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar reportes curso' });
  }
};

exports.editarReporteCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { materia_id, nombre_curso, comentario } = req.body;
    const reporte = await ReporteCurso.findByPk(id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

    const curso = await Curso.findByPk(reporte.curso_id);
    if (req.user.rol === 'profesor' && curso?.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'Sin permisos para editar este reporte' });
    if (!['admin','profesor'].includes(req.user.rol))
      return res.status(403).json({ error: 'Solo admin/profesor puede editar' });

    if (materia_id) {
      const materia = await Materia.findOne({ where: { id: materia_id, curso_id: reporte.curso_id } });
      if (!materia) return res.status(400).json({ error: 'Materia no pertenece al curso' });
    }

    await reporte.update({
      materia_id: materia_id !== undefined ? (materia_id || null) : reporte.materia_id,
      nombre_curso: nombre_curso || reporte.nombre_curso,
      comentario: comentario !== undefined ? comentario : reporte.comentario
    });

    return res.json({ message: 'Reporte curso actualizado', reporte });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al editar reporte curso' });
  }
};