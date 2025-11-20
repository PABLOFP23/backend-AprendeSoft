'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('tareas', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      titulo: { type: DataTypes.STRING(200), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: true },
      fecha_entrega: { type: DataTypes.DATEONLY, allowNull: false },
      prioridad: {
        type: DataTypes.ENUM('baja', 'media', 'alta'),
        allowNull: false,
        defaultValue: 'media'
      },
      curso_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      materia_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'materias', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      profesor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await queryInterface.addIndex('tareas', ['curso_id']);
    await queryInterface.addIndex('tareas', ['materia_id']);
    await queryInterface.addIndex('tareas', ['profesor_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tareas');
  }
};