'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('reporte_estudiante', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
        allowNull: false,
        references: { model: 'materias', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      estado_rendimiento: {
        type: DataTypes.ENUM('regular', 'bueno', 'malo'),
        allowNull: false,
        defaultValue: 'regular'
      },

      comentario: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      nota: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
      },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    // Índices y restricción de unicidad
    await queryInterface.addIndex('reporte_estudiante', ['estudiante_id']);
    await queryInterface.addIndex('reporte_estudiante', ['curso_id']);
    await queryInterface.addIndex('reporte_estudiante', ['materia_id']);

    await queryInterface.addConstraint('reporte_estudiante', {
      fields: ['estudiante_id', 'materia_id', 'curso_id'],
      type: 'unique',
      name: 'reporte_estudiante_uq_est_materia_curso'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('reporte_estudiante', 'reporte_estudiante_uq_est_materia_curso');
    await queryInterface.dropTable('reporte_estudiante');
  }
};