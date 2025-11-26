const { Matricula, Curso, User, PadreEstudiante } = require('../models');
const { Op } = require('sequelize');

exports.listar = async (req, res) => {
  try {
    const { curso_id, estudiante_id: qEstudiante, profesor_id, estado, q } = req.query;
    const where = {};
    if (curso_id) where.curso_id = Number(curso_id);

    // permisos y alcance según rol
    if (req.user.rol === 'estudiante') {
      // Estudiante solo ve sus propias matrículas
      where.estudiante_id = req.user.id;
    } else if (req.user.rol === 'padre') {
      // Padre: devolver matrículas de sus hijos; si pide un estudiante concreto, verificar vínculo
      const rels = await PadreEstudiante.findAll({ where: { padre_id: req.user.id }, attributes: ['estudiante_id'] });
      const hijos = rels.map(r => r.estudiante_id);
      if (!hijos.length) return res.json([]);
      if (qEstudiante) {
        const idNum = Number(qEstudiante);
        if (!hijos.includes(idNum)) return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
        where.estudiante_id = idNum;
      } else {
        where.estudiante_id = { [Op.in]: hijos };
      }
    } else {
      // admin/profesor: pueden filtrar por estudiante_id (si se pasó)
      if (qEstudiante) where.estudiante_id = Number(qEstudiante);
    }

    if (estado) where.estado = estado;

    if (profesor_id && !curso_id) {
      const cursos = await Curso.findAll({ where: { profesor_id: Number(profesor_id) }, attributes: ['id'] });
      const cursoIds = cursos.map(c => c.id);
      where.curso_id = { [Op.in]: cursoIds.length ? cursoIds : [0] };
    }

    const include = [
      { model: User, as: 'estudiante', attributes: ['id','nombre','apellido1','email','numero_identificacion'] },
      { model: Curso, as: 'curso', attributes: ['id','nombre','grado','grupo'] }
    ];

    let matriculas = await Matricula.findAll({ where, include, order: [['fecha_matricula','DESC']] });

    // búsqueda q (opcional) en memoria sobre estudiante
    if (q && Array.isArray(matriculas)) {
      const term = String(q).toLowerCase();
      matriculas = matriculas.filter(m => {
        const s = `${m.estudiante?.nombre || ''} ${m.estudiante?.apellido1 || ''} ${m.estudiante?.email || ''} ${m.estudiante?.numero_identificacion || ''}`.toLowerCase();
        return s.includes(term);
      });
    }

    return res.json(matriculas);
  } catch (err) {
    console.error('matriculas.listar error:', err);
    return res.status(500).json({ error: 'Error listando matrículas' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;
    if (!['activo','inactivo'].includes(estado)) return res.status(400).json({ error: 'estado inválido' });

    const matricula = await Matricula.findByPk(id);
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });

    // permisos: admin o profesor del curso
    const curso = await Curso.findByPk(matricula.curso_id);
    if (req.user.rol !== 'admin' && curso?.profesor_id !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos para modificar esta matrícula' });
    }

    await matricula.update({ estado });
    return res.json({ message: 'Estado actualizado', matricula });
  } catch (err) {
    console.error('matriculas.actualizar error:', err);
    return res.status(500).json({ error: 'Error actualizando matrícula' });
  }
};

