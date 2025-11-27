const {
  Asistencia,
  User,
  Curso,
  ConfigAsistencia,
  Notificacion,
  PadreEstudiante,
  Materia, 
 InscripcionMateria,
  Matricula,
  Excusa,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
// Opcional: correo (si existe utils/mailer.js)
let sendEmail = async () => {};
try { ({ sendEmail } = require('../utils/mailer')); } catch (_) {}

const ESTADOS_VALIDOS = new Set(['presente','ausente','tardanza','justificado']);

function nombreCompleto(u) {
  return `${u.nombre} ${u.apellido1}${u.apellido2 ? ' ' + u.apellido2 : ''}`;
}
function* iterDias(from, to) {
  const d1 = new Date(from + 'T00:00:00'); const d2 = new Date(to + 'T00:00:00');
  for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    yield d.toISOString().slice(0,10);
  }
}


/* ===================== TOMAR ASISTENCIA ===================== */
exports.tomarAsistencia = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const { curso_id, materia_id, fecha, asistencias } = req.body;
    const profesor_id = req.user.id;

    if (!curso_id || !materia_id || !fecha || !Array.isArray(asistencias) || asistencias.length === 0) {
      await tx.rollback();
      return res.status(400).json({ error: 'curso_id, materia_id, fecha y asistencias son obligatorios' });
    }

    const curso = await Curso.findByPk(curso_id);
    if (!curso) { await tx.rollback(); return res.status(404).json({ error: 'Curso no encontrado' }); }

    const materia = await Materia.findOne({ where: { id: materia_id, curso_id } });
    if (!materia) { await tx.rollback(); return res.status(404).json({ error: 'Materia no pertenece al curso' }); }
    if (req.user.rol !== 'admin' && materia.profesor_id !== profesor_id) {
      await tx.rollback();
      return res.status(403).json({ error: 'No puedes tomar asistencia en esta materia' });
    }

    // upsert por estudiante+curso+materia+fecha
    let count = 0;
    for (const a of asistencias) {
      const estudiante_id = Number(a.estudiante_id);
      const estado = a.estado;
      if (!estudiante_id || !['presente','ausente','tardanza','justificado'].includes(estado)) continue;

      // upsert requiere unique definido (migración)
      await Asistencia.upsert({
        estudiante_id,
        curso_id,
        materia_id,
        fecha,
        estado,
        hora_llegada: a.hora_llegada || null,
        observaciones: a.observaciones || null,
        justificacion: a.justificacion || null,
        archivo_justificacion: a.archivo_justificacion || null,
        registrado_por: profesor_id
      }, { transaction: tx });
      count++;
    }

    await tx.commit();
    return res.status(201).json({ message: 'Asistencia registrada', registros: count });
  } catch (e) {
    await tx.rollback();
    console.error('tomarAsistencia:', e);
    return res.status(500).json({ error: 'Error al tomar asistencia' });
  }
};

/* ===================== ACTUALIZAR ASISTENCIA ===================== */
exports.actualizarAsistencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones, justificacion, archivo_justificacion } = req.body;
    const asistencia = await Asistencia.findByPk(id);
    if (!asistencia) return res.status(404).json({ error: 'No encontrada' });

    const curso = await Curso.findByPk(asistencia.curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol !== 'admin' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'Sin permisos' });

    if (estado && !ESTADOS_VALIDOS.has(estado))
      return res.status(400).json({ error: 'Estado inválido' });

    await asistencia.update({
      estado: estado || asistencia.estado,
      observaciones,
      justificacion,
      archivo_justificacion
    });

    return res.json({ message: 'Actualizada', asistencia });
  } catch (e) {
    console.error('actualizarAsistencia:', e);
    return res.status(500).json({ error: 'Error al actualizar' });
  }
};

