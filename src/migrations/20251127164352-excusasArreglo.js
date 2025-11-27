'use strict';
module.exports = {
  async up(q, Sequelize) {
    const exists = await q.describeTable('excusas').catch(()=>null);
    if (exists) return;
    await q.createTable('excusas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      estudiante_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete:'CASCADE', onUpdate:'CASCADE' },
      curso_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cursos', key: 'id' }, onDelete:'CASCADE', onUpdate:'CASCADE' },
      materia_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'materias', key: 'id' }, onDelete:'SET NULL', onUpdate:'CASCADE' },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_fin: { type: Sequelize.DATEONLY, allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      archivo_justificacion: { type: Sequelize.STRING(255), allowNull: true },
      estado: { type: Sequelize.ENUM('pendiente','aprobada','rechazada'), allowNull: false, defaultValue: 'pendiente' },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      creado_por: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete:'CASCADE', onUpdate:'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await q.addIndex('excusas', ['curso_id', 'fecha_inicio', 'fecha_fin'], { name:'idx_excusas_curso_fecha' });
    await q.addIndex('excusas', ['estudiante_id', 'estado'], { name:'idx_excusas_estudiante_estado' });
  },
  async down(q) {
    try { await q.dropTable('excusas'); } catch {}
  }
};