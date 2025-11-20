'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('horarios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      curso_id: { type: Sequelize.INTEGER, allowNull: false },
      materia_id: { type: Sequelize.INTEGER, allowNull: true },
      profesor_id: { type: Sequelize.INTEGER, allowNull: true },
      dia: { type: Sequelize.STRING(20), allowNull: false }, // Lunes, Martes...
      hora_inicio: { type: Sequelize.TIME, allowNull: false },
      hora_fin: { type: Sequelize.TIME, allowNull: false },
      aula: { type: Sequelize.STRING(80), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('horarios', ['curso_id']);
    await queryInterface.addIndex('horarios', ['materia_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('horarios');
  }
};