/* ===================== OBTENER POR FECHA ===================== */
exports.obtenerAsistenciaPorFecha = async (req, res) => {
  try {
    const { curso_id, fecha } = req.params;
    const registros = await Asistencia.findAll({
      where: { curso_id, fecha },
      include: [
        {
          model: User,
          as: 'estudiante',
          attributes: ['id','nombre','apellido1','apellido2','email','telefono','fecha_nacimiento','direccion','numero_identificacion']
        },
        {
          model: User,
          as: 'registrador',
          attributes: ['id','nombre','apellido1','rol','email']
        }
      ],
      order: [[{ model: User, as: 'estudiante' }, 'apellido1', 'ASC'], [{ model: User, as: 'estudiante' }, 'nombre', 'ASC']]
    });
    return res.json(registros);
  } catch (e) {
    console.error('obtenerAsistenciaPorFecha:', e);
    return res.status(500).json({ error: 'Error' });
  }
};

/* ===================== HISTORIAL ESTUDIANTE ===================== */
exports.obtenerHistorialEstudiante = async (req, res) => {
  try {
    const { estudiante_id } = req.params;
    const { curso_id, fecha_inicio, fecha_fin } = req.query;

    const esPropio = req.user.id === Number(estudiante_id);
    const esPadre = await esPadreDe(req.user.id, estudiante_id);
    const esProfesor = req.user.rol === 'profesor';
    const esAdmin = req.user.rol === 'admin';
    if (!esPropio && !esPadre && !esProfesor && !esAdmin)
      return res.status(403).json({ error: 'Sin permisos' });

    const where = { estudiante_id };
    if (curso_id) where.curso_id = curso_id;
    if (fecha_inicio && fecha_fin) where.fecha = { [Op.between]: [fecha_inicio, fecha_fin] };

    const data = await Asistencia.findAll({
      where,
      include: [{ model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] },
      { model: User, as: 'registrador', attributes: ['id','nombre','apellido1','rol','email'] }

    ],
      order: [['fecha','DESC']]
    });

    const stats = {
      total_clases: data.length,
      presentes: data.filter(x => x.estado === 'presente').length,
      ausentes: data.filter(x => x.estado === 'ausente').length,
      tardanzas: data.filter(x => x.estado === 'tardanza').length,
      justificados: data.filter(x => x.estado === 'justificado').length
    };
    stats.porcentaje_asistencia = stats.total_clases
      ? ((stats.presentes + stats.tardanzas) / stats.total_clases * 100).toFixed(2)
      : 0;

    return res.json({ asistencias: data, estadisticas: stats });
  } catch (e) {
    console.error('obtenerHistorialEstudiante:', e);
    return res.status(500).json({ error: 'Error' });
  }
};

// Crear excusa (padre/estudiante/profesor/admin)
exports.crearExcusa = async (req, res) => {
  try {
    const { estudiante_id, curso_id, fecha_inicio, fecha_fin, motivo, materia_id, fecha } = req.body;

    // permitir fecha única -> mapear a inicio/fin
    const fi = fecha_inicio || fecha;
    const ff = fecha_fin || fecha;

    if (!estudiante_id || !curso_id || !fi || !ff || !motivo) {
      return res.status(400).json({ error: 'estudiante_id, curso_id, fecha_inicio/fecha y fecha_fin/fecha y motivo son requeridos' });
    }

    // permisos y archivo (igual que antes)
    // ...existing code...
    const ex = await Excusa.create({
      estudiante_id: Number(estudiante_id),
      curso_id: Number(curso_id),
      materia_id: materia_id ? Number(materia_id) : null,
      fecha_inicio: fi,
      fecha_fin: ff,
      motivo: String(motivo).slice(0, 2000),
      archivo_justificacion: req.file ? `/uploads/asistencias/${req.file.filename}` : null,
      estado: 'pendiente',
      creado_por: req.user.id
    });
    return res.status(201).json({ message: 'Excusa registrada (pendiente de revisión)', excusa: ex });
  } catch (e) {
    console.error('crearExcusa:', e);
    return res.status(500).json({ error: 'Error al crear excusa' });
  }
};

