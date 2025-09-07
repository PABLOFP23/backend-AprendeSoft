const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const courseRoutes = require('./routes/courses');

dotenv.config();

const app = express();
app.use(cors()); //el backend “autoriza” al frontend comunicarse.
app.use(express.json()); //Activa el middleware de Express que permite interpretar el cuerpo (body) de las peticiones en formato JSON.




app.use('/api/auth', authRoutes); //express monta todas las rutas.
app.use('/api/protected', protectedRoutes);
app.use('/api/courses', courseRoutes); //monta las rutas de donde esta el crear y listar profesores

//sequelize.sync({ force: true }).then(() => { //se usa para forzar lla creacion nuevamente de toda la base de datos, !!!!no usar en produccion
sequelize.sync().then(() => {
  console.log('Base de datos sincronizada');
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(` Servidor corriendo en http://localhost:${PORT}`));
});

