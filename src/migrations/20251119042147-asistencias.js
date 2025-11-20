'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('asistencias', {
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

      fecha: { type: DataTypes.DATEONLY, allowNull: false },

      estado: {
        type: DataTypes.ENUM('presente', 'ausente', 'tardanza', 'justificado'),
        allowNull: false
      },

      hora_llegada: { type: DataTypes.TIME, allowNull: true },
      observaciones: { type: DataTypes.TEXT, allowNull: true },
      justificacion: { type: DataTypes.TEXT, allowNull: true },
      archivo_justificacion: { type: DataTypes.STRING(255), allowNull: true },

      registrado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    // Un registro por alumno/curso/fecha
    await queryInterface.addConstraint('asistencias', {
      fields: ['estudiante_id', 'curso_id', 'fecha'],
      type: 'unique',
      name: 'asistencias_uq_estudiante_curso_fecha'
    });

    await queryInterface.addIndex('asistencias', ['curso_id']);
    await queryInterface.addIndex('asistencias', ['estudiante_id']);
    await queryInterface.addIndex('asistencias', ['fecha']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('asistencias', 'asistencias_uq_estudiante_curso_fecha');
    await queryInterface.dropTable('asistencias');
  }
};