// Listar excusas (profesor/admin ven por curso/filtros; padre ve las de sus hijos; estudiante las propias)
exports.listarExcusas = async (req, res) => {
  try {
    const { curso_id, estudiante_id, estado, desde, hasta } = req.query;
    const where = {};
    if (curso_id) where.curso_id = Number(curso_id);
    if (estudiante_id) where.estudiante_id = Number(estudiante_id);
    if (estado) where.estado = estado;
    if (desde || hasta) {
      where[Op.or] = [
        { fecha_inicio: { ...(desde?{[Op.gte]: desde}:{}), ...(hasta?{[Op.lte]: hasta}:{}) } },
        { fecha_fin: { ...(desde?{[Op.gte]: desde}:{}), ...(hasta?{[Op.lte]: hasta}:{}) } }
      ];
    }

    // scoping por rol
    if (req.user.rol === 'profesor') {
      const cursos = await Curso.findAll({ where: { profesor_id: req.user.id }, attributes: ['id'] });
      const ids = cursos.map(c => c.id);
      where.curso_id = where.curso_id ? where.curso_id : { [Op.in]: ids };
    } else if (req.user.rol === 'padre') {
      const rels = await PadreEstudiante.findAll({ where: { padre_id: req.user.id }, attributes: ['estudiante_id'] });
      where.estudiante_id = where.estudiante_id ? where.estudiante_id : { [Op.in]: rels.map(r => r.estudiante_id) };
    } else if (req.user.rol === 'estudiante') {
      where.estudiante_id = req.user.id;
    }

    const list = await Excusa.findAll({
      where,
      include: [
        { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1','email','numero_identificacion'] },
        { model: User, as: 'solicitante', attributes: ['id','nombre','apellido1','rol'] },
        { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] },
        { model: Materia, as: 'materia', attributes: ['id','nombre'] }
      ],
      order: [['created_at','DESC']]
    });

    return res.json(list);
  } catch (e) {
    console.error('listarExcusas:', e);
    return res.status(500).json({ error: 'Error al listar excusas' });
  }
};

// Aprobar / Rechazar excusa (profesor/admin). Al aprobar: generar/actualizar Asistencia como justificado.
exports.cambiarEstadoExcusa = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const { estado, observaciones } = req.body;
    if (!['aprobada','rechazada'].includes(estado)) {
      await tx.rollback(); return res.status(400).json({ error: 'estado inválido' });
    }
    const ex = await Excusa.findByPk(id, { transaction: tx });
    if (!ex) { await tx.rollback(); return res.status(404).json({ error: 'Excusa no encontrada' }); }

    // permisos: curso debe pertenecer al profesor si es profesor
    if (req.user.rol === 'profesor') {
      const c = await Curso.findByPk(ex.curso_id);
      if (!c || c.profesor_id !== req.user.id) {
        await tx.rollback(); return res.status(403).json({ error: 'Sin permisos sobre el curso' });
      }
    }

    await ex.update({ estado, observaciones: observaciones || ex.observaciones }, { transaction: tx });

    if (estado === 'aprobada') {
      for (const f of iterDias(ex.fecha_inicio, ex.fecha_fin)) {
        await Asistencia.upsert({
          estudiante_id: ex.estudiante_id,
          curso_id: ex.curso_id,
          materia_id: ex.materia_id || null,
          fecha: f,
          estado: 'justificado',
          hora_llegada: null,
          observaciones: observaciones || 'Excusa aprobada',
          justificacion: ex.motivo,
          archivo_justificacion: ex.archivo_justificacion || null,
          registrado_por: req.user.id
        }, { transaction: tx });
      }
    }

    await tx.commit();
    return res.json({ message: `Excusa ${estado}`, excusa: ex });
  } catch (e) {
    await tx.rollback();
    console.error('cambiarEstadoExcusa:', e);
    return res.status(500).json({ error: 'Error al actualizar estado de excusa' });
  }
};


exports.misMaterias = async (req, res) => {
  try {
    const where = req.user.rol === 'admin'
      ? {}
      : { profesor_id: req.user.id };

    const rows = await Materia.findAll({
      where,
      attributes: ['id','nombre','codigo','curso_id','profesor_id'],
      include: [{ model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] }],
      order: [['nombre','ASC']]
    });

    return res.json(rows);
  } catch (e) {
    console.error('misMaterias:', e);
    return res.status(500).json({ error: 'Error al listar materias' });
  }
};

