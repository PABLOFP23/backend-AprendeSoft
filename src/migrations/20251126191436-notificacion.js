'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('notificaciones').catch(()=>({}));
    if (!desc.created_at) {
      await queryInterface.addColumn('notificaciones', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }
    if (!desc.updated_at) {
      await queryInterface.addColumn('notificaciones', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      });
    }
  },
  async down(queryInterface) {
    // Solo quita updated_at (dejar created_at)
    try { await queryInterface.removeColumn('notificaciones','updated_at'); } catch {}
  }
};