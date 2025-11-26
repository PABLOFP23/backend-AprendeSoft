const { Evento, Curso } = require('../models');
const { Op } = require('sequelize');

async function cursosDelProfesor(profesorId) {
  const rows = await Curso.findAll({ where: { profesor_id: profesorId }, attributes: ['id'] });
  return rows.map(r => r.id);
}

exports.listar = async (req, res) => {
  try {
    const { curso_id, desde, hasta, tipo } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;
    if (desde || hasta) where.fecha = { ...(desde ? { [Op.gte]: desde } : {}), ...(hasta ? { [Op.lte]: hasta } : {}) };

    // Filtro por rol:
    if (req.user.rol === 'admin') {
      if (curso_id !== undefined) where.curso_id = curso_id || null; // null => eventos generales
    } else if (req.user.rol === 'profesor') {
      const misCursos = await cursosDelProfesor(req.user.id);
      if (curso_id !== undefined) {
        // solo si es de sus cursos o general
        const cid = curso_id ? Number(curso_id) : null;
        if (cid && !misCursos.includes(cid)) return res.status(403).json({ error: 'Curso no pertenece al profesor' });
        where.curso_id = cid;
      } else {
        // eventos generales o de sus cursos
        where[Op.or] = [{ curso_id: { [Op.in]: misCursos } }, { curso_id: null }];
      }
    } else {
      // otros roles: solo generales
      where.curso_id = null;
    }

    const eventos = await Evento.findAll({
      where,
      include: [{ model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] }],
      order: [['fecha','ASC'], ['hora_inicio','ASC']]
    });
    res.json(eventos);
  } catch (e) {
    console.error('eventos.listar', e);
    res.status(500).json({ error: 'Error al listar eventos' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, es_general, curso_id } = req.body;
    if (!titulo || !fecha) return res.status(400).json({ error: 'titulo y fecha son requeridos' });

    let cursoIdFinal = curso_id ? Number(curso_id) : null;
    if (req.user.rol === 'profesor') {
      // profesor: puede crear en sus cursos o general=false
      if (es_general) return res.status(403).json({ error: 'Solo admin puede crear eventos generales' });
      if (cursoIdFinal) {
        const c = await Curso.findByPk(cursoIdFinal);
        if (!c) return res.status(404).json({ error: 'Curso no encontrado' });
        if (c.profesor_id !== req.user.id) return res.status(403).json({ error: 'Curso no pertenece al profesor' });
      }
    }
    const ev = await Evento.create({
      titulo,
      descripcion: descripcion || null,
      fecha,
      hora_inicio: hora_inicio || null,
      hora_fin: hora_fin || null,
      tipo: tipo || 'actividad',
      es_general: req.user.rol === 'admin' ? !!es_general : false,
      curso_id: cursoIdFinal
    });
    res.status(201).json({ message: 'Evento creado', evento: ev });
  } catch (e) {
    console.error('eventos.crear', e);
    res.status(500).json({ error: 'Error al crear evento' });
  }
};

exports.editar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ev = await Evento.findByPk(id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

    if (req.user.rol === 'profesor') {
      if (ev.curso_id) {
        const c = await Curso.findByPk(ev.curso_id);
        if (!c || c.profesor_id !== req.user.id) return res.status(403).json({ error: 'Sin permisos sobre este evento' });
      } else {
        // general: solo admin
        return res.status(403).json({ error: 'Solo admin puede editar eventos generales' });
      }
    }

    const updates = { ...req.body };
    if (req.user.rol !== 'admin') {
      // profesor no puede volver general
      if ('es_general' in updates) delete updates.es_general;
      if ('curso_id' in updates && ev.curso_id && Number(updates.curso_id) !== ev.curso_id) {
        return res.status(400).json({ error: 'No puedes mover el evento a otro curso' });
      }
    }
    await ev.update(updates);
    res.json({ message: 'Evento actualizado', evento: ev });
  } catch (e) {
    console.error('eventos.editar', e);
    res.status(500).json({ error: 'Error al editar evento' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ev = await Evento.findByPk(id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

    if (req.user.rol === 'profesor') {
      if (ev.curso_id) {
        const c = await Curso.findByPk(ev.curso_id);
        if (!c || c.profesor_id !== req.user.id) return res.status(403).json({ error: 'Sin permisos' });
      } else {
        return res.status(403).json({ error: 'Solo admin puede eliminar eventos generales' });
      }
    }

    await ev.destroy();
    res.json({ message: 'Evento eliminado' });
  } catch (e) {
    console.error('eventos.eliminar', e);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
};