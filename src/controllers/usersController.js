const { User } = require('../models');
const { Op } = require('sequelize');

exports.listUsers = async (req, res) => {
  try {
    const { q, role, activo } = req.query;
    const where = {};


    if (role) where.rol = role;
    if (activo !== undefined) {
      const val = String(activo).toLowerCase();
      where.activo = (val === 'true' || val === '1');
    }


    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [
        { nombre: like },
        { apellido1: like },
        { username: like },
        { email: like },
        { numero_identificacion: like }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: [
        'id',
        'username',
        'nombre',
        'segundo_nombre',
        'apellido1',
        'apellido2',
        'email',
        'numero_identificacion',
        'rol',
        'activo',
        'telefono'
      ],
      order: [['nombre', 'ASC']]
    });

    return res.json(users);
  } catch (err) {
    console.error('usersController.listUsers error:', err);
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { activo, nombre, telefono, direccion } = req.body;
    const updates = {};
    if (activo !== undefined) updates.activo = activo;
    if (nombre !== undefined) updates.nombre = nombre;
    if (telefono !== undefined) updates.telefono = telefono;
    if (direccion !== undefined) updates.direccion = direccion;

    await user.update(updates);
    return res.json({ message: 'Usuario actualizado', user });
  } catch (err) {
    console.error('usersController.adminUpdateUser error:', err);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};