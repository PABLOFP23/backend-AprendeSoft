'use strict';

module.exports = {
  async up(q, Sequelize) {
    const desc = await q.describeTable('excusas').catch(()=>null);

    if (!desc) {
      // Crear tabla completa si no existe
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

    // Añadir curso_id si falta
    if (!desc.curso_id) {
      await q.addColumn('excusas', 'curso_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
    // Asegurar materia_id si faltara
    if (!desc.materia_id) {
      await q.addColumn('excusas', 'materia_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'materias', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  },

  async down(q) {
    try { await q.removeColumn('excusas', 'materia_id'); } catch {}
    try { await q.removeColumn('excusas', 'curso_id'); } catch {}
  }
};