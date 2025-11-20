const { Materia, Curso, User } = require('../models');

exports.listar = async (req, res) => {
  try {
    const materias = await Materia.findAll({
      include: [
        { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'], required: false },
        { model: User, as: 'profesor', attributes: ['id','nombre','apellido1','email'], required: false }
      ],
      order: [['nombre','ASC']]
    });
    res.json(materias);
  } catch (e) {
    console.error('listar materias:', e);
    res.status(500).json({ error: 'Error al listar materias' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, codigo, curso_id, profesor_id } = req.body;
    if (!nombre || !codigo) return res.status(400).json({ error: 'nombre y codigo son obligatorios' });

    // validar curso si viene
    if (curso_id) {
      const curso = await Curso.findByPk(curso_id);
      if (!curso) return res.status(400).json({ error: 'curso_id inválido' });
    }

    // validar profesor si viene
    if (profesor_id) {
      const user = await User.findByPk(profesor_id);
      if (!user || user.rol !== 'profesor') return res.status(400).json({ error: 'profesor_id inválido' });
    }

    const materia = await Materia.create({
      nombre,
      codigo,
      curso_id: curso_id || null,
      profesor_id: profesor_id || null
    });

    return res.status(201).json({ message: 'Materia creada', materia });
  } catch (e) {
    console.error('crear materia:', e);
    res.status(500).json({ error: 'Error al crear materia' });
  }
};

exports.asignarProfesor = async (req, res) => {
  try {
    const { id } = req.params;
    const { profesor_id } = req.body;
    const materia = await Materia.findByPk(id);
    if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });

    const prof = await User.findOne({ where: { id: profesor_id, rol: 'profesor' } });
    if (!prof) return res.status(400).json({ error: 'Profesor inválido' });

    await materia.update({ profesor_id });
    res.json({ message: 'Profesor asignado', materia });
  } catch (e) {
    console.error('asignarProfesor:', e);
    res.status(500).json({ error: 'Error' });
  }
};

exports.asignarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { curso_id } = req.body;
    const materia = await Materia.findByPk(id);
    if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });

    const curso = await Curso.findByPk(curso_id);
    if (!curso) return res.status(400).json({ error: 'Curso inválido' });

    await materia.update({ curso_id });
    res.json({ message: 'Materia asignada al curso', materia });
  } catch (e) {
    console.error('asignarCurso:', e);
    res.status(500).json({ error: 'Error' });
  }
};