const { User, Matricula, PadreEstudiante, Notificacion, Curso } = require('../models');
let sendEmail = async () => {};
try { ({ sendEmail } = require('../utils/mailer')); } catch (_) {}

exports.enviarCitacion = async (req, res) => {
  try {
    const senderId = req.user.id;
    if (!['profesor','admin'].includes(req.user.rol)) return res.status(403).json({ error: 'Sin permisos' });

    const { recipientType, curso_id, estudiante_id, estudiante_numero_identificacion, parent_id, message, fecha, hora, location } = req.body;
    if (!recipientType || !message) return res.status(400).json({ error: 'recipientType y message son requeridos' });

    const destinatarios = new Set();
    let targetEstudianteId = null;

    if (recipientType === 'curso') {
      if (!curso_id) return res.status(400).json({ error: 'curso_id requerido' });
      const mats = await Matricula.findAll({ where: { curso_id: Number(curso_id), estado: 'activo' }, attributes: ['estudiante_id'] });
      mats.forEach(m => destinatarios.add(m.estudiante_id));
    } else if (recipientType === 'estudiante' || recipientType === 'padre') {
      let estudi = null;
      if (estudiante_id) {
        estudi = await User.findOne({ where: { id: Number(estudiante_id), rol: 'estudiante' } });
      } else if (estudiante_numero_identificacion) {
        estudi = await User.findOne({ where: { numero_identificacion: String(estudiante_numero_identificacion).trim(), rol: 'estudiante' } });
      }
      if (!estudi) return res.status(404).json({ error: 'Estudiante no encontrado' });
      targetEstudianteId = estudi.id;

      if (recipientType === 'estudiante') {
        destinatarios.add(estudi.id);
      } else {
        const padres = await PadreEstudiante.findAll({ where: { estudiante_id: estudi.id }, attributes: ['padre_id'] });
        padres.forEach(p => destinatarios.add(p.padre_id));
      }
    } else {
      return res.status(400).json({ error: 'recipientType inválido' });
    }

    if (destinatarios.size === 0) return res.status(404).json({ error: 'No se encontraron destinatarios' });

    const created = [];
    for (const uid of Array.from(destinatarios)) {
      const not = await Notificacion.create({
        usuario_id: uid,
        tipo: 'citacion',
        titulo: 'Citación',
        mensaje: String(message).slice(0, 1000),
        enviado_por: senderId,
        estudiante_id: targetEstudianteId,     // para que el padre sepa por cuál hijo
        fecha_citacion: fecha || null,
        hora_citacion: hora || null,
        location: location || null
      });
      created.push(not);
    }
    return res.json({ message: 'Citación enviada', count: created.length });
  } catch (err) {
    console.error('enviarCitacion error:', err);
    return res.status(500).json({ error: 'Error al enviar citación' });
  }
};

exports.listarRecibidas = async (req, res) => {
  try {
    const nots = await Notificacion.findAll({
      where: { usuario_id: req.user.id, tipo: 'citacion' },
      include: [{ model: User, as: 'remitente', attributes: ['id','nombre','apellido1','rol','email'] }],
      order: [['created_at','DESC']]
    });
    return res.json(nots);
  } catch (e) {
    console.error('citaciones.listarRecibidas error:', e);
    return res.status(500).json({ error: 'Error al listar citaciones' });
  }
};

