const Aviso = sequelize.define('Aviso', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  contenido: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('general', 'curso', 'urgente'),
    defaultValue: 'general'
  },
  curso_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'cursos',
      key: 'id'
    }
  },
  autor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'avisos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = { Matricula, Tarea, Evento, Aviso };