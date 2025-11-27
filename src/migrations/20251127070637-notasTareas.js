'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('tareas_estudiantes').catch(()=>({}));
    if (!desc.comentario) {
      await queryInterface.addColumn('tareas_estudiantes','comentario',{
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    if (!desc.nota) {
      await queryInterface.addColumn('tareas_estudiantes','nota',{
        type: Sequelize.DECIMAL(5,2),
        allowNull: true
      });
    }
    if (!desc.comentario_profesor) {
      await queryInterface.addColumn('tareas_estudiantes','comentario_profesor',{
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },
  async down(queryInterface) {
    try { await queryInterface.removeColumn('tareas_estudiantes','comentario_profesor'); } catch {}
    try { await queryInterface.removeColumn('tareas_estudiantes','nota'); } catch {}
    try { await queryInterface.removeColumn('tareas_estudiantes','comentario'); } catch {}
  }
};