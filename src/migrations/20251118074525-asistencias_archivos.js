'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('asistencias_archivos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ruta: { type: DataTypes.STRING(255), allowNull: false },
      fecha_subida: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('asistencias_archivos');
  }
};