const { Horario, Curso, Materia, User, Matricula } = require('../models'); // añade Horario al index.js models
const { Op } = require('sequelize');

exports.horarioEstudiante = async (req, res) => {
  try {
    const estudianteId = Number(req.params.estudiante_id);
    // obtener cursos del estudiante via Matricula
    const matriculas = await Matricula.findAll({ where: { estudiante_id: estudianteId, estado: 'activo' }, attributes: ['curso_id'] });
    const cursoIds = matriculas.map(m => m.curso_id);
    if (cursoIds.length === 0) return res.json([]);
    const rows = await Horario.findAll({
      where: { curso_id: { [Op.in]: cursoIds } },
      include: [
        { model: Materia, attributes: ['id','nombre'], required: false },
        { model: Curso, attributes: ['id','nombre'], required: false },
        { model: User, as: 'profesor', attributes: ['id','nombre','apellido1'], required: false }
      ],
      order: [['dia','ASC'], ['hora_inicio','ASC']]
    });
    return res.json(rows);
  } catch (e) {
    console.error('horarioEstudiante:', e);
    return res.status(500).json({ error: 'Error al obtener horario' });
  }
};

exports.horarioCurso = async (req, res) => {
  try {
    const cursoId = Number(req.params.curso_id);
    const rows = await Horario.findAll({ where: { curso_id: cursoId }, order: [['dia','ASC'], ['hora_inicio','ASC']] });
    return res.json(rows);
  } catch (e) {
    console.error('horarioCurso:', e);
    return res.status(500).json({ error: 'Error' });
  }
};