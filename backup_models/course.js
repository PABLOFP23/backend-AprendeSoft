const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

// Modelo de curso
const Course = sequelize.define('Course', {
  title: {
    type: DataTypes.STRING,
    allowNull: false //no permite que quede sin llenar
  },
  description: {
    type: DataTypes.TEXT, 
    allowNull: true // opcional
  }
});

// Relación: un usuario puede tener varios cursos(profe y admins)
User.hasMany(Course, { foreignKey: 'userId' }); //hasmany una a muchos muchos(un registro de esta tabla puede estar relacionado con muchos de otras tablas)
Course.belongsTo(User, { foreignKey: 'userId' }); //un modelo pertenece a otro y guarda la clave foranea

module.exports = Course;
