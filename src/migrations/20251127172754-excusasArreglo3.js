'use strict';

module.exports = {
  async up(q, Sequelize) {
    const desc = await q.describeTable('excusas').catch(() => null);
    if (!desc) {
      // Crea tabla completa si no existe
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
      return;
    }

    // Añadir columnas que falten
    if (!desc.fecha_inicio) await q.addColumn('excusas', 'fecha_inicio', { type: Sequelize.DATEONLY, allowNull: false });
    if (!desc.fecha_fin) await q.addColumn('excusas', 'fecha_fin', { type: Sequelize.DATEONLY, allowNull: false });
    if (!desc.motivo) await q.addColumn('excusas', 'motivo', { type: Sequelize.TEXT, allowNull: false });
    if (!desc.archivo_justificacion) await q.addColumn('excusas', 'archivo_justificacion', { type: Sequelize.STRING(255), allowNull: true });
    if (!desc.estado) await q.addColumn('excusas', 'estado', { type: Sequelize.ENUM('pendiente','aprobada','rechazada'), allowNull: false, defaultValue: 'pendiente' });
    if (!desc.observaciones) await q.addColumn('excusas', 'observaciones', { type: Sequelize.TEXT, allowNull: true });
    if (!desc.creado_por) await q.addColumn('excusas', 'creado_por', { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete:'CASCADE', onUpdate:'CASCADE' });
    if (!desc.created_at) await q.addColumn('excusas', 'created_at', { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') });
    if (!desc.updated_at) await q.addColumn('excusas', 'updated_at', { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') });
  },

  async down(q) {
    // Elimina solo las columnas añadidas (ENUM requiere DROP antes si procede)
    try { await q.removeColumn('excusas', 'updated_at'); } catch {}
    try { await q.removeColumn('excusas', 'created_at'); } catch {}
    try { await q.removeColumn('excusas', 'creado_por'); } catch {}
    try { await q.removeColumn('excusas', 'observaciones'); } catch {}
    try { await q.removeColumn('excusas', 'estado'); } catch {}
    try { await q.removeColumn('excusas', 'archivo_justificacion'); } catch {}
    try { await q.removeColumn('excusas', 'motivo'); } catch {}
    try { await q.removeColumn('excusas', 'fecha_fin'); } catch {}
    try { await q.removeColumn('excusas', 'fecha_inicio'); } catch {}
  }
};