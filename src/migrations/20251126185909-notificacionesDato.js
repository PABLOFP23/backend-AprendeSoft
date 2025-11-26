'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Añadir columna leido si no existe
    const tableDesc = await queryInterface.describeTable('notificaciones').catch(()=>({}));
    if (!tableDesc.leido) {
      await queryInterface.addColumn('notificaciones', 'leido', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: 'mensaje'
      });
    }

    // Asegurar columnas previas (por si aún faltan)
    if (!tableDesc.enviado_por) {
      await queryInterface.addColumn('notificaciones', 'enviado_por', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    if (!tableDesc.estudiante_id) {
      await queryInterface.addColumn('notificaciones', 'estudiante_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    if (!tableDesc.fecha_citacion) {
      await queryInterface.addColumn('notificaciones', 'fecha_citacion', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });
    }
    if (!tableDesc.hora_citacion) {
      await queryInterface.addColumn('notificaciones', 'hora_citacion', {
        type: Sequelize.TIME,
        allowNull: true
      });
    }
    if (!tableDesc.location) {
      await queryInterface.addColumn('notificaciones', 'location', {
        type: Sequelize.STRING(150),
        allowNull: true
      });
    }

    // Índices útiles
    await queryInterface.addIndex('notificaciones', ['usuario_id', 'tipo']);
    await queryInterface.addIndex('notificaciones', ['enviado_por']);
  },

  async down(queryInterface) {
    // Eliminar sólo la columna leido (las demás quizá ya las uses)
    await queryInterface.removeColumn('notificaciones', 'leido');
  }
};