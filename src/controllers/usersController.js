const { User } = require('../models');
const { Op } = require('sequelize');

exports.listUsers = async (req, res) => {
  try {
    const { rol, activo, q, limit = 200, offset = 0 } = req.query;
    const where = {};

    if (rol) where.rol = rol;
    if (activo !== undefined) {
      if (activo === 'true' || activo === '1') where.activo = true;
      else if (activo === 'false' || activo === '0') where.activo = false;
    }

    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [
        { nombre: like },
        { apellido1: like },
        { apellido2: like },
        { username: like },
        { email: like }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: [
        'id','username','nombre','segundo_nombre','apellido1','apellido2',
        'email','rol','activo','telefono','direccion','fecha_nacimiento','foto','created_at'
      ],
      order: [['apellido1','ASC'], ['nombre','ASC']],
      limit: Math.min(Number(limit) || 200, 1000),
      offset: Number(offset) || 0
    });

    return res.json(users);
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
};