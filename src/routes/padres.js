// src/routes/padres.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { User, InvitacionPadre, PadreEstudiante } = require('../models');


router.post('/invitaciones', authMiddleware, authorizeRoles('admin', 'profesor'), async (req, res) => {
  try {
    const { estudiante_id, email_padre, fecha_expiracion } = req.body;

    if (!estudiante_id || !email_padre) {
      return res.status(400).json({
        error: 'estudiante_id y email_padre son obligatorios'
      });
    }

    // 1) Verificar que el estudiante existe y es rol "estudiante"
    const estudiante = await User.findOne({
      where: { id: estudiante_id, rol: 'estudiante' }
    });

    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado o no es estudiante' });
    }

    // 2) Generar código único
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres

    // 3) Crear invitación
    const invitacion = await InvitacionPadre.create({
      estudiante_id,
      email_padre,
      codigo,
      estado: 'pendiente',
      fecha_envio: new Date(),
      fecha_expiracion: fecha_expiracion || null
    });

    // (más adelante aquí podrías enviar correo con el código)
    return res.status(201).json({
      message: 'Invitación creada correctamente',
      invitacion
    });

  } catch (err) {
    console.error('Error creando invitación de padre:', err);
    res.status(500).json({ error: 'Error al crear invitación' });
  }
});

router.post('/asignar', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { padre_id, estudiante_id, estudiante_numero_identificacion } = req.body;
    if (!padre_id) return res.status(400).json({ error: 'padre_id es requerido' });

    // buscar padre
    const padre = await User.findOne({ where: { id: Number(padre_id), rol: 'padre' } });
    if (!padre) return res.status(404).json({ error: 'Usuario padre no encontrado o no es rol padre' });

    // buscar estudiante por id o por numero_identificacion
    let estudiante = null;
    if (estudiante_id) {
      estudiante = await User.findOne({ where: { id: Number(estudiante_id), rol: 'estudiante' } });
    } else if (estudiante_numero_identificacion) {
      estudiante = await User.findOne({ where: { numero_identificacion: String(estudiante_numero_identificacion).trim(), rol: 'estudiante' } });
    } else {
      return res.status(400).json({ error: 'estudiante_id o estudiante_numero_identificacion requerido' });
    }

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    // crear relación si no existe
    const [rel, created] = await PadreEstudiante.findOrCreate({
      where: { padre_id: padre.id, estudiante_id: estudiante.id },
      defaults: { parentesco: 'Padre/Madre' }
    });

    return res.json({ message: created ? 'Asignación creada' : 'Relación ya existente', relacion: rel });
  } catch (err) {
    console.error('padres.asignar error:', err);
    return res.status(500).json({ error: 'Error asignando estudiante al padre' });
  }
});

router.post('/aceptar', async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      segundo_nombre,
      apellido1,
      apellido2,
      telefono,
      direccion,
      password
    } = req.body;

    if (!codigo || !nombre || !apellido1 || !password) {
      return res.status(400).json({
        error: 'codigo, nombre, apellido1 y password son obligatorios'
      });
    }

    // 1) Buscar invitación válida
    const invitacion = await InvitacionPadre.findOne({
      where: { codigo, estado: 'pendiente' }
    });

    if (!invitacion) {
      return res.status(400).json({ error: 'Invitación no válida o ya utilizada' });
    }

    // 2) Validar expiración si existe
    if (invitacion.fecha_expiracion) {
      const ahora = new Date();
      if (ahora > invitacion.fecha_expiracion) {
        invitacion.estado = 'expirada';
        await invitacion.save();
        return res.status(400).json({ error: 'La invitación ha expirado' });
      }
    }

    const email_padre = invitacion.email_padre;

    // 3) Revisar si ya existe un usuario padre con ese email
    let padre = await User.findOne({ where: { email: email_padre } });

    if (!padre) {
      // Crear nuevo usuario padre
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generar username simple (podemos mejorarlo luego)
      const baseUsername = email_padre.split('@')[0].slice(0, 20);
      let username = baseUsername;
      let contador = 1;
      // nos aseguramos de no duplicar username
      // (versión simple, suficiente por ahora)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existente = await User.findOne({ where: { username } });
        if (!existente) break;
        username = `${baseUsername}${contador}`;
        contador++;
      }

      padre = await User.create({
        nombre,
        segundo_nombre: segundo_nombre || null,
        apellido1,
        apellido2: apellido2 || null,
        email: email_padre,
        username,
        password: hashedPassword,
        rol: 'padre',
        telefono: telefono || null,
        direccion: direccion || null,
        activo: true
      });
    }

    // 4) Crear relación en padre_estudiante (si no existe ya)
    await PadreEstudiante.findOrCreate({
      where: {
        padre_id: padre.id,
        estudiante_id: invitacion.estudiante_id
      },
      defaults: { parentesco: 'Padre/Madre' }
    });

    // 5) Marcar invitación como aceptada
    invitacion.estado = 'aceptada';
    invitacion.fecha_aceptacion = new Date();
    await invitacion.save();

    // 6) (Opcional) generar token para loguear al padre de una vez
    let token = null;
    try {
      token = jwt.sign(
        { id: padre.id, rol: padre.rol, username: padre.username },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
    } catch (e) {
      console.error('No se pudo generar token para el padre:', e);
    }

    return res.status(201).json({
      message: 'Invitación aceptada, cuenta de padre asociada correctamente',
      padre: {
        id: padre.id,
        nombre: padre.nombre,
        segundo_nombre: padre.segundo_nombre,
        apellido1: padre.apellido1,
        apellido2: padre.apellido2,
        email: padre.email,
        username: padre.username,
        rol: padre.rol,
        telefono: padre.telefono,
        direccion: padre.direccion
      },
      estudiante_id: invitacion.estudiante_id,
      token
    });

  } catch (err) {
    console.error('Error al aceptar invitación de padre:', err);
    res.status(500).json({ error: 'Error al aceptar invitación' });
  }
});

module.exports = router;

