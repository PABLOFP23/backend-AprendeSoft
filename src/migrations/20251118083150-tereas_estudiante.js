'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('tareas_estudiantes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      tarea_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'tareas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      estudiante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      curso_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      materia_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // puede ser null si la tarea es general del curso
        references: { model: 'materias', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      imagen_ruta:  { type: DataTypes.STRING(255), allowNull: true },
      archivo_ruta: { type: DataTypes.STRING(255), allowNull: true },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    // Un estudiante no puede enviar dos veces la misma tarea
    await queryInterface.addConstraint('tareas_estudiantes', {
      fields: ['tarea_id', 'estudiante_id'],
      type: 'unique',
      name: 'tareas_estudiantes_uq_tarea_estudiante'
    });

    await queryInterface.addIndex('tareas_estudiantes', ['curso_id']);
    await queryInterface.addIndex('tareas_estudiantes', ['materia_id']);
    await queryInterface.addIndex('tareas_estudiantes', ['tarea_id']);
    await queryInterface.addIndex('tareas_estudiantes', ['estudiante_id']);

    // CHECK: al menos una de las rutas debe existir
    await queryInterface.sequelize.query(`
      ALTER TABLE tareas_estudiantes
      ADD CONSTRAINT tareas_estudiantes_chk_ruta
      CHECK (imagen_ruta IS NOT NULL OR archivo_ruta IS NOT NULL)
    `);
  },

  down: async (queryInterface) => {
    // Elimina el CHECK (MySQL 8+)
    await queryInterface.sequelize.query(`
      ALTER TABLE tareas_estudiantes DROP CHECK tareas_estudiantes_chk_ruta
    `);

    await queryInterface.removeConstraint('tareas_estudiantes', 'tareas_estudiantes_uq_tarea_estudiante');
    await queryInterface.dropTable('tareas_estudiantes');
  }
};