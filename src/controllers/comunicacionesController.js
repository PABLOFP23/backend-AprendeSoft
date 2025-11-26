const { User, PadreEstudiante, Notificacion } = require('../models');
let sendEmail = async () => {};
try { ({ sendEmail } = require('../utils/mailer')); } catch (_) {}

exports.enviarComunicacion = async (req, res) => {
  try {
    const actorId = req.user.id;
    const actorRol = req.user.rol;
    if (!['profesor','admin'].includes(actorRol)) return res.status(403).json({ error: 'Sin permisos' });

    const { estudiante_id, parent_id, message, categoria } = req.body;
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

