const { User, PadreEstudiante, Notificacion, Curso, Matricula } = require('../models');
let sendEmail = async () => {};
try { ({ sendEmail } = require('../utils/mailer')); } catch (_) {}

exports.enviarComunicacion = async (req, res) => {
  try {
    const actorId = req.user.id;
    if (!['profesor','admin'].includes(req.user.rol)) return res.status(403).json({ error: 'Sin permisos' });

    const { estudiante_id, parent_id, message, categoria, incluir_estudiante, enviar_a } = req.body;
    if (!message) return res.status(400).json({ error: 'message es requerido' });

    const destinatarios = new Set();

    if (parent_id) {
      const p = await User.findByPk(Number(parent_id));
      if (!p || p.rol !== 'padre') return res.status(404).json({ error: 'Padre no encontrado' });
      destinatarios.add(p.id);
    } else if (estudiante_id) {
      const padres = await PadreEstudiante.findAll({ where: { estudiante_id: Number(estudiante_id) }, attributes: ['padre_id'] });
      padres.forEach(r => { if (r.padre_id) destinatarios.add(r.padre_id); });
      if (!destinatarios.size) return res.status(404).json({ error: 'No se encontraron padres vinculados al estudiante' });
    } else {
      return res.status(400).json({ error: 'estudiante_id o parent_id requerido' });
    }

    // Opcional: también notificar al estudiante
    const enviarAlEstudiante = (enviar_a === 'ambos' || enviar_a === 'estudiante' || incluir_estudiante === true);
    if (enviarAlEstudiante && estudiante_id) {
      destinatarios.add(Number(estudiante_id));
    }

    const created = [];
    for (const uid of Array.from(destinatarios)) {
      const n = await Notificacion.create({
        usuario_id: uid,
        tipo: 'comunicacion',
        titulo: categoria ? `Comunicado — ${categoria}` : 'Comunicado',
        mensaje: String(message).slice(0, 2000),
        enviado_por: actorId,
        estudiante_id: estudiante_id ? Number(estudiante_id) : null
      });
      created.push(n);
    }
    return res.json({ message: 'Mensajes enviados', count: created.length });
  } catch (e) {
    console.error('comunicaciones.enviarComunicacion:', e);
    return res.status(500).json({ error: 'Error al enviar comunicacion' });
  }
};
exports.listarRecibidas = async (req, res) => {
  try {
    const nots = await Notificacion.findAll({
      where: { usuario_id: req.user.id, tipo: 'comunicacion' },
      include: [{ model: User, as: 'remitente', attributes: ['id','nombre','apellido1','rol','email'] }],
      order: [['created_at','DESC']]
    });
    // devolver las columnas planas + remitente
    return res.json(nots);
  } catch (e) {
    console.error('comunicaciones.listarRecibidas error:', e);
    return res.status(500).json({ error: 'Error al listar comunicaciones' });
  }
};

exports.listarEnviadas = async (req, res) => {
  try {
    const actorId = req.user.id;
    if (!['profesor','admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { curso_id, estudiante_id, parent_id } = req.query;

    // construir filtro base: notificaciones creadas por mí
    const where = { enviado_por: actorId, tipo: 'comunicacion' };

    // destinatario específico (padre)
    if (parent_id) {
      where.usuario_id = Number(parent_id);
    }

    // si filtras por estudiante, limitamos por ese estudiante_id en la columna de meta
    if (estudiante_id) {
      where.estudiante_id = Number(estudiante_id);
    } else if (curso_id) {
      // obtener estudiantes del curso para filtrar por estudiante_id
      const mats = await Matricula.findAll({ where: { curso_id: Number(curso_id), estado: 'activo' }, attributes: ['estudiante_id'] });
      const ids = mats.map(m => m.estudiante_id);
      if (ids.length) where.estudiante_id = { [require('sequelize').Op.in]: ids };
      else where.estudiante_id = -1; // fuerza vacío
    }

    const list = await Notificacion.findAll({
      where,
      include: [
        { model: User, as: 'remitente', attributes: ['id','nombre','apellido1','rol','email'] },
        { model: User, as: 'destinatario', foreignKey: 'usuario_id', attributes: ['id','nombre','apellido1','rol','email'] }
      ],
      order: [['created_at','DESC']]
    });

    // agrupar como chats por destinatario (padre) o por estudiante_id
    // frontend hará el grouping, aquí devolvemos plano con destinatario y estudiante_id
    return res.json(list);
  } catch (e) {
    console.error('comunicaciones.listarEnviadas error:', e);
    return res.status(500).json({ error: 'Error al listar enviadas' });
  }
};

