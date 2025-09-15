 const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

//registro de usuario

exports.register = async (req, res) => {
  try {
    const { username, password, rol } = req.body;

     const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    const hashed = await bcrypt.hash(password, 10); //password encryptada

    const user = await User.create({ username, password: hashed, rol: rol || '  ',nombre: req.body.nombre || username,
      email: req.body.email || `${username}@aprendesoft.edu.co`
    });
     //crea el usuario y si no tiene rol definicido deja estudiante predeterminado
    res.json({ message: 'Usuario registrado', 
      
      user: {
        id: user.id, 
        username: user.username, 
        rol: user.rol} //no devovlemos la password
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//login principal

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body; //extrae el usuario y la contraseña del cuerpo de la peticion
    const user = await User.findOne({ where: { username } }); // busca en la tabla user un registro que coincida

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' }); //verifica si no existe el usuario

    const isValid = await bcrypt.compare(password, user.password); //compara la contraseña
    if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });



    const token = jwt.sign({ id: user.id, username: user.username, role: user.rol}, 
    process.env.JWT_SECRET, { expiresIn: '24h' } );// si todo esta correcto devuelve token


    res.json({ message: 'Login exitoso', 
    token,
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.rol }}); // devuelve tambien rol para que el frontedn se comunique bien con el rol
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};