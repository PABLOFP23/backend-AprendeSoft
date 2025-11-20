'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('materias', 'profesor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('materias', ['profesor_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('materias', ['profesor_id']).catch(()=>{});
    await queryInterface.removeColumn('materias', 'profesor_id');
  }
};