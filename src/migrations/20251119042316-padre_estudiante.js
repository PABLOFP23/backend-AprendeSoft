'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // Crear tabla padre_estudiante con FKs
    await queryInterface.createTable('padre_estudiante', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      padre_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      parentesco: { type: DataTypes.STRING(50), allowNull: true }
    });

    await queryInterface.addConstraint('padre_estudiante', {
      fields: ['padre_id', 'estudiante_id'],
      type: 'unique',
      name: 'padre_estudiante_uq_padre_estudiante'
    });

    await queryInterface.addIndex('padre_estudiante', ['padre_id']);
    await queryInterface.addIndex('padre_estudiante', ['estudiante_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('padre_estudiante', 'padre_estudiante_uq_padre_estudiante');
    await queryInterface.dropTable('padre_estudiante');
  }
};