const {
  Asistencia,
  User,
  Curso,
  ConfigAsistencia,
  Notificacion,
  PadreEstudiante,
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

/* ===================== TOMAR ASISTENCIA ===================== */
exports.tomarAsistencia = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const { curso_id, fecha, asistencias } = req.body;
    const profesor_id = req.user.id;

    if (!curso_id || !fecha || !Array.isArray(asistencias) || asistencias.length === 0) {
      await tx.rollback();
      return res.status(400).json({ error: 'curso_id, fecha y asistencias requeridos' });
    }

    const curso = await Curso.findByPk(curso_id);
    if (!curso) { await tx.rollback(); return res.status(404).json({ error: 'Curso no encontrado' }); }
    if (req.user.rol !== 'admin' && curso.profesor_id !== profesor_id) {
      await tx.rollback();
      return res.status(403).json({ error: 'Sin permisos en este curso' });
    }

    // ¿Ya se registró asistencia ese día? (si existe cualquier fila del curso/fecha)
    const yaHay = await Asistencia.count({ where: { curso_id, fecha }, transaction: tx });
    if (yaHay > 0) {
      await tx.rollback();
      return res.status(400).json({ error: 'Ya existe asistencia para curso y fecha' });
    }

    // Crear registros
    const bulk = [];
    for (const a of asistencias) {
      if (!a.estudiante_id || !a.estado || !ESTADOS_VALIDOS.has(a.estado)) {
        await tx.rollback();
        return res.status(400).json({ error: 'Datos inválidos en asistencias' });
      }
      bulk.push({
        estudiante_id: a.estudiante_id,
        curso_id,
        fecha,
        estado: a.estado,
        hora_llegada: a.hora_llegada || null,
        observaciones: a.observaciones || null,
        registrado_por: profesor_id
      });
    }
    await Asistencia.bulkCreate(bulk, { transaction: tx });

    // Notificaciones por faltas
    for (const a of asistencias.filter(x => x.estado === 'ausente')) {
      await verificarYNotificarFaltas(a.estudiante_id, curso_id, tx);
    }

    await tx.commit();
    return res.status(201).json({ message: 'Asistencia registrada', registros: bulk.length });
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
      include: [{
        model: User,
        as: 'estudiante',
        attributes: ['id','nombre','apellido1','apellido2','email']
      }],
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
      include: [{ model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] }],
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

/* ===================== REPORTE CURSO ===================== */
exports.obtenerReporteCurso = async (req, res) => {
  try {
    const { curso_id } = req.params;
    const { mes, anio } = req.query;
    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (req.user.rol !== 'admin' && curso.profesor_id !== req.user.id)
      return res.status(403).json({ error: 'Sin permisos' });

    let inicio, fin;
    if (mes && anio) {
      inicio = new Date(Number(anio), Number(mes) - 1, 1);
      fin = new Date(Number(anio), Number(mes), 0);
    } else {
      const now = new Date();
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Estudiantes del curso
    const estudiantes = await curso.getEstudiantes({
      attributes: ['id','nombre','apellido1','apellido2','email'],
      joinTableAttributes: []
    });

    const asistencias = await Asistencia.findAll({
      where: {
        curso_id,
        fecha: { [Op.between]: [inicio, fin] }
      }
    });

    const reporte = estudiantes.map(e => {
      const list = asistencias.filter(a => a.estudiante_id === e.id);
      const total = list.length;
      const presentes = list.filter(a => a.estado === 'presente').length;
      const ausentes = list.filter(a => a.estado === 'ausente').length;
      const tardanzas = list.filter(a => a.estado === 'tardanza').length;
      const justificados = list.filter(a => a.estado === 'justificado').length;
      const porcentaje = total ? ((presentes + tardanzas) / total * 100).toFixed(2) : 0;
      return {
        estudiante: { id: e.id, nombre: nombreCompleto(e), email: e.email },
        total_clases: total,
        presentes,
        ausentes,
        tardanzas,
        justificados,
        porcentaje_asistencia: porcentaje
      };
    });

    const config = await ConfigAsistencia.findOne({ where: { curso_id } });
    const minimo = config?.porcentaje_minimo_asistencia ?? Number(process.env.DEFAULT_PORCENTAJE_MINIMO || 75);

    return res.json({
      curso: { id: curso.id, nombre: curso.nombre, grado: curso.grado, grupo: curso.grupo },
      periodo: { inicio, fin },
      minimo_asistencia: minimo,
      reporte
    });
  } catch (e) {
    console.error('obtenerReporteCurso:', e);
    return res.status(500).json({ error: 'Error' });
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
    const estudiante_id = req.user.id;
    const { curso_id, fecha, justificacion, archivo_justificacion } = req.body;
    if (!curso_id || !fecha) {
      return res.status(400).json({ error: 'curso_id y fecha son requeridos' });
    }

    // Buscar registro de asistencia existente para ese alumno/curso/fecha
    const asistencia = await Asistencia.findOne({
      where: { estudiante_id, curso_id, fecha }
    });

    if (!asistencia) {
      // Si no existe, opcionalmente crear registro en estado 'ausente' con la solicitud
      const nuevo = await Asistencia.create({
        estudiante_id,
        curso_id,
        fecha,
        estado: 'ausente',
        justificacion: justificacion || null,
        archivo_justificacion: archivo_justificacion || null,
        registrado_por: estudiante_id
      });
      return res.status(201).json({ message: 'Solicitud creada', asistencia: nuevo });
    }

    await asistencia.update({
      justificacion: justificacion || asistencia.justificacion,
      archivo_justificacion: archivo_justificacion || asistencia.archivo_justificacion,
      registrado_por: asistencia.registrado_por || estudiante_id
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
    where: { padre_id: padreId, estudiante_id }
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