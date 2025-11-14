// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar la conexión y modelos
const { sequelize } = require('./models');


const app = express();

// ==================== MIDDLEWARES GLOBALES ====================

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ==================== RUTAS ====================

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🎓 AprendeSoft API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      cursos: '/api/cursos',       // 👈 corregido
      asistencia: '/api/asistencia',
      protected: '/api/protected'
    }
  });
});

// Montar rutas de la API (ÍNDICE ÚNICO)
app.use('/api', require('./routes')); // monta todo /api/* desde un único archivo

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ==================== INICIALIZACIÓN ====================

const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida correctamente');

    // 👉 Ya NO hacemos sync({ alter:true }) ni authenticate dos veces

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(` Servidor corriendo en:                
║     http://localhost:${PORT} `);
    });

  } catch (error) {
    console.error(' Error al iniciar el servidor:', error);
    process.exit(1);
  }
}; 

// Iniciar aplicación
startServer();

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT recibido. Cerrando servidor...');
  await sequelize.close();
  process.exit(0);
});
