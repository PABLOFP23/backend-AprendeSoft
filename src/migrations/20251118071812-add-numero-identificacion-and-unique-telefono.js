'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // Agregar columna numero_identificacion (máx 12)
    await queryInterface.addColumn('usuarios', 'numero_identificacion', {
      type: DataTypes.STRING(12),
      allowNull: true // si luego la quieres obligatoria, cambia a NOT NULL en otra migración
    });

    // Índice único para numero_identificacion
    await queryInterface.addConstraint('usuarios', {
      fields: ['numero_identificacion'],
      type: 'unique',
      name: 'usuarios_numero_identificacion_uq'
    });

    // Índice único para telefono (MySQL permite múltiples NULL)
    await queryInterface.addConstraint('usuarios', {
      fields: ['telefono'],
      type: 'unique',
      name: 'usuarios_telefono_uq'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('usuarios', 'usuarios_telefono_uq');
    await queryInterface.removeConstraint('usuarios', 'usuarios_numero_identificacion_uq');
    await queryInterface.removeColumn('usuarios', 'numero_identificacion');
  }
};