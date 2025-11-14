const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('cursos', 'join_code', {
      type: DataTypes.STRING(12),
      allowNull: true,
      unique: true,
      comment: 'Código para que el estudiante se una al curso'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('cursos', 'join_code');
  }
};
