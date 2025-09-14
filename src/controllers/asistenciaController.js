// src/controllers/asistenciaController.js
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

// Tomar asistencia para un curso
exports.tomarAsistencia = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { curso_id, fecha, asistencias } = req.body;
    const profesor_id = req.user.id;

    // Verificar que el profesor imparte este curso
    const curso = await Curso.findOne({
      where: { 
        id: curso_id,
        profesor_id: profesor_id
      }
    });

    if (!curso) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: 'No tienes permisos para tomar asistencia en este curso' 
      });
    }

    // Verificar si ya existe asistencia para esta fecha
    const asistenciaExistente = await Asistencia.findOne({
      where: {
        curso_id,
        fecha
      }
    });

    if (asistenciaExistente) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Ya existe un registro de asistencia para esta fecha' 
      });
    }

    // Crear registros de asistencia para cada estudiante
    const registrosAsistencia = [];
    
    for (const asist of asistencias) {
      const registro = await Asistencia.create({
        estudiante_id: asist.estudiante_id,
        curso_id,
        fecha,
        estado: asist.estado,
        hora_llegada: asist.hora_llegada || null,
        observaciones: asist.observaciones || null,
        registrado_por: profesor_id
      }, { transaction });
      
      registrosAsistencia.push(registro);

      // Verificar si necesita notificación
      await verificarYNotificarFaltas(asist.estudiante_id, curso_id, transaction);
    }

    await transaction.commit();

    res.status(201).json({
      message: 'Asistencia registrada exitosamente',
      registros: registrosAsistencia.length
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error al tomar asistencia:', error);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
};

// Actualizar asistencia individual
exports.actualizarAsistencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones, justificacion, archivo_justificacion } = req.body;

    const asistencia = await Asistencia.findByPk(id);

    if (!asistencia) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
    }

    // Verificar permisos
    const curso = await Curso.findByPk(asistencia.curso_id);
    if (curso.profesor_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar esta asistencia' 
      });
    }

    await asistencia.update({
      estado,
      observaciones,
      justificacion,
      archivo_justificacion
    });

    res.json({
      message: 'Asistencia actualizada exitosamente',
      asistencia
    });

  } catch (error) {
    console.error('Error al actualizar asistencia:', error);
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  }
};

