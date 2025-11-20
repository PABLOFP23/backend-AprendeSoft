const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invitaciones', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(150), allowNull: false },

      // A quién invitas (por ahora usaremos 'padre', pero dejamos 'estudiante' por si luego lo usas)
      rol: { type: DataTypes.ENUM('padre', 'estudiante'), allowNull: false, defaultValue: 'padre' },

      // Si la invitación vincula a un padre con un estudiante específico
      student_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('invitaciones', ['email']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('invitaciones');
    // (MySQL elimina el ENUM al dropear la tabla, no hace falta limpieza extra)
  }
};
