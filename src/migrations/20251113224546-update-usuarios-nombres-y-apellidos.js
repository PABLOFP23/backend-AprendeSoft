'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {

    // 1. Crear nuevas columnas
    await queryInterface.addColumn('usuarios', 'segundo_nombre', {
      type: DataTypes.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('usuarios', 'apellido1', {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''   // temporal, luego se reemplaza
    });

    await queryInterface.addColumn('usuarios', 'apellido2', {
      type: DataTypes.STRING(100),
      allowNull: true
    });

    // 2. Pasar datos desde la columna vieja "apellido"
    // Asumiendo que antes solo tenías 1 apellido
    await queryInterface.sequelize.query(`
      UPDATE usuarios
      SET apellido1 = apellido
      WHERE apellido IS NOT NULL;
    `);

    // 3. Eliminar columna antigua
    await queryInterface.removeColumn('usuarios', 'apellido');
  },

  down: async (queryInterface) => {
    // Volver atrás si algo falla
    await queryInterface.addColumn('usuarios', 'apellido', {
      type: DataTypes.STRING(100),
      allowNull: true
    });

    await queryInterface.sequelize.query(`
      UPDATE usuarios
      SET apellido = apellido1
      WHERE apellido1 IS NOT NULL;
    `);

    await queryInterface.removeColumn('usuarios', 'segundo_nombre');
    await queryInterface.removeColumn('usuarios', 'apellido1');
    await queryInterface.removeColumn('usuarios', 'apellido2');
  }
};
