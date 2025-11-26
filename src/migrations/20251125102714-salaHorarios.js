'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('horarios', 'sala', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('horarios', 'sala');
  }
};