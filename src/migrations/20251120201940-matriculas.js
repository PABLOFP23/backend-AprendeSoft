'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('matriculas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      curso_id: { type: Sequelize.INTEGER, allowNull: false },
      estudiante_id: { type: Sequelize.INTEGER, allowNull: false },
      fecha_matricula: { type: Sequelize.DATEONLY, defaultValue: Sequelize.NOW },
      estado: { type: Sequelize.ENUM('activo','inactivo'), defaultValue: 'activo' },
      created_at: { type: Sequelize.DATE, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('matriculas', ['curso_id']);
    await queryInterface.addIndex('matriculas', ['estudiante_id']);
    await queryInterface.addConstraint('matriculas', {
      fields: ['curso_id'],
      type: 'foreign key',
      name: 'fk_matriculas_curso',
      references: { table: 'cursos', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addConstraint('matriculas', {
      fields: ['estudiante_id'],
      type: 'foreign key',
      name: 'fk_matriculas_estudiante',
      references: { table: 'usuarios', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('matriculas');
  }
};