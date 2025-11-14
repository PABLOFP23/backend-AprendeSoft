'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('invitaciones_padres', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      // estudiante al que pertenece la invitación
      estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      // correo del padre al que se invita
      email_padre: {
        type: DataTypes.STRING(150),
        allowNull: false
      },

      // código único que usará el padre para registrarse
      codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },

      estado: {
        type: DataTypes.ENUM('pendiente', 'aceptada', 'expirada', 'cancelada'),
        allowNull: false,
        defaultValue: 'pendiente'
      },

      fecha_envio: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      fecha_aceptacion: {
        type: DataTypes.DATE,
        allowNull: true
      },

      fecha_expiracion: {
        type: DataTypes.DATE,
        allowNull: true
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('invitaciones_padres');
  }
};
