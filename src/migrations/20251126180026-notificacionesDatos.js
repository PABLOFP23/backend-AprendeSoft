'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notificaciones', 'enviado_por', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('notificaciones', 'estudiante_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('notificaciones', 'fecha_citacion', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('notificaciones', 'hora_citacion', {
      type: Sequelize.TIME,
      allowNull: true
    });
    await queryInterface.addColumn('notificaciones', 'location', {
      type: Sequelize.STRING(150),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('notificaciones', 'location');
    await queryInterface.removeColumn('notificaciones', 'hora_citacion');
    await queryInterface.removeColumn('notificaciones', 'fecha_citacion');
    await queryInterface.removeColumn('notificaciones', 'estudiante_id');
    await queryInterface.removeColumn('notificaciones', 'enviado_por');
  }
};