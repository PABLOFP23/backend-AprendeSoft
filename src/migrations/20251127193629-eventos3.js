'use strict';
module.exports = {
  async up(q, Sequelize) {
    const desc = await q.describeTable('eventos').catch(()=>null);
    if (desc && !desc.estado) {
      await q.addColumn('eventos', 'estado', {
        type: Sequelize.ENUM('activo','cancelado'),
        allowNull: false,
        defaultValue: 'activo'
      });
      await q.addIndex('eventos', ['estado'], { name: 'idx_eventos_estado' });
    }
  },
  async down(q) {
    try { await q.removeIndex('eventos', 'idx_eventos_estado'); } catch {}
    try { await q.removeColumn('eventos', 'estado'); } catch {}
  }
};