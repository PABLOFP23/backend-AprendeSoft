// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Helper: normalizar nombre para username
function slugifyName(nombre, apellido1) {
  const base = `${nombre}.${apellido1}`.toLowerCase();
  const sinAcentos = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const limpio = sinAcentos.replace(/[^a-z0-9.]/g, '');
  return limpio || 'usuario';
}

// Helper: calcular edad
function calculateAge(dateString) {
  const today = new Date();
  const birthDate = new Date(dateString);
  if (isNaN(birthDate.getTime())) return NaN;

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ======================
// REGISTRO PÚBLICO (ESTUDIANTE)
// ======================
exports.register = async (req, res) => {
  try {
    const {
      nombre,
      segundo_nombre,
      apellido1,
      apellido2,
      telefono,
      fecha_nacimiento,
      direccion,
      password
    } = req.body;

    // Campos obligatorios
    if (!nombre || !apellido1 || !telefono || !fecha_nacimiento || !direccion || !password) {
      return res.status(400).json({
        error: 'nombre, apellido1, telefono, fecha_nacimiento, direccion y password son obligatorios'
      });
    }

    // Validar teléfono
    const telLimpio = String(telefono).trim();
    if (!/^[0-9+\-\s]{7,20}$/.test(telLimpio)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }

    // Validar fecha y rango de edad (estudiante)
    const fecha = new Date(fecha_nacimiento);
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ error: 'fecha_nacimiento inválida' });
    }
    const edad = calculateAge(fecha_nacimiento);
    if (edad < 5 || edad > 18) {
      return res.status(400).json({ error: 'La edad del estudiante debe estar entre 5 y 18 años' });
    }

    // Generar username base con nombre + apellido1
    let baseUsername = slugifyName(nombre, apellido1);
    if (baseUsername.length > 20) baseUsername = baseUsername.slice(0, 20);

    let username = baseUsername;
    let intento = 1;
    while (intento <= 50) {
      const existingUser = await User.findOne({ where: { username } });
      if (!existingUser) break;
      username = `${baseUsername}${intento}`;
      intento++;
    }
    if (intento > 50) {
      return res.status(500).json({ error: 'No se pudo generar un nombre de usuario único' });
    }

    // Email institucional
    const dominio = process.env.INSTITUTION_DOMAIN || 'aprendesoft.edu.co';
    const email = `${username}@${dominio}`.toLowerCase();

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(500).json({ error: 'Conflicto al generar email institucional, intenta de nuevo' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Foto institucional
    const foto = `${username}.jpg`;

    const user = await User.create({
      nombre,
      segundo_nombre: segundo_nombre || null,
      apellido1,
      apellido2: apellido2 || null,
      email,
      username,
      password: hashedPassword,
      rol: 'estudiante',
      telefono: telLimpio,
      direccion,
      fecha_nacimiento,
      foto
    });

    const token = jwt.sign(
      { id: user.id, rol: user.rol, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        segundo_nombre: user.segundo_nombre,
        apellido1: user.apellido1,
        apellido2: user.apellido2,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        direccion: user.direccion,
        fecha_nacimiento: user.fecha_nacimiento,
        foto: user.foto
      },
      token
    });

  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// ======================
// CREAR USUARIO (SOLO ADMIN) CON ROL
// ======================
exports.adminCreateUser = async (req, res) => {
  try {
    const {
      nombre,
      segundo_nombre,
      apellido1,
      apellido2,
      telefono,
      fecha_nacimiento,
      direccion,
      password,
      rol
    } = req.body;

    const allowedRoles = ['admin', 'profesor', 'estudiante', 'padre'];
    if (!allowedRoles.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (!nombre || !apellido1 || !telefono || !fecha_nacimiento || !direccion || !password) {
      return res.status(400).json({
        error: 'nombre, apellido1, telefono, fecha_nacimiento, direccion y password son obligatorios'
      });
    }

    const telLimpio = String(telefono).trim();
    if (!/^[0-9+\-\s]{7,20}$/.test(telLimpio)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }

    const fecha = new Date(fecha_nacimiento);
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ error: 'fecha_nacimiento inválida' });
    }

    const edad = calculateAge(fecha_nacimiento);
    if (rol === 'estudiante') {
      if (edad < 5 || edad > 18) {
        return res.status(400).json({ error: 'La edad del estudiante debe estar entre 5 y 18 años' });
      }
    } else if (['profesor', 'padre', 'admin'].includes(rol)) {
      if (edad < 18) {
        return res.status(400).json({ error: `La edad mínima para rol ${rol} es 18 años` });
      }
    }

    let baseUsername = slugifyName(nombre, apellido1);
    if (baseUsername.length > 20) baseUsername = baseUsername.slice(0, 20);

    let username = baseUsername;
    let intento = 1;
    while (intento <= 50) {
      const existingUser = await User.findOne({ where: { username } });
      if (!existingUser) break;
      username = `${baseUsername}${intento}`;
      intento++;
    }
    if (intento > 50) {
      return res.status(500).json({ error: 'No se pudo generar un nombre de usuario único' });
    }

    const dominio = process.env.INSTITUTION_DOMAIN || 'aprendesoft.edu.co';
    const email = `${username}@${dominio}`.toLowerCase();

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(500).json({ error: 'Conflicto al generar email institucional, intenta de nuevo' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const foto = `${username}.jpg`;

    const user = await User.create({
      nombre,
      segundo_nombre: segundo_nombre || null,
      apellido1,
      apellido2: apellido2 || null,
      email,
      username,
      password: hashedPassword,
      rol,
      telefono: telLimpio,
      direccion,
      fecha_nacimiento,
      foto
    });

    return res.status(201).json({
      message: 'Usuario creado por admin correctamente',
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        segundo_nombre: user.segundo_nombre,
        apellido1: user.apellido1,
        apellido2: user.apellido2,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        direccion: user.direccion,
        fecha_nacimiento: user.fecha_nacimiento,
        foto: user.foto,
        activo: user.activo
      }
    });
  } catch (err) {
    console.error('adminCreateUser error:', err);
    return res.status(500).json({ error: 'Error al crear usuario desde admin' });
  }
};

// ======================
// LOGIN
// ======================
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body; 
    const user = await User.findOne({ where: { username } });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, username: user.username, rol: user.rol }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' } 
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        rol: user.rol
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
