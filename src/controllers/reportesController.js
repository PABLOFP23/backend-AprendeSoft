const { ReporteEstudiante, ReporteCurso, User, Curso, Materia } = require('../models');
const { Op } = require('sequelize');

// Umbrales (ajusta según tu escala)
const THRESHOLDS = {
  bueno: 80,
  regular: 60
};
function clasificarPromedio(v) {
  if (v === null || isNaN(v)) return 'malo';
  if (v >= THRESHOLDS.bueno) return 'bueno';
  if (v >= THRESHOLDS.regular) return 'regular';
  return 'malo';
}

// Rendimiento curso agregado
exports.rendimientoCurso = async (req, res) => {
  try {
    const curso_id = Number(req.params.curso_id);
    if (!curso_id) return res.status(400).json({ error: 'curso_id inválido' });

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol === 'profesor' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'Sin permisos sobre este curso' });

    // Traer todos los reportes estudiante (boletines) del curso
    const reportes = await ReporteEstudiante.findAll({
      where: { curso_id },
      include: [
        { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1'] },
        { model: Materia, as: 'materia', attributes: ['id','nombre'] }
      ]
    });

    // Agrupar notas por estudiante y por materia
    const estMap = new Map();
    const matMap = new Map();
    reportes.forEach(r => {
      const nota = r.nota == null ? null : Number(r.nota);
      if (nota != null && !isNaN(nota)) {
        // estudiante
        const eid = r.estudiante_id;
        if (!estMap.has(eid)) estMap.set(eid, { sum:0, count:0, estudiante: r.estudiante });
        const eObj = estMap.get(eid);
        eObj.sum += nota; eObj.count += 1;

        // materia
        const mid = r.materia_id;
        if (!matMap.has(mid)) matMap.set(mid, { sum:0, count:0, materia: r.materia });
        const mObj = matMap.get(mid);
        mObj.sum += nota; mObj.count += 1;
      }
    });

    const estudiantes = Array.from(estMap.values()).map(e => {
      const prom = e.count ? +(e.sum / e.count).toFixed(2) : null;
      return {
        estudiante_id: e.estudiante.id,
        nombre: `${e.estudiante.nombre} ${e.estudiante.apellido1 || ''}`.trim(),
        promedio: prom,
        estado: clasificarPromedio(prom)
      };
    }).sort((a,b)=> (b.promedio??0) - (a.promedio??0));

    const materias = Array.from(matMap.values()).map(m => {
      const prom = m.count ? +(m.sum / m.count).toFixed(2) : null;
      return {
        materia_id: m.materia.id,
        nombre: m.materia.nombre,
        promedio: prom,
        estado: clasificarPromedio(prom)
      };
    }).sort((a,b)=> (b.promedio??0) - (a.promedio??0));

    // Promedio general (sobre todas las notas consolidadas)
    let globalSum = 0, globalCount = 0;
    reportes.forEach(r => {
      const nota = r.nota == null ? null : Number(r.nota);
      if (nota != null && !isNaN(nota)) { globalSum += nota; globalCount++; }
    });
    const promedio_general = globalCount ? +(globalSum / globalCount).toFixed(2) : null;
    const estado_general = clasificarPromedio(promedio_general);

    return res.json({
      curso: { id: curso.id, nombre: curso.nombre, grado: curso.grado, grupo: curso.grupo },
      promedio_general,
      estado_general,
      estudiantes,
      materias,
      total_notas: globalCount
    });
  } catch (e) {
    console.error('rendimientoCurso:', e);
    return res.status(500).json({ error: 'Error al calcular rendimiento del curso' });
  }
};

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
    if (materia_id !== undefined) where.materia_id = materia_id;
    if (estudiante_id) where.estudiante_id = estudiante_id;
    if (estado_rendimiento) where.estado_rendimiento = estado_rendimiento;
    if (min_nota || max_nota) {
      where.nota = {};
      if (min_nota) where.nota[Op.gte] = Number(min_nota);
      if (max_nota) where.nota[Op.lte] = Number(max_nota);
    }
    if (req.user.rol === 'estudiante') {
      where.estudiante_id = req.user.id;
    }

    const list = await ReporteEstudiante.findAll({
      where,
      include: [
        { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1','email'] },
        { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] },
        { model: Materia, as: 'materia', attributes: ['id','nombre'] }
      ],
      order: [['updated_at','DESC']]
    });

    // opcional: devolver resumen por estudiante (promedio)
    const resumen = {};
    list.forEach(r => {
      const key = r.estudiante_id;
      const nota = typeof r.nota === 'number' ? r.nota : null;
      if (!resumen[key]) resumen[key] = { count: 0, sum: 0, notas: 0 };
      if (nota !== null) { resumen[key].sum += nota; resumen[key].notas += 1; }
      resumen[key].count += 1;
    });

    return res.json(list.map(r => ({
      ...r.toJSON(),
      promedio_estudiante: (resumen[r.estudiante_id]?.notas
        ? (resumen[r.estudiante_id].sum / resumen[r.estudiante_id].notas).toFixed(2)
        : null)
    })));
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