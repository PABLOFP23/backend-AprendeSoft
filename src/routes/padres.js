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

router.get('/de-estudiante/:estudiante_id', authMiddleware, authorizeRoles('admin','profesor'), async (req, res) => {
  try {
    const { User, PadreEstudiante } = require('../models');
    const estudiante_id = Number(req.params.estudiante_id);
    if (!estudiante_id) return res.status(400).json({ error: 'estudiante_id inválido' });

    // relación única (tu regla actual: un padre por estudiante)
    const rel = await PadreEstudiante.findOne({ where: { estudiante_id } });
    if (!rel) return res.json({ estudiante_id, padre: null });

    const padre = await User.findOne({
      where: { id: rel.padre_id, rol: 'padre' },
      attributes: ['id','nombre','segundo_nombre','apellido1','apellido2','email','telefono','direccion','numero_identificacion','activo']
    });

    return res.json({ estudiante_id, padre });
  } catch (err) {
    console.error('padres.de-estudiante error:', err);
    return res.status(500).json({ error: 'Error al obtener padre del estudiante' });
  }
});

router.delete('/desasignar', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { padre_id, estudiante_id, estudiante_numero_identificacion } = req.body;
    if (!padre_id) return res.status(400).json({ error: 'padre_id es requerido' });

    const { User, PadreEstudiante } = require('../models');
    const padre = await User.findOne({ where: { id: Number(padre_id), rol: 'padre' } });
    if (!padre) return res.status(404).json({ error: 'Padre no encontrado' });

    let estudiante = null;
    if (estudiante_id) {
      estudiante = await User.findOne({ where: { id: Number(estudiante_id), rol: 'estudiante' } });
    } else if (estudiante_numero_identificacion) {
      estudiante = await User.findOne({ where: { numero_identificacion: String(estudiante_numero_identificacion).trim(), rol: 'estudiante' } });
    } else {
      return res.status(400).json({ error: 'Envía estudiante_id o estudiante_numero_identificacion' });
    }
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const rel = await PadreEstudiante.findOne({ where: { padre_id: padre.id, estudiante_id: estudiante.id } });
    if (!rel) return res.status(404).json({ error: 'Relación padre-estudiante no existe' });

    await rel.destroy();
    return res.json({ message: 'Desasignado correctamente' });
  } catch (err) {
    console.error('padres.desasignar error:', err);
    return res.status(500).json({ error: 'Error desasignando estudiante del padre' });
  }
});

router.post('/asignar', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { padre_id, estudiante_id, estudiante_numero_identificacion, reemplazar } = req.body;
    if (!padre_id) return res.status(400).json({ error: 'padre_id es requerido' });

    const padre = await User.findOne({ where: { id: Number(padre_id), rol: 'padre' } });
    if (!padre) return res.status(404).json({ error: 'Padre no encontrado' });

    let estudiante = null;
    if (estudiante_id) {
      estudiante = await User.findOne({ where: { id: Number(estudiante_id), rol: 'estudiante' } });
    } else if (estudiante_numero_identificacion) {
      estudiante = await User.findOne({ where: { numero_identificacion: String(estudiante_numero_identificacion).trim(), rol: 'estudiante' } });
    } else {
      return res.status(400).json({ error: 'Envía estudiante_id o estudiante_numero_identificacion' });
    }
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const existente = await PadreEstudiante.findOne({ where: { estudiante_id: estudiante.id } });
    if (existente) {
      if (existente.padre_id === padre.id) return res.json({ message: 'Relación ya existente', relacion: existente });
      if (reemplazar === true) {
        await existente.update({ padre_id: padre.id });
        return res.json({ message: 'Padre reasignado al estudiante', relacion: existente });
      }
      return res.status(409).json({ error: 'El estudiante ya tiene padre asignado. Usa reemplazar=true para reasignar.' });
    }

    const rel = await PadreEstudiante.create({ padre_id: padre.id, estudiante_id: estudiante.id, parentesco: 'Padre/Madre' });
    return res.status(201).json({ message: 'Asignación creada', relacion: rel });
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
      password,
      numero_identificacion           
    } = req.body;

    if (!codigo || !nombre || !apellido1 || !password) {
      return res.status(400).json({ error: 'codigo, nombre, apellido1 y password son obligatorios' });
    }

    const invitacion = await InvitacionPadre.findOne({ where: { codigo, estado: 'pendiente' } });
    if (!invitacion) return res.status(400).json({ error: 'Invitación no válida o ya utilizada' });
    if (invitacion.fecha_expiracion && new Date() > invitacion.fecha_expiracion) {
      invitacion.estado = 'expirada';
      await invitacion.save();
      return res.status(400).json({ error: 'Invitación expirada' });
    }

    const email_padre = invitacion.email_padre;

    let padre = await User.findOne({ where: { email: email_padre } });

    // validar numero_identificacion si se envía
    let numeroIdent = null;
    if (numero_identificacion) {
      const ni = String(numero_identificacion).trim();
      if (!/^[0-9A-Za-z\-_.]{4,20}$/.test(ni)) {
        return res.status(400).json({ error: 'numero_identificacion inválido' });
      }
      const existeNI = await User.findOne({ where: { numero_identificacion: ni } });
      if (existeNI) return res.status(409).json({ error: 'numero_identificacion ya existe' });
      numeroIdent = ni;
    }

    if (!padre) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      const baseUsername = email_padre.split('@')[0].slice(0, 20);
      let username = baseUsername;
      let contador = 1;
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
        numero_identificacion: numeroIdent,
        activo: true
      });
    } else if (numeroIdent) {
      // Si ya existía y traemos un número nuevo
      await padre.update({ numero_identificacion: numeroIdent });
    }

    await PadreEstudiante.findOrCreate({
      where: { padre_id: padre.id, estudiante_id: invitacion.estudiante_id },
      defaults: { parentesco: 'Padre/Madre' }
    });

    invitacion.estado = 'aceptada';
    invitacion.fecha_aceptacion = new Date();
    await invitacion.save();

    const jwt = require('jsonwebtoken');
    let token = jwt.sign(
      { id: padre.id, rol: padre.rol, username: padre.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(201).json({
      message: 'Invitación aceptada, cuenta de padre asociada',
      padre: {
        id: padre.id,
        nombre: padre.nombre,
        apellido1: padre.apellido1,
        email: padre.email,
        numero_identificacion: padre.numero_identificacion
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

