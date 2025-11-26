'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface.describeTable('eventos').catch(()=>null);
    if (exists) return;
    await queryInterface.createTable('eventos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      titulo: { type: Sequelize.STRING(200), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      curso_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      hora_inicio: { type: Sequelize.TIME, allowNull: true },
      hora_fin: { type: Sequelize.TIME, allowNull: true },
      tipo: {
        type: Sequelize.ENUM('examen','actividad','festivo','reunion'),
        allowNull: false,
        defaultValue: 'actividad'
      },
      es_general: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
      // sin updated_at (modelo lo tiene en false)
    });
    await queryInterface.addIndex('eventos', ['curso_id'], { name: 'idx_eventos_curso_id' });
    await queryInterface.addIndex('eventos', ['fecha'], { name: 'idx_eventos_fecha' });
  },
  async down(queryInterface) {
    try { await queryInterface.removeIndex('eventos','idx_eventos_curso_id'); } catch {}
    try { await queryInterface.removeIndex('eventos','idx_eventos_fecha'); } catch {}
    await queryInterface.dropTable('eventos').catch(()=>{});
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_eventos_tipo";');
    }
  }
};
