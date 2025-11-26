const { Horario, User, Curso, Materia } = require('../models');

exports.listar = async (req, res) => {
  try {
    const { profesor_id, curso_id } = req.query;
    const where = {};
    if (profesor_id) where.profesor_id = Number(profesor_id);
    if (curso_id) where.curso_id = Number(curso_id);
    const rows = await Horario.findAll({
      where,
      include: [
        { model: User, as: 'profesor', attributes: ['id','nombre','apellido1','email'] },
        { model: Curso, as: 'curso', attributes: ['id','nombre'] },
        { model: Materia, as: 'materia', attributes: ['id','nombre'] }
      ],
      order: [['dia','ASC'], ['hora_inicio','ASC']]
    });
    res.json(rows);
  } catch (e) {
    console.error('horario.listar', e);
    res.status(500).json({ error: 'Error al listar horarios' });
  }
};

exports.listarPorProfesor = async (req, res) => {
  try {
    const profesor_id = Number(req.params.profesor_id);
    if (!profesor_id) return res.status(400).json({ error: 'profesor_id inválido' });
    // permiso: admin o el propio profesor
    if (req.user.rol !== 'admin' && req.user.id !== profesor_id) return res.status(403).json({ error: 'Sin permisos' });
    const rows = await Horario.findAll({ where: { profesor_id }, order:[['dia','ASC'],['hora_inicio','ASC']], include:[{model:Materia, as:'materia'},{model:Curso, as:'curso'}] });
    res.json(rows);
  } catch (e) {
    console.error('horario.listarPorProfesor', e);
    res.status(500).json({ error: 'Error' });
  }
};

exports.listarMiHorario = async (req, res) => {
  try {
    const profesor_id = req.user.id;
    const rows = await Horario.findAll({ where: { profesor_id }, order:[['dia','ASC'],['hora_inicio','ASC']], include:[{model:Materia, as:'materia'},{model:Curso, as:'curso'}] });
    res.json(rows);
  } catch (e) {
    console.error('horario.listarMiHorario', e);
    res.status(500).json({ error: 'Error' });
  }
};

exports.crear = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const { profesor_id, curso_id, materia_id, dia, hora_inicio, hora_fin, aula, sala } = req.body;
    if (!profesor_id || !dia || !hora_inicio || !hora_fin) return res.status(400).json({ error: 'Campos obligatorios faltan' });
    const h = await Horario.create({ profesor_id, curso_id: curso_id || null, materia_id: materia_id || null, dia, hora_inicio, hora_fin, aula: aula || null, sala: sala || null });
    res.status(201).json(h);
  } catch (e) {
    console.error('horario.crear', e);
    res.status(500).json({ error: 'Error al crear horario' });
  }
};

exports.editar = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const id = Number(req.params.id);
    const h = await Horario.findByPk(id);
    if (!h) return res.status(404).json({ error: 'No encontrado' });
    await h.update(req.body);
    res.json(h);
  } catch (e) {
    console.error('horario.editar', e);
    res.status(500).json({ error: 'Error al editar horario' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const id = Number(req.params.id);
    const h = await Horario.findByPk(id);
    if (!h) return res.status(404).json({ error: 'No encontrado' });
    await h.destroy();
    res.json({ message: 'Eliminado' });
  } catch (e) {
    console.error('horario.eliminar', e);
    res.status(500).json({ error: 'Error al eliminar horario' });
  }
};