exports.obtenerAsistenciaPorMateriaFecha = async (req, res) => {
  try {
    const materia_id = Number(req.params.materia_id);
    const fecha = req.params.fecha;

    if (!materia_id || !fecha) {
      return res.status(400).json({ error: 'materia_id y fecha son requeridos' });
    }

    const materia = await Materia.findByPk(materia_id, {
      include: [{ model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo','profesor_id'] }]
    });
    if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });

    // permiso: profesor dueño o admin
    if (req.user.rol === 'profesor' && materia.profesor_id !== req.user.id) {
      return res.status(403).json({ error: 'La materia no pertenece al profesor' });
    }

    // estudiantes inscritos a la materia (si existe N:M); si no hay, usar los del curso
    let estudiantes = [];
    const ins = await InscripcionMateria.findAll({ where: { materia_id }, attributes: ['estudiante_id'] }).catch(()=>[]);
    if (ins.length) {
      const ids = ins.map(i => i.estudiante_id);
      estudiantes = await User.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id','nombre','apellido1','email','numero_identificacion']
      });
    } else {
      const mats = await Matricula.findAll({
        where: { curso_id: materia.curso_id, estado: 'activo' },
        attributes: ['estudiante_id']
      });
      const ids = mats.map(m => m.estudiante_id);
      estudiantes = ids.length ? await User.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id','nombre','apellido1','email','numero_identificacion']
      }) : [];
    }

    // Asistencias ya registradas hoy para esa materia/curso
    const registradas = await Asistencia.findAll({
      where: { curso_id: materia.curso_id, materia_id, fecha },
      attributes: ['id','estudiante_id','estado','hora_llegada','observaciones','justificacion','archivo_justificacion']
    });
    const map = new Map(registradas.map(a => [a.estudiante_id, a.toJSON()]));

    const roster = (estudiantes || [])
      .sort((a,b) => (a.apellido1||'').localeCompare(b.apellido1||'') || (a.nombre||'').localeCompare(b.nombre||''))
      .map(e => ({ estudiante: e, asistencia: map.get(e.id) || null }));

    return res.json({
      fecha,
      materia: { id: materia.id, nombre: materia.nombre },
      curso: { id: materia.curso?.id, nombre: materia.curso?.nombre },
      roster
    });
  } catch (e) {
    console.error('obtenerAsistenciaPorMateriaFecha:', e);
    return res.status(500).json({ error: 'Error al obtener roster' });
  }
};


/* ===================== REPORTE CURSO ===================== */
exports.obtenerReporteCurso = async (req, res) => {
  try {
    const curso_id = Number(req.params.curso_id);
    const { desde, hasta, materia_id } = req.query;
    if (!curso_id) return res.status(400).json({ error: 'curso_id inválido' });

    // permiso: profesor dueño del curso o admin
    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol === 'profesor' && curso.profesor_id !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos en este curso' });
    }

    const where = { curso_id };
    if (materia_id !== undefined) where.materia_id = materia_id || null;
    if (desde || hasta) where.fecha = { ...(desde ? { [Op.gte]: desde } : {}), ...(hasta ? { [Op.lte]: hasta } : {}) };

    const rows = await Asistencia.findAll({
      where,
      attributes: [
        'fecha',
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['fecha','estado'],
      order: [['fecha','DESC']]
    });

    // armar por día
    const map = new Map();
    rows.forEach(r => {
      const fecha = r.get('fecha');
      const estado = r.get('estado');
      const count = Number(r.get('count') || 0);
      if (!map.has(fecha)) map.set(fecha, { fecha, presentes:0, ausentes:0, tardanzas:0, justificados:0, total:0 });
      const d = map.get(fecha);
      if (estado === 'presente') d.presentes += count;
      else if (estado === 'ausente') d.ausentes += count;
      else if (estado === 'tardanza') d.tardanzas += count;
      else if (estado === 'justificado') d.justificados += count;
      d.total += count;
    });

    const resumenDias = Array.from(map.values()).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const totales = resumenDias.reduce((acc, d) => ({
      presentes: acc.presentes + d.presentes,
      ausentes: acc.ausentes + d.ausentes,
      tardanzas: acc.tardanzas + d.tardanzas,
      justificados: acc.justificados + d.justificados,
      total: acc.total + d.total
    }), { presentes:0, ausentes:0, tardanzas:0, justificados:0, total:0 });

    return res.json({
      curso_id,
      rango: { desde: desde || null, hasta: hasta || null },
      materia_id: materia_id ?? undefined,
      resumenDias,
      totales
    });
  } catch (e) {
    console.error('obtenerReporteCurso:', e);
    return res.status(500).json({ error: 'Error al obtener reporte del curso' });
  }
};
/* ===================== JUSTIFICAR FALTA ===================== */
exports.justificarFalta = async (req, res) => {
  try {
    const { id } = req.params;
    const { justificacion, archivo_justificacion } = req.body;
    const asistencia = await Asistencia.findByPk(id);
    if (!asistencia) return res.status(404).json({ error: 'No encontrada' });

    const esPadre = await esPadreDe(req.user.id, asistencia.estudiante_id);
    const esAdmin = req.user.rol === 'admin';
    const esProfesor = req.user.rol === 'profesor';
    if (!esPadre && !esAdmin && !esProfesor)
      return res.status(403).json({ error: 'Sin permisos' });

    await asistencia.update({
      estado: 'justificado',
      justificacion,
      archivo_justificacion
    });

    return res.json({ message: 'Justificada', asistencia });
  } catch (e) {
    console.error('justificarFalta:', e);
    return res.status(500).json({ error: 'Error' });
  }
};

