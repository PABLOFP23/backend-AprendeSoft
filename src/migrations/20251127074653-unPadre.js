'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Quitar única compuesta si existe
    try { await queryInterface.removeConstraint('padres_estudiantes', 'uniq_padre_estudiante'); } catch {}
    // Asegurar columnas sin unique individual
    try { await queryInterface.changeColumn('padres_estudiantes', 'padre_id', { type: Sequelize.INTEGER, allowNull: false, unique: false }); } catch {}
    try { await queryInterface.changeColumn('padres_estudiantes', 'estudiante_id', { type: Sequelize.INTEGER, allowNull: false, unique: false }); } catch {}
    // Única: un padre por estudiante
    try {
      await queryInterface.addConstraint('padres_estudiantes', {
        type: 'unique',
        fields: ['estudiante_id'],
        name: 'uniq_estudiante_un_padre'
      });
    } catch {}
    // Índice auxiliar para listar hijos por padre
    try { await queryInterface.addIndex('padres_estudiantes', ['padre_id'], { name: 'idx_padre_estudiante_padre_id' }); } catch {}
  },
  async down(queryInterface) {
    try { await queryInterface.removeConstraint('padres_estudiantes', 'uniq_estudiante_un_padre'); } catch {}
    try { await queryInterface.removeIndex('padres_estudiantes', 'idx_padre_estudiante_padre_id'); } catch {}
    try {
      await queryInterface.addConstraint('padres_estudiantes', {
        type: 'unique',
        fields: ['padre_id','estudiante_id'],
        name: 'uniq_padre_estudiante'
      });
    } catch {}
  }
};