'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tareas_estudiantes', 'comentario', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tareas_estudiantes', 'comentario');
  }
};