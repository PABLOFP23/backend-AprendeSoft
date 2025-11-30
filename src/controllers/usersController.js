const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

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

    const {
      activo,
      nombre,
      segundo_nombre,
      apellido1,
      apellido2,
      telefono,
      direccion,
      numero_identificacion,
      rol
    } = req.body;

    const updates = {};

    // rol
    if (rol !== undefined) {
      const allowed = ['admin','profesor','estudiante','padre'];
      if (!allowed.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
      updates.rol = rol;
    }

    if (numero_identificacion !== undefined) {
      const ni = String(numero_identificacion || '').trim() || null;
      if (ni) {
        if (ni.length < 4 || ni.length > 12) return res.status(400).json({ error: 'NI debe tener 4-12 caracteres' });
        const existeNI = await User.findOne({ where: { numero_identificacion: ni, id: { [Op.ne]: user.id } } });
        if (existeNI) return res.status(409).json({ error: 'numero_identificacion ya en uso' });
      }
      updates.numero_identificacion = ni;
    }

    if (telefono !== undefined) {
      const tel = String(telefono).trim();
      if (tel && !/^[0-9+\-\s]{7,20}$/.test(tel)) return res.status(400).json({ error: 'Teléfono inválido' });
      if (tel) {
        const existeTel = await User.findOne({ where: { telefono: tel, id: { [Op.ne]: user.id } } });
        if (existeTel) return res.status(409).json({ error: 'telefono ya en uso' });
      }
      updates.telefono = tel || null;
    }

    if (activo !== undefined) updates.activo = !!activo;
    if (nombre !== undefined) updates.nombre = nombre;
    if (segundo_nombre !== undefined) updates.segundo_nombre = segundo_nombre || null;
    if (apellido1 !== undefined) updates.apellido1 = apellido1;
    if (apellido2 !== undefined) updates.apellido2 = apellido2 || null;
    if (direccion !== undefined) updates.direccion = direccion || null;

    await user.update(updates);
    return res.json({ message: 'Usuario actualizado', user });
  } catch (err) {
    console.error('usersController.adminUpdateUser error:', err);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};
exports.adminDeleteUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    await user.destroy();
    return res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error('usersController.adminDeleteUser error:', err);
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

exports.checkUnique = async (req, res) => {
  try {
    const { telefono, numero_identificacion, exclude_id } = req.query;
    const out = {};
    if (telefono) {
      const whereTel = { telefono: String(telefono).trim() };
      if (exclude_id) whereTel.id = { [Op.ne]: Number(exclude_id) };
      out.telefono = !!(await User.findOne({ where: whereTel, attributes: ['id'] }));
    }
    if (numero_identificacion) {
      const whereNI = { numero_identificacion: String(numero_identificacion).trim() };
      if (exclude_id) whereNI.id = { [Op.ne]: Number(exclude_id) };
      out.numero_identificacion = !!(await User.findOne({ where: whereNI, attributes: ['id'] }));
    }
    return res.json(out);
  } catch (err) {
    console.error('usersController.checkUnique error:', err);
    return res.status(500).json({ error: 'Error al validar unicidad' });
  }
};

exports.adminSetPassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { password } = req.body;
    if (!id) return res.status(400).json({ error: 'id inválido' });
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password mínimo 8 caracteres' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const hashed = await bcrypt.hash(String(password), 10);
    await user.update({ password: hashed });

    return res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('adminSetPassword error:', err);
    return res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
};