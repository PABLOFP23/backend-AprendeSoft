'use strict';
const { DataTypes } = require('sequelize');
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('config_asistencia', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      curso_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      limite_faltas_notificacion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      limite_faltas_alerta: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      porcentaje_minimo_asistencia: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 75.00 },
      notificar_padres: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      notificar_cada_falta: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('config_asistencia');
  }
};