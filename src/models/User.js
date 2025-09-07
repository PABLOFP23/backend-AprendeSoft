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
    type: DataTypes.ENUM('admin', 'teacher', 'student'), //roles disponibles
    allowNull: false,
    defaultValue: 'student' //para que todos por defecto sean estudiantes

  }
});

module.exports = User;

