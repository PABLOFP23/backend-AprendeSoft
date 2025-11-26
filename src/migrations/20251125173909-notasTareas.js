'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tareas_estudiantes', 'nota', {
      type: Sequelize.DECIMAL(5,2),
      allowNull: true
    });
    await queryInterface.addColumn('tareas_estudiantes', 'comentario_profesor', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('tareas_estudiantes', 'calificado_por', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('tareas_estudiantes', 'calificado_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tareas_estudiantes', 'nota');
    await queryInterface.removeColumn('tareas_estudiantes', 'comentario_profesor');
    await queryInterface.removeColumn('tareas_estudiantes', 'calificado_por');
    await queryInterface.removeColumn('tareas_estudiantes', 'calificado_at');
  }
};