const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // valida que sea unico
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('administrador', 'profesor', 'estudiante'), // roles en español
    allowNull: false,
    defaultValue: 'estudiante' // por defecto estudiante
  }
});

module.exports = User;