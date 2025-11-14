'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Eliminar columna seccion de la tabla cursos
    // Solo si existe. Si no existe, esto puede fallar, pero normalmente está.
    await queryInterface.removeColumn('cursos', 'seccion');
  },

  down: async (queryInterface, Sequelize) => {
    // Volver a crear la columna seccion si haces rollback
    await queryInterface.addColumn('cursos', 'seccion', {
      type: Sequelize.STRING(10),
      allowNull: true
    });
  }
};
