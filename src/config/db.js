const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,      // nombre de la base de datos
  process.env.DB_USER,      // usuario de MySQL
  process.env.DB_PASSWORD,  // contraseña de MySQ()
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
  }
);

sequelize.authenticate()
  .then(() => console.log('Conexión a MySQL establecida'))
  .catch(err => console.error('Error de conexión:', err));

module.exports = sequelize;
 
