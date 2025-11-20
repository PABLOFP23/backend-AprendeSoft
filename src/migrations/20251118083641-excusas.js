'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('excusas', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      fecha: {                   
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      motivo: { type: DataTypes.TEXT, allowNull: true },

      ruta_archivo: {              
        type: DataTypes.STRING(255),
        allowNull: true
      },

      estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'desaprobada'),
        allowNull: false,
        defaultValue: 'pendiente'
      },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await queryInterface.addIndex('excusas', ['estudiante_id']);
    await queryInterface.addIndex('excusas', ['estado']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('excusas');
  }
};