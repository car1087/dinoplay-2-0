

# Sistema de Gestión y Liquidación "Dino Play" 🦕🎮

## Visión General
Aplicación web progresiva (PWA) móvil-first para gestionar la operación diaria de un centro de juegos mecánicos, con dos roles: **Administrador** y **Trabajador**.

---

## 1. Autenticación y Roles
- Login con email/contraseña usando Supabase Auth
- Dos roles: `admin` y `worker` (tabla `user_roles`)
- Redirección automática al dashboard correspondiente según el rol
- El admin crea las cuentas de los trabajadores

## 2. Dashboard del Trabajador (Móvil-first)

### Inicio de Jornada
- Visualización clara de la **base en dinero** y **fichas iniciales** configuradas por el admin
- Campo de texto para anotar novedades de apertura
- Indicador visual del estado del día (pendiente / en curso / liquidado)

### Checklist de Cierre (obligatorio antes de liquidar)
- ✅ Máquinas desconectadas
- ✅ Limpieza de máquinas realizada
- ✅ Local barrido
- Todos deben estar marcados para habilitar el botón de liquidación

### Módulo de Liquidación
- **Fichas sobrantes** (input numérico grande, fácil de usar)
- **Usos de Gafas VR** (input numérico)
- **Cupones gratis canjeados**: selector Arcade vs VR con cantidad
- **Cálculos automáticos en tiempo real:**
  - Ventas Arcade = (Fichas Iniciales - Fichas Finales - Cupones Arcade) × $3.500
  - Ventas VR = (Usos VR - Cupones VR) × $6.000
  - Total Bruto = Ventas Arcade + Ventas VR + Base
  - Ganancia Neta = Total Bruto - Base
- Botón "Guardar Liquidación" con validación completa

## 3. Panel del Administrador

### Gestión de Trabajadores
- Crear, editar y desactivar cuentas de trabajadores
- Asignar credenciales de acceso

### Configuración Diaria
- Formulario para establecer **base de dinero** y **fichas iniciales** del día
- Se puede configurar por adelantado o el mismo día

### Historial y Calendario
- Vista de calendario interactivo (mes completo)
- Al seleccionar un día: detalle completo de la liquidación (quién la hizo, ganancias, novedades, checklist)

### Análisis de Datos (Recharts)
- Gráfica de barras de ganancias diarias
- Resumen semanal y mensual
- Comparativa entre meses
- Desglose Arcade vs VR

### Control de Liquidaciones
- Editar o eliminar liquidaciones erróneas
- Registro de quién y cuándo se corrigió

## 4. PWA (Instalable en celular)
- Manifest y service worker para instalación desde el navegador
- Caché de la interfaz para carga rápida
- Iconos y splash screen con branding "Dino Play"

## 5. Base de Datos (Supabase)
- **profiles**: datos del usuario (nombre, teléfono)
- **user_roles**: roles con seguridad RLS
- **daily_config**: base de dinero y fichas iniciales por día
- **settlements**: liquidaciones diarias con todos los cálculos
- **checklists**: registro del checklist de cierre
- Políticas RLS para que cada trabajador solo vea sus datos y el admin vea todo

## 6. Diseño y UX
- Tema con colores vibrantes (verde/amarillo) inspirados en "Dino Play"
- Botones grandes y contrastados para uso rápido en entorno de trabajo
- Tipografía clara y legible
- Formato de moneda colombiana (COP) con separadores de miles
- Interfaz 100% en español

