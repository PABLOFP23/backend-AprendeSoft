'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // 1) Agregar columna grupo como NULL mientras migramos datos
    await queryInterface.addColumn('cursos', 'grupo', {
      type: DataTypes.STRING(10),
      allowNull: true    // luego lo ponemos NOT NULL
    });

    // 2) Si ya tienes algo en seccion, lo usamos como grupo (por compatibilidad)
    await queryInterface.sequelize.query(`
      UPDATE cursos
      SET grupo = seccion
      WHERE seccion IS NOT NULL AND seccion <> '';
    `);

    // 3) Para los que aún no tengan grupo, ponemos un valor por defecto
    await queryInterface.sequelize.query(`
      UPDATE cursos
      SET grupo = '1'
      WHERE grupo IS NULL OR grupo = '';
    `);

    // 4) Ahora sí, volver grupo obligatorio (NOT NULL)
    await queryInterface.changeColumn('cursos', 'grupo', {
      type: DataTypes.STRING(10),
      allowNull: false
    });
  },

  down: async (queryInterface) => {
    // Si hay que revertir, simplemente quitamos la columna
    await queryInterface.removeColumn('cursos', 'grupo');
  }
};
