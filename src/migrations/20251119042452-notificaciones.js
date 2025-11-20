'use strict';
const { DataTypes } = require('sequelize');
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('notificaciones', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tipo: { type: DataTypes.STRING(50), allowNull: false },
      titulo: { type: DataTypes.STRING(200), allowNull: false },
      mensaje: { type: DataTypes.TEXT, allowNull: true },
      leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      fecha_leida: { type: DataTypes.DATE, allowNull: true },
      prioridad: { type: DataTypes.ENUM('baja','media','alta','urgente'), allowNull: false, defaultValue: 'media' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await queryInterface.addIndex('notificaciones', ['usuario_id']);
    await queryInterface.addIndex('notificaciones', ['tipo']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('notificaciones');
  }
};