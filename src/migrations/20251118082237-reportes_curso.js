'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('reporte_curso', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

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

      nombre_curso: {                  
        type: DataTypes.STRING(100),
        allowNull: false
      },

      comentario: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await queryInterface.addIndex('reporte_curso', ['curso_id']);
    await queryInterface.addIndex('reporte_curso', ['materia_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('reporte_curso');
  }
};