exports.solicitarJustificacion = async (req, res) => {
  try {
    const actorId = req.user.id;
    const actorRol = req.user.rol;
    const { estudiante_id: bodyEstudianteId, curso_id, fecha, justificacion } = req.body;

    if (!curso_id || !fecha) return res.status(400).json({ error: 'curso_id y fecha son requeridos' });

    // decidir para qué estudiante se solicita la justificación
    let targetEstudianteId;
    if (actorRol === 'estudiante') {
      targetEstudianteId = actorId;
    } else if (actorRol === 'padre') {
      if (!bodyEstudianteId) return res.status(400).json({ error: 'estudiante_id es requerido cuando quien solicita es padre' });
      // validar vínculo padre->estudiante
      const esPadre = await esPadreDe(actorId, Number(bodyEstudianteId));
      if (!esPadre) return res.status(403).json({ error: 'No tienes permisos para justificar a ese estudiante' });
      targetEstudianteId = Number(bodyEstudianteId);
    } else if (actorRol === 'admin') {
      // admin puede pasar estudiante_id
      targetEstudianteId = bodyEstudianteId ? Number(bodyEstudianteId) : actorId;
    } else {
      return res.status(403).json({ error: 'Rol no permitido para solicitar justificación' });
    }

    // Buscar registro de asistencia existente para ese alumno/curso/fecha
    const asistencia = await Asistencia.findOne({
      where: { estudiante_id: targetEstudianteId, curso_id, fecha }
    });
    if (!asistencia) return res.status(404).json({ error: 'Registro de asistencia no encontrado para ese estudiante/curso/fecha' });

    // si vino archivo por multer, construir ruta pública
    const archivoFile = req.file ? `/uploads/asistencias/${req.file.filename}` : null;

    await asistencia.update({
      justificacion: justificacion || asistencia.justificacion,
      archivo_justificacion: archivoFile || asistencia.archivo_justificacion,
      registrado_por: actorId
    });

    return res.json({ message: 'Solicitud enviada', asistencia });
  } catch (e) {
    console.error('solicitarJustificacion:', e);
    return res.status(500).json({ error: 'Error al solicitar justificación' });
  }
};

/* ===================== CONFIGURAR LÍMITES ===================== */
exports.configurarLimites = async (req, res) => {
  try {
    const { curso_id } = req.params;
    const body = req.body;
    if (!['admin','profesor'].includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permisos' });

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol === 'profesor' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'No es tu curso' });

    let config = await ConfigAsistencia.findOne({ where: { curso_id } });
    if (config) {
      await config.update(body);
    } else {
      config = await ConfigAsistencia.create({ curso_id, ...body });
    }
    return res.json({ message: 'Configuración guardada', config });
  } catch (e) {
    console.error('configurarLimites:', e);
    return res.status(500).json({ error: 'Error' });
  }
};

