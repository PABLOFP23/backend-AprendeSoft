'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // 1) Crear una columna temporal con el tipo ENUM nuevo
    await queryInterface.addColumn('cursos', 'grado_tmp', {
      type: DataTypes.ENUM(
        'prejardin',
        'jardin',
        'preescolar',
        'primero',
        'segundo',
        'tercero',
        'cuarto',
        'quinto'
      ),
      allowNull: false,
      defaultValue: 'primero'
    });

    // 2) Mapear los valores antiguos (INT) a los textos nuevos
    //    Ajusta aquí según cómo los tenías en la BD.
    await queryInterface.sequelize.query(`
      UPDATE cursos
      SET grado_tmp =
        CASE grado
          WHEN 1 THEN 'primero'
          WHEN 2 THEN 'segundo'
          WHEN 3 THEN 'tercero'
          WHEN 4 THEN 'cuarto'
          WHEN 5 THEN 'quinto'
          ELSE 'preescolar'
        END;
    `);

    // 3) Eliminar la columna vieja "grado" (INT)
    await queryInterface.removeColumn('cursos', 'grado');

    // 4) Renombrar "grado_tmp" -> "grado"
    await queryInterface.renameColumn('cursos', 'grado_tmp', 'grado');
  },

  down: async (queryInterface) => {
    // Revertir: volver a INT (por si algo sale mal y haces db:migrate:undo)

    // 1) Crear columna antigua como INT
    await queryInterface.addColumn('cursos', 'grado_int', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    // 2) Mapear textos de vuelta a número
    await queryInterface.sequelize.query(`
      UPDATE cursos
      SET grado_int =
        CASE grado
          WHEN 'primero' THEN 1
          WHEN 'segundo' THEN 2
          WHEN 'tercero' THEN 3
          WHEN 'cuarto' THEN 4
          WHEN 'quinto' THEN 5
          ELSE 1
        END;
    `);

    // 3) Borrar columna ENUM
    await queryInterface.removeColumn('cursos', 'grado');

    // 4) Renombrar grado_int -> grado
    await queryInterface.renameColumn('cursos', 'grado_int', 'grado');
  }
};
