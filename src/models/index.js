//aqui se realizara el manejo de los modelos y centralizar relaciones
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { FOREIGNKEYS } = require('sequelize/lib/query-types');

//modelo usuario
const User = sequelize.define('User', { 
    
id: {
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true
},

nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
apellido: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
    isEmail: true
    }
  },
    username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('admin', 'profesor', 'estudiante', 'padre'),
    defaultValue: 'estudiante'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha_nacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  timestamps: true, //crea dos columnas adicionale con el createdAt, updateAT
  createdAt: 'created_at', //renombra las carpetas
  updatedAt: 'updated_at'
});

//modelo curso

const Curso = sequelize.define('Curso', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
    },
nombre: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
grado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
seccion: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
capacidad: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  año_lectivo: {
    type: DataTypes.INTEGER,
    defaultValue: new Date().getFullYear()
  }
}, {
  tableName: 'cursos',
  timestamps: false
});

//modelo matricula

const matricula = sequelize.define('Matricula', {
id:{
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
fecha_matricula: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo'
  }
}, {
tableName: 'matriculas',
timestamps: false
});

//TAREA

const Tarea = sequelize.define('Tarea', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
fecha_entrega: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
prioridad: {
    type: DataTypes.ENUM('baja', 'media', 'alta'),
    defaultValue: 'media'
  }
}, {
  tableName: 'tareas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

//estado de tarea

const EstadoTarea = sequelize.define('EstadoTarea', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
estado: {
    type: DataTypes.ENUM('pendiente', 'en_proceso', 'completada', 'vencida'),
    defaultValue: 'pendiente'
  },
fecha_completado: {
    type: DataTypes.DATE,
    allowNull: true
  },
comentario_estudiante: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'estado_tareas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

//evento

const Evento = sequelize.define('Evento', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
hora_inicio: {
    type: DataTypes.TIME,
    allowNull: true
  },
hora_fin: {
    type: DataTypes.TIME,
    allowNull: true
  },
tipo: {
    type: DataTypes.ENUM('examen', 'actividad', 'festivo', 'reunion'),
    defaultValue: 'actividad'
  },
  es_general: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'eventos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

//modelo aviso

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
fecha_expiracion: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'avisos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

//modelo asistencia

const Asistencia = sequelize.define('Asistencia', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
estado: {
    type: DataTypes.ENUM('presente', 'ausente', 'tardanza', 'justificado'),
    allowNull: false
  },
hora_llegada: {
    type: DataTypes.TIME,
    allowNull: true
  },
observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
justificacion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
archivo_justificacion: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'asistencias',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// modelo configuracion de asistencia

const ConfigAsistencia = sequelize.define('ConfigAsistencia', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
limite_faltas_notificacion: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
limite_faltas_alerta: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
porcentaje_minimo_asistencia: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 75.00
  },
notificar_padres: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
notificar_cada_falta: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'config_asistencia',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

//modelo relacion padre-estudiante

const PadreEstudiante = sequelize.define('PadreEstudiante', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
parentesco: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'padre_estudiante',
  timestamps: false
});

//modelo notificacion

const Notificacion = sequelize.define('Notificacion', {
id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
tipo: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
mensaje: {
    type: DataTypes.TEXT,
    allowNull: true
  },
leida: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
fecha_leida: {
    type: DataTypes.DATE,
    allowNull: true
  },
prioridad: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'urgente'),
    defaultValue: 'media'
  }
}, {
  tableName: 'notificaciones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// -------------------MANEJO DE RELACIONES------------------------------------------------------

//usuario - curso

User.hasMany(Curso, { 
foreignKey: 'profesor_id',
as: 'cursosImpartidos' 
});
Curso.belongsTo(User, { 
foreignKey: 'profesor_id',
as: 'profesor' 
});

//matriculas (esrudiante-curso) mucho a muchos

user.belongsToMany(Curso, {
through: Matricula, 
foreignKey: 'estudiante_id',
otherKey: 'curso_id',
as:'cursos'

});


Curso.belongsToMany(User, {
  through: Matricula,
  foreignKey: 'curso_id',
  otherKey: 'estudiante_id',
  as: 'estudiantes'
});

//tareas

Curso.hasMany(Tarea, {
foreignKey: 'curso_id',
  as: 'tareas'
});
Tarea.belongsTo(Curso, {
foreignKey: 'curso_id'
});

User.hasMany(Tarea, {
foreignKey: 'profesor_id',
as: 'tareasCreadas'
});
Tarea.belongsTo(User, {
foreignKey: 'profesor_id',
as: 'profesor'
});

// Estado de Tareas (Estudiante - Tarea)
User.belongsToMany(Tarea, {
through: EstadoTarea,
foreignKey: 'estudiante_id',
otherKey: 'tarea_id',
as: 'tareasAsignadas'
});
Tarea.belongsToMany(User, {
through: EstadoTarea,
foreignKey: 'tarea_id',
otherKey: 'estudiante_id',
as: 'estudiantesAsignados'
});

//eventos 

Curso.hasMany(Evento, {
foreignKey: 'curso_id',
as: 'eventos'
});
Evento.belongsTo(Curso, {
foreignKey: 'curso_id'
});

User.hasMany(Evento, {
foreignKey: 'created_by',
as: 'eventosCreados'
});
Evento.belongsTo(User, {
foreignKey: 'created_by',
as: 'creador'
});

//Avisos

Curso.hasMany(Aviso, {
 foreignKey: 'curso_id',
as: 'avisos'
});
Aviso.belongsTo(Curso, {
foreignKey: 'curso_id'
});

User.hasMany(Aviso, {
foreignKey: 'autor_id',
as: 'avisosCreados'
});
Aviso.belongsTo(User, {
foreignKey: 'autor_id',
as: 'autor'
});

// Asistencias
User.hasMany(Asistencia, {
foreignKey: 'estudiante_id',
as: 'asistencias'
});
Asistencia.belongsTo(User, {
foreignKey: 'estudiante_id',
as: 'estudiante'
});

Curso.hasMany(Asistencia, {
foreignKey: 'curso_id',
as: 'asistenciasCurso'
});
Asistencia.belongsTo(Curso, {
foreignKey: 'curso_id'
});

User.hasMany(Asistencia, {
foreignKey: 'registrado_por',
as: 'asistenciasRegistradas'
});
Asistencia.belongsTo(User, {
foreignKey: 'registrado_por',
as: 'registrador'
});

// Configuración de Asistencia
Curso.hasOne(ConfigAsistencia, {
foreignKey: 'curso_id',
as: 'configuracionAsistencia'
});
ConfigAsistencia.belongsTo(Curso, {
foreignKey: 'curso_id'
});

// Relación Padre-Estudiante
User.belongsToMany(User, {
through: PadreEstudiante,
as: 'hijos',
foreignKey: 'padre_id',
otherKey: 'estudiante_id'
});
User.belongsToMany(User, {
through: PadreEstudiante,
as: 'padres',
foreignKey: 'estudiante_id',
otherKey: 'padre_id'
});

// Notificaciones
User.hasMany(Notificacion, {
foreignKey: 'usuario_id',
as: 'notificaciones'
});
Notificacion.belongsTo(User, {
foreignKey: 'usuario_id'
});

// Exportar todo
module.exports = {
sequelize,
User,
Curso,
Matricula,
Tarea,
EstadoTarea,
Evento,
Aviso,
Asistencia,
ConfigAsistencia,
PadreEstudiante,
Notificacion
};

