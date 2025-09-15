const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Matricula = sequelize.define('Matricula', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  estudiante_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  curso_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'cursos',
      key: 'id'
    }
  },
  fecha_matricula: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'matriculas',
  timestamps: false
});