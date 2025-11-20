'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // Tabla materias
    await queryInterface.createTable('materias', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true }, // código único
      curso_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    // Relación N:M estudiantes (usuarios) ↔ materias
    await queryInterface.createTable('inscripciones_materias', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      materia_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'materias', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // Evitar duplicados de inscripción
    await queryInterface.addConstraint('inscripciones_materias', {
      fields: ['materia_id', 'estudiante_id'],
      type: 'unique',
      name: 'insc_materias_materia_estudiante_uq'
    });

    // Índices para performance
    await queryInterface.addIndex('inscripciones_materias', ['materia_id']);
    await queryInterface.addIndex('inscripciones_materias', ['estudiante_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('inscripciones_materias', 'insc_materias_materia_estudiante_uq');
    await queryInterface.dropTable('inscripciones_materias');
    await queryInterface.dropTable('materias');
  }
};