'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface
      .describeTable('padres_estudiantes')
      .catch(() => null);
    if (exists) return;

    await queryInterface.createTable('padres_estudiantes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      padre_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      estudiante_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parentesco: { type: Sequelize.STRING(50), allowNull: true }
    });

    // Regla: 1 padre puede tener varios estudiantes; cada estudiante solo 1 padre
    await queryInterface.addConstraint('padres_estudiantes', {
      type: 'unique',
      fields: ['estudiante_id'],
      name: 'uniq_estudiante_un_padre'
    });
    await queryInterface.addIndex('padres_estudiantes', ['padre_id'], { name: 'idx_padres_estudiantes_padre_id' });
  },
  async down(queryInterface) {
    try { await queryInterface.removeConstraint('padres_estudiantes', 'uniq_estudiante_un_padre'); } catch {}
    try { await queryInterface.removeIndex('padres_estudiantes', 'idx_padres_estudiantes_padre_id'); } catch {}
    await queryInterface.dropTable('padres_estudiantes').catch(()=>{});
  }
};