/* ===================== LLAMADO A LISTA ===================== */
exports.llamadoLista = async (req, res) => {
  try {
    const { curso_id, fecha } = req.query;
    if (!curso_id || !fecha) return res.status(400).json({ error: 'curso_id y fecha requeridos' });

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol !== 'admin' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'Sin permisos' });

    const estudiantes = await curso.getEstudiantes({
      attributes: ['id','nombre','apellido1','apellido2'],
      joinTableAttributes: []
    });

    const registros = await Asistencia.findAll({
      where: { curso_id, fecha },
      attributes: ['id','estudiante_id','estado','hora_llegada','observaciones']
    });
    const map = new Map(registros.map(r => [r.estudiante_id, r]));

    const roster = estudiantes
      .sort((a,b) =>
        (a.apellido1||'').localeCompare(b.apellido1||'') ||
        (a.nombre||'').localeCompare(b.nombre||''))
      .map(e => {
        const reg = map.get(e.id);
        return {
          estudiante: { id: e.id, nombre: nombreCompleto(e) },
            estado: reg?.estado || 'presente',
            id_asistencia: reg?.id || null,
            hora_llegada: reg?.hora_llegada || null,
            observaciones: reg?.observaciones || null
        };
      });

    return res.json({ curso_id, fecha, roster });
  } catch (e) {
    console.error('llamadoLista:', e);
    return res.status(500).json({ error: 'Error' });
  }
};

/* ===================== AUX ===================== */
async function esPadreDe(padreId, estudianteId) {
  const rel = await PadreEstudiante.findOne({
    where: { padre_id: padreId, estudiante_id: estudianteId }
  });
  return !!rel;
}

async function verificarYNotificarFaltas(estudianteId, cursoId, tx) {
  try {
    const config = await ConfigAsistencia.findOne({ where: { curso_id: cursoId }, transaction: tx });
    if (!config || !config.notificar_padres) return;

    const faltas = await Asistencia.count({
      where: { estudiante_id: estudianteId, curso_id: cursoId, estado: 'ausente' },
      transaction: tx
    });

    const limiteNoti  = config.limite_faltas_notificacion ?? Number(process.env.DEFAULT_FALTAS_NOTIFICACION || 3);
    const limiteAlerta= config.limite_faltas_alerta       ?? Number(process.env.DEFAULT_FALTAS_ALERTA || 5);

    const disparar = config.notificar_cada_falta || faltas === limiteNoti || faltas === limiteAlerta;
    if (!disparar) return;

    const estudiante = await User.findByPk(estudianteId, { attributes: ['nombre','apellido1','apellido2'], transaction: tx });
    const curso      = await Curso.findByPk(cursoId,      { attributes: ['nombre','grado','grupo'],        transaction: tx });

    const padresRel = await PadreEstudiante.findAll({ where: { estudiante_id: estudianteId }, attributes: ['padre_id'], transaction: tx });
    const padresIds = padresRel.map(r => r.padre_id);
    if (padresIds.length === 0) return;

    const padres = await User.findAll({ where: { id: padresIds }, attributes: ['id','email','nombre','apellido1','apellido2'], transaction: tx });

    const nombreEst   = `${estudiante.nombre} ${estudiante.apellido1}${estudiante.apellido2 ? ' '+estudiante.apellido2 : ''}`;
    const nombreCurso = `${curso.grado} ${curso.grupo} - ${curso.nombre}`;

    let titulo, prioridad;
    if (faltas === limiteAlerta) {
      titulo = `ALERTA: ${nombreEst} alcanzó ${faltas} faltas`;
      prioridad = 'urgente';
    } else if (faltas === limiteNoti) {
      titulo = `Notificación: ${nombreEst} acumula ${faltas} faltas`;
      prioridad = 'media';
    } else {
      titulo = `Inasistencia - ${nombreEst}`;
      prioridad = 'baja';
    }
    const mensaje = `${nombreEst} acumula ${faltas} falta(s) en ${nombreCurso}.`;

    for (const p of padres) {
      await Notificacion.create({
        usuario_id: p.id,
        tipo: 'asistencia',
        titulo,
        mensaje,
        prioridad
      }, { transaction: tx });

      if (p.email) {
        sendEmail(
          p.email,
          titulo,
          `${mensaje}\n\nAviso automático.`,
          `<p>${mensaje}</p><p>Aviso automático.</p>`
        ).catch(err => console.error('sendEmail error:', err));
      }
    }
  } catch (e) {
    console.error('verificarYNotificarFaltas:', e);
  }
}