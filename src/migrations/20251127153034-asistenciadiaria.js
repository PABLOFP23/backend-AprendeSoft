'use strict';
module.exports = {
  async up(q, Sequelize) {
    const desc = await q.describeTable('asistencias').catch(()=>null);
    if (!desc) return;

    if (!desc.materia_id) {
      await q.addColumn('asistencias', 'materia_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'materias', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // índice único por día
    try {
      await q.addConstraint('asistencias', {
        fields: ['estudiante_id','curso_id','materia_id','fecha'],
        type: 'unique',
        name: 'uniq_asistencia_dia_por_materia'
      });
    } catch {}
  },
  async down(q) {
    try { await q.removeConstraint('asistencias','uniq_asistencia_dia_por_materia'); } catch {}
    try { await q.removeColumn('asistencias','materia_id'); } catch {}
  }
};