// Obtener asistencia de un curso por fecha
exports.obtenerAsistenciaPorFecha = async (req, res) => {
  try {
    const { curso_id, fecha } = req.params;

    const asistencias = await Asistencia.findAll({
      where: {
        curso_id,
        fecha
      },
      include: [
        {
          model: User,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ],
      order: [['estudiante', 'apellido', 'ASC']]
    });

    res.json(asistencias);

  } catch (error) {
    console.error('Error al obtener asistencia:', error);
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
};

// Obtener historial de asistencia de un estudiante
exports.obtenerHistorialEstudiante = async (req, res) => {
  try {
    const { estudiante_id } = req.params;
    const { curso_id, fecha_inicio, fecha_fin } = req.query;

    // Verificar permisos
    const esPropio = req.user.id === parseInt(estudiante_id);
    const esPadre = await verificarSiEsPadre(req.user.id, estudiante_id);
    const esProfesor = req.user.rol === 'profesor';
    const esAdmin = req.user.rol === 'admin';

    if (!esPropio && !esPadre && !esProfesor && !esAdmin) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver este historial' 
      });
    }

    const whereClause = {
      estudiante_id
    };

    if (curso_id) {
      whereClause.curso_id = curso_id;
    }

    if (fecha_inicio && fecha_fin) {
      whereClause.fecha = {
        [Op.between]: [fecha_inicio, fecha_fin]
      };
    }

    const asistencias = await Asistencia.findAll({
      where: whereClause,
      include: [
        {
          model: Curso,
          attributes: ['id', 'nombre', 'grado', 'seccion']
        }
      ],
      order: [['fecha', 'DESC']]
    });

    // Calcular estadísticas
    const estadisticas = {
      total_clases: asistencias.length,
      presentes: asistencias.filter(a => a.estado === 'presente').length,
      ausentes: asistencias.filter(a => a.estado === 'ausente').length,
      tardanzas: asistencias.filter(a => a.estado === 'tardanza').length,
      justificados: asistencias.filter(a => a.estado === 'justificado').length
    };

    estadisticas.porcentaje_asistencia = estadisticas.total_clases > 0
      ? ((estadisticas.presentes + estadisticas.tardanzas) / estadisticas.total_clases * 100).toFixed(2)
      : 0;

    res.json({
      asistencias,
      estadisticas
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial de asistencia' });
  }
};

// Obtener reporte de asistencia de un curso
exports.obtenerReporteCurso = async (req, res) => {
  try {
    const { curso_id } = req.params;
    const { mes, año } = req.query;

    // Verificar permisos
    const curso = await Curso.findByPk(curso_id);
    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    if (curso.profesor_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver este reporte' 
      });
    }

    // Obtener estudiantes del curso
    const estudiantes = await User.findAll({
      include: [{
        model: Curso,
        as: 'cursos',
        where: { id: curso_id },
        through: { attributes: [] }
      }],
      attributes: ['id', 'nombre', 'apellido', 'email']
    });

    // Preparar fechas para el reporte
    let fechaInicio, fechaFin;
    
    if (mes && año) {
      fechaInicio = new Date(año, mes - 1, 1);
      fechaFin = new Date(año, mes, 0);
    } else {
      // Por defecto, mes actual
      const ahora = new Date();
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    }

    // Obtener asistencias del período
    const asistencias = await Asistencia.findAll({
      where: {
        curso_id,
        fecha: {
          [Op.between]: [fechaInicio, fechaFin]
        }
      }
    });

    // Crear reporte por estudiante
    const reporte = estudiantes.map(estudiante => {
      const asistenciasEstudiante = asistencias.filter(
        a => a.estudiante_id === estudiante.id
      );

      const estadisticas = {
        estudiante: {
          id: estudiante.id,
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
          email: estudiante.email
        },
        total_clases: asistenciasEstudiante.length,
        presentes: asistenciasEstudiante.filter(a => a.estado === 'presente').length,
        ausentes: asistenciasEstudiante.filter(a => a.estado === 'ausente').length,
        tardanzas: asistenciasEstudiante.filter(a => a.estado === 'tardanza').length,
        justificados: asistenciasEstudiante.filter(a => a.estado === 'justificado').length
      };

      estadisticas.porcentaje_asistencia = estadisticas.total_clases > 0
        ? ((estadisticas.presentes + estadisticas.tardanzas) / estadisticas.total_clases * 100).toFixed(2)
        : 0;

      // Verificar si cumple con el mínimo de asistencia
      const config = curso.configuracionAsistencia;
      estadisticas.cumple_minimo = estadisticas.porcentaje_asistencia >= 
        (config?.porcentaje_minimo_asistencia || 75);

      return estadisticas;
    });

    res.json({
      curso: {
        id: curso.id,
        nombre: curso.nombre,
        grado: curso.grado,
        seccion: curso.seccion
      },
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin
      },
      reporte
    });

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ error: 'Error al generar reporte de asistencia' });
  }
};

// Justificar falta
exports.justificarFalta = async (req, res) => {
  try {
    const { id } = req.params;
    const { justificacion, archivo_justificacion } = req.body;

    const asistencia = await Asistencia.findByPk(id);

    if (!asistencia) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
    }

    // Verificar permisos (padre del estudiante o admin)
    const esPadre = await verificarSiEsPadre(req.user.id, asistencia.estudiante_id);
    const esAdmin = req.user.rol === 'admin';
    const esProfesor = req.user.rol === 'profesor';

    if (!esPadre && !esAdmin && !esProfesor) {
      return res.status(403).json({ 
        error: 'No tienes permisos para justificar esta falta' 
      });
    }

    await asistencia.update({
      estado: 'justificado',
      justificacion,
      archivo_justificacion
    });

    res.json({
      message: 'Falta justificada exitosamente',
      asistencia
    });

  } catch (error) {
    console.error('Error al justificar falta:', error);
    res.status(500).json({ error: 'Error al justificar falta' });
  }
};

// Configurar límites de asistencia para un curso
exports.configurarLimites = async (req, res) => {
  try {
    const { curso_id } = req.params;
    const {
      limite_faltas_notificacion,
      limite_faltas_alerta,
      porcentaje_minimo_asistencia,
      notificar_padres,
      notificar_cada_falta
    } = req.body;

    // Verificar permisos
    if (req.user.rol !== 'admin' && req.user.rol !== 'profesor') {
      return res.status(403).json({ 
        error: 'No tienes permisos para configurar límites' 
      });
    }

    let config = await ConfigAsistencia.findOne({
      where: { curso_id }
    });

    if (config) {
      await config.update({
        limite_faltas_notificacion,
        limite_faltas_alerta,
        porcentaje_minimo_asistencia,
        notificar_padres,
        notificar_cada_falta
      });
    } else {
      config = await ConfigAsistencia.create({
        curso_id,
        limite_faltas_notificacion,
        limite_faltas_alerta,
        porcentaje_minimo_asistencia,
        notificar_padres,
        notificar_cada_falta
      });
    }

    res.json({
      message: 'Configuración actualizada exitosamente',
      config
    });

  } catch (error) {
    console.error('Error al configurar límites:', error);
    res.status(500).json({ error: 'Error al configurar límites de asistencia' });
  }
};

// ==================== FUNCIONES AUXILIARES ====================

// Verificar si un usuario es padre de un estudiante
async function verificarSiEsPadre(padreId, estudianteId) {
  const relacion = await PadreEstudiante.findOne({
    where: {
      padre_id: padreId,
      estudiante_id: estudianteId
    }
  });
  return !!relacion;
}

// Verificar y notificar faltas
async function verificarYNotificarFaltas(estudianteId, cursoId, transaction) {
  try {
    // Obtener configuración del curso
    const config = await ConfigAsistencia.findOne({
      where: { curso_id: cursoId },
      transaction
    });

    if (!config || !config.notificar_padres) {
      return;
    }

    // Contar faltas del estudiante en este curso
    const faltas = await Asistencia.count({
      where: {
        estudiante_id: estudianteId,
        curso_id: cursoId,
        estado: 'ausente'
      },
      transaction
    });

    // Obtener información del estudiante y curso
    const estudiante = await User.findByPk(estudianteId, {
      attributes: ['nombre', 'apellido'],
      transaction
    });

    const curso = await Curso.findByPk(cursoId, {
      attributes: ['nombre', 'grado', 'seccion'],
      transaction
    });

    // Verificar si se alcanzó el límite de notificación (3 faltas)
    if (faltas === config.limite_faltas_notificacion) {
      await crearNotificacionFaltas(
        estudianteId,
        curso,
        estudiante,
        faltas,
        'notificacion',
        transaction
      );
    }

    // Verificar si se alcanzó el límite de alerta (5 faltas)
    if (faltas === config.limite_faltas_alerta) {
      await crearNotificacionFaltas(
        estudianteId,
        curso,
        estudiante,
        faltas,
        'alerta',
        transaction
      );
    }

    // Si está configurado para notificar cada falta
    if (config.notificar_cada_falta) {
      await crearNotificacionFaltas(
        estudianteId,
        curso,
        estudiante,
        faltas,
        'individual',
        transaction
      );
    }

  } catch (error) {
    console.error('Error al verificar y notificar faltas:', error);
  }
}

// Crear notificación de faltas
async function crearNotificacionFaltas(estudianteId, curso, estudiante, numeroFaltas, tipo, transaction) {
  try {
    // Obtener padres del estudiante
    const padres = await User.findAll({
      include: [{
        model: User,
        as: 'hijos',
        where: { id: estudianteId },
        through: { attributes: [] }
      }],
      transaction
    });

    const nombreEstudiante = `${estudiante.nombre} ${estudiante.apellido}`;
    const nombreCurso = `${curso.grado}° ${curso.seccion} - ${curso.nombre}`;

    let titulo, mensaje, prioridad;

    switch (tipo) {
      case 'notificacion':
        titulo = `Notificación de Inasistencias - ${nombreEstudiante}`;
        mensaje = `${nombreEstudiante} ha acumulado ${numeroFaltas} faltas en el curso ${nombreCurso}. Por favor, contacte con el profesor para mayor información.`;
        prioridad = 'media';
        break;
      
      case 'alerta':
        titulo = `¡ALERTA! Límite de faltas alcanzado - ${nombreEstudiante}`;
        mensaje = `${nombreEstudiante} ha alcanzado ${numeroFaltas} faltas en el curso ${nombreCurso}. Esta situación requiere atención inmediata. Por favor, contacte con la institución.`;
        prioridad = 'urgente';
        break;
      
      case 'individual':
        titulo = `Nueva inasistencia registrada - ${nombreEstudiante}`;
        mensaje = `${nombreEstudiante} no asistió hoy a la clase de ${nombreCurso}. Total de faltas acumuladas: ${numeroFaltas}.`;
        prioridad = 'baja';
        break;
    }

    // Crear notificación para cada padre
    for (const padre of padres) {
      await Notificacion.create({
        usuario_id: padre.id,
        tipo: 'asistencia',
        titulo,
        mensaje,
        prioridad
      }, { transaction });
    }
      } catch (error) {
    console.error('Error al crear notificación de faltas:', error);
  }
}
