╔══════════════════════════════════════════════════════════════════════════════╗
║                          CERCANÍA - APP FAMILIAR                           ║
║                     Localización familiar en tiempo real                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DESCRIPCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cercanía es una aplicación móvil de localización familiar en tiempo real,
similar a Life360, diseñada especialmente para familias en Latinoamérica.
Permite ver la ubicación de los integrantes de un grupo familiar en un mapa,
con actualizaciones cada 1 segundo cuando la app está abierta y cada 3
minutos en segundo plano.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STACK TECNOLÓGICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  FRONTEND
  ─────────────────────────────────────────────
  • React Native + Expo SDK 51
  • TypeScript
  • Expo Router (navegación basada en archivos)
  • Zustand (manejo de estado global)
  • react-native-maps + Google Maps SDK
  • expo-location + expo-task-manager (GPS)
  • expo-local-authentication (biometría)
  • expo-notifications + Firebase (push)
  • expo-secure-store (tokens cifrados)
  • expo-haptics (vibración)
  • expo-battery (nivel de batería)

  BACKEND
  ─────────────────────────────────────────────
  • Supabase (PostgreSQL + Auth + Realtime)
  • Firebase Cloud Messaging (notificaciones)
  • Expo Push Notifications API

  ALGORITMOS
  ─────────────────────────────────────────────
  • Filtro de Kalman (suavizado de GPS)
  • Haversine (cálculo de distancias)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARQUITECTURA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────┐
  │                    CLIENTE MÓVIL                        │
  │              React Native + Expo SDK 51                 │
  ├─────────────────────────────────────────────────────────┤
  │  UI Layer (Expo Router)                                 │
  │  Auth · Home · Mapa · Grupos · Perfil · SOS · Settings  │
  ├─────────────────────────────────────────────────────────┤
  │  State Layer (Zustand)                                  │
  │  useAuth · useTracking · useGroups                      │
  ├─────────────────────────────────────────────────────────┤
  │  Services Layer                                         │
  │  auth · tracking · sos · notifications · biometric      │
  ├─────────────────────────────────────────────────────────┤
  │  Native Layer                                           │
  │  expo-location · react-native-maps · expo-local-auth    │
  └─────────────────────────────────────────────────────────┘
             │ HTTPS/WSS                  │ FCM
             ▼                            ▼
  ┌─────────────────────┐      ┌─────────────────┐
  │      SUPABASE       │      │    FIREBASE     │
  │  PostgreSQL + RLS   │      │  Push Tokens    │
  │  Realtime WebSocket │◄─────│  Notificaciones │
  │  Auth JWT + OTP     │      └─────────────────┘
  │  9 funciones RPC    │
  └─────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BASE DE DATOS (16 tablas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  auth.users              → Usuarios (Supabase Auth)
  profiles                → Nombre, teléfono, correos de respaldo
  user_settings           → Biometría, tracking habilitado
  push_tokens             → Tokens FCM por dispositivo
  locations               → Última ubicación de cada usuario
  location_history        → Historial de ubicaciones (7 días)
  location_views_log      → Log de quién vio qué ubicación
  invisible_mode          → Estado de modo invisible con expiración
  groups                  → Grupos familiares
  group_members           → Miembros por grupo con rol
  group_invitations       → Códigos de invitación (48h expiración)
  geofences               → Zonas seguras por grupo
  geofence_events         → Eventos de entrada/salida
  sos_alerts              → Alertas de emergencia activas
  trusted_contacts        → Contactos de confianza (recuperación)
  recovery_requests       → Solicitudes de recuperación social
  recovery_approvals      → Aprobaciones individuales


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FLUJO DE UBICACIÓN EN TIEMPO REAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GPS del celular
      │
      ▼
  Filtros duros (precisión < 25m, velocidad < 200km/h)
      │
      ▼
  Filtro de Kalman (suavizado matemático del movimiento)
      │
      ▼
  Foreground: watchPositionAsync cada 1 segundo (mapa abierto)
  Background: startLocationUpdatesAsync cada 3 minutos
      │
      ▼
  Supabase RPC: update_location()
      │
      ▼
  Realtime WebSocket → todos los miembros del grupo
      │
      ▼
  Pin se mueve en el mapa en tiempo real


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FLUJO DE SOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Usuario mantiene botón SOS 3 segundos
      │
      ▼
  Vibración progresiva + feedback háptico
      │
      ▼
  GPS actual capturado
      │
      ├──► Supabase: create_sos_alert()
      │        │
      │        ▼
      │    Realtime → beacon 🆘 animado en mapa de todos
      │
      └──► Expo Push → FCM → notificación URGENTE
               (bypasa modo No Molestar en Android)

  Pantalla roja pulsante con timer activo
  Botón "Estoy a salvo" para cancelar (con confirmación)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RECUPERACIÓN SOCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  El usuario designa 3-5 contactos de confianza
      │
  Si pierde acceso a su cuenta:
      │
      ▼
  Inicia solicitud de recuperación social
      │
      ▼
  Notificación push a contactos de confianza
      │
      ▼
  Mínimo 3 contactos deben aprobar
      │
      ▼
  48 horas de espera (seguridad contra fraude)
      │
      ▼
  Durante la espera: notificación al email/teléfono viejo
  (ventana para cancelar si fue un ataque)
      │
      ▼
  Usuario crea nueva contraseña
  Todas las sesiones activas se cierran


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SEGURIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  • RLS (Row Level Security) en todas las tablas
    → La base de datos misma rechaza accesos no autorizados
    → Un usuario solo ve ubicaciones de su grupo

  • Tokens JWT almacenados en expo-secure-store
    → Cifrado con el llavero nativo del sistema operativo
    → No se guardan en texto plano

  • Biometría opcional (huella / Face ID)
    → Protege el acceso aunque el celular esté desbloqueado

  • Modo invisible transparente
    → El usuario puede pausar su ubicación
    → El grupo ve "pausó su ubicación" (sin mentiras)

  • Modo pánico en recuperación social
    → Cancela cualquier intento de recuperación fraudulenta

  • Cifrado en tránsito: HTTPS + WSS (obligatorio en Supabase)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ESTRUCTURA DE CARPETAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  app-scaffold/
  ├── app/
  │   ├── _layout.tsx                 → Layout raíz + push + auth
  │   ├── biometric-gate.tsx          → Pantalla de huella/Face ID
  │   ├── (auth)/
  │   │   ├── welcome.tsx             → Pantalla de bienvenida
  │   │   ├── login.tsx               → Inicio de sesión
  │   │   ├── register.tsx            → Registro
  │   │   ├── verify-otp.tsx          → Verificación OTP
  │   │   ├── forgot-password.tsx     → Olvidé contraseña
  │   │   ├── reset-password.tsx      → Nueva contraseña
  │   │   └── recovery-social.tsx     → Recuperación social
  │   └── (app)/
  │       ├── home.tsx                → Pantalla principal + SOS
  │       ├── profile.tsx             → Perfil completo
  │       ├── permissions.tsx         → Permisos de ubicación
  │       ├── sos-active.tsx          → Pantalla SOS activo
  │       ├── group/
  │       │   ├── create.tsx          → Crear grupo
  │       │   ├── join.tsx            → Unirse con código
  │       │   └── [id]/index.tsx      → Detalle del grupo
  │       ├── map/
  │       │   └── [groupId].tsx       → Mapa en tiempo real
  │       └── settings/
  │           ├── biometric.tsx       → Configurar biometría
  │           ├── invisible-mode.tsx  → Modo invisible
  │           └── trusted-contacts.tsx → Contactos de confianza
  ├── src/
  │   ├── components/
  │   │   ├── ui/
  │   │   │   ├── Button.tsx
  │   │   │   ├── Input.tsx
  │   │   │   ├── ScreenContainer.tsx
  │   │   │   └── SplashScreen.tsx    → Splash animado
  │   │   ├── map/
  │   │   │   ├── MemberPin.tsx
  │   │   │   ├── GeofenceCircle.tsx
  │   │   │   └── SOSBeacon.tsx
  │   │   └── sos/
  │   │       └── SOSButton.tsx       → Botón hold 3s
  │   ├── services/
  │   │   ├── auth.service.ts
  │   │   ├── biometric.service.ts
  │   │   ├── tracking.service.ts     → GPS + Kalman + foreground/BG
  │   │   ├── sos.service.ts          → Alertas de emergencia
  │   │   └── notifications.service.ts → Push notifications
  │   ├── store/
  │   │   ├── auth.ts                 → Zustand auth store
  │   │   ├── tracking.ts             → Zustand tracking store
  │   │   └── groups.ts               → Zustand groups store
  │   ├── hooks/
  │   │   ├── useGroupLive.ts         → Realtime del grupo
  │   │   ├── useLocationPermission.ts
  │   │   └── useBatteryStatus.ts
  │   ├── lib/
  │   │   ├── supabase.ts             → Cliente Supabase
  │   │   ├── theme.ts                → Colores, tipografía, spacing
  │   │   ├── mapStyle.ts             → Estilos personalizados de mapa
  │   │   └── secureStorage.ts        → Wrapper expo-secure-store
  │   ├── utils/
  │   │   ├── kalman.ts               → Filtro de Kalman GPS
  │   │   ├── format.ts               → Utilidades de formato
  │   │   └── validation.ts           → Validaciones
  │   └── types/
  │       └── index.ts                → Tipos TypeScript globales


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VARIABLES DE ENTORNO (.env)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  EXPO_PUBLIC_SUPABASE_URL=https://xvwsxkpgvzneiaijkeek.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ...    (no usado actualmente)
  MAPBOX_DOWNLOAD_TOKEN=sk.eyJ...       (no usado actualmente)
  EXPO_PUBLIC_TRACKING_INTERVAL_MS=1000
  EXPO_PUBLIC_TRACKING_DISTANCE_M=2
  EXPO_PUBLIC_ENV=development


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  COMANDOS PARA DESARROLLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Iniciar servidor de desarrollo
  cd C:\Users\ESCUELA\Documents\cercania\app-scaffold
  npx expo start --dev-client

  # Compilar y abrir en Android
  npx expo run:android

  # Compilar limpio (si hay errores raros)
  npx expo run:android --no-build-cache

  # Reconectar celular por WiFi
  adb tcpip 5555
  adb connect 100.117.157.236:5555

  # Reconectar celular por cable
  adb reverse tcp:8081 tcp:8081

  # Ver logs de errores
  adb logcat -s ReactNativeJS:E AndroidRuntime:E -T 1

  # Limpiar caché de Metro
  npx expo start --dev-client --clear

  # Regenerar carpeta android (si hay cambios en app.json o plugins)
  rmdir /s /q android
  npx expo prebuild --clean
  notepad android\local.properties
  → sdk.dir=C\:\\Users\\ESCUELA\\AppData\\Local\\Android\\Sdk
  notepad android\gradle.properties
  → agregar: hermesEnabled=true
  npx expo run:android --no-build-cache


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREDENCIALES Y SERVICIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supabase
  ─────────────────────────────────────────────
  URL:       https://xvwsxkpgvzneiaijkeek.supabase.co
  Dashboard: https://supabase.com/dashboard
  Proyecto:  Cercaniaa

  Google Maps
  ─────────────────────────────────────────────
  API Key:   AIzaSyD92VHuIN7P6RdBKnmMGCGd-a7TygLlJco
  Console:   https://console.cloud.google.com

  Firebase
  ─────────────────────────────────────────────
  Proyecto:  cercania-3c770
  Console:   https://console.firebase.google.com
  App ID:    1:677414769976:android:5f891dc532572b4a681dcd

  Expo
  ─────────────────────────────────────────────
  Dashboard: https://expo.dev
  Slug:      cercania
  Package:   com.tuempresa.cercania

  Dispositivo de prueba
  ─────────────────────────────────────────────
  Modelo:    ZTE_8030
  IP WiFi:   100.117.157.236:5555
  Java:      C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
  SDK:       C:\Users\ESCUELA\AppData\Local\Android\Sdk


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FUNCIONALIDADES IMPLEMENTADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [✓] Registro con email + contraseña + OTP verificación
  [✓] Inicio de sesión con "mantener sesión 30 días"
  [✓] Biometría opcional (huella / Face ID)
  [✓] Olvidé contraseña por email
  [✓] Recuperación social (3 de 5 contactos + 48h espera)
  [✓] Modo pánico (cancelar recuperación fraudulenta)
  [✓] Perfil de usuario completo (nombre, teléfono, correos)
  [✓] Grupos familiares (crear, unirse, editar, salir)
  [✓] Código de invitación (6 caracteres, 48h expiración)
  [✓] Mapa en tiempo real con Google Maps
  [✓] Pines personalizados (iniciales, batería, último visto)
  [✓] GPS cada 1 segundo (foreground) / 3 minutos (background)
  [✓] Filtro de Kalman (elimina rebote del GPS)
  [✓] Indicador de batería baja por miembro
  [✓] Indicador "último visto" cuando el pin está inactivo
  [✓] Botón SOS (mantener 3s, vibración progresiva)
  [✓] Pantalla SOS activo con timer
  [✓] Beacon animado 🆘 en mapa de todos los miembros
  [✓] Modo invisible (30min / 1h / 3h / 8h / indefinido)
  [✓] Contactos de confianza (invitar, aceptar, gestionar)
  [✓] Notificaciones push (SOS, recuperación, contactos)
  [✓] Splash screen animado con logo pulsante
  [✓] Modo claro / oscuro automático (según sistema)

  [ ] Widget de pantalla de inicio (Paso 10 - pendiente)
  [ ] Geofencing "llegué bien" automático (v2)
  [ ] Check-in programado (v2)
  [ ] ETA compartido (v2)
  [ ] Historial de rutas privado (v2)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PARA PUBLICAR EN PLAY STORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. npm install -g eas-cli
  2. eas login
  3. eas init  → genera el projectId real para app.json
  4. En Firebase Console → Cloud Messaging → copiar Server Key
  5. En expo.dev → Credentials → agregar FCM Server Key
  6. eas build --platform android --profile production
  7. Subir el .aab generado a Google Play Console


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  USUARIOS DE PRUEBA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Fer  → UUID: 2fdaf5af-83de-476f-bce4-76b916197484
  Jose → UUID: 906cf5d3-8f7a-49b0-b579-1370a9d318cd


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  NOTAS IMPORTANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  • local.properties se elimina con cada prebuild → recrear siempre
  • hermesEnabled=true debe estar en gradle.properties
  • La API key de Google Maps está en AndroidManifest.xml
  • El token FCM de Supabase push NO es el mismo que el de Firebase
  • Los imports usan rutas RELATIVAS (no @/)
  • OTP es de 8 dígitos (configuración de Supabase)
  • El filtro de Kalman usa Q=3 m/s (ajustable en kalman.ts)
  • bypassDnd=true solo en el canal SOS (emergencias reales)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Desarrollado con Claude (Anthropic) · Mayo 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
