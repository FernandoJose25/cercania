# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Cercanía** — app móvil de localización familiar en tiempo real. Permite que grupos de personas (familias) compartan su ubicación GPS, reciban alertas SOS, definan geofences y gestionen la privacidad con modo invisible y recuperación social de cuenta.

## Comandos principales

Todos los comandos se ejecutan desde `app-scaffold/`:

```bash
# Desarrollo
npx expo start            # Metro bundler (Expo Go o dev client)
npm run android           # Compilar y correr en Android
npm run ios               # Compilar y correr en iOS

# Builds de producción (requiere cuenta EAS)
npm run build:android
npm run build:ios

# Calidad de código
npm run lint              # ESLint vía expo lint
npm run typecheck         # TypeScript sin emitir archivos
```

## Arquitectura

### Capas del proyecto

```
cercania/
├── app-scaffold/          # App React Native (Expo Router v3)
│   ├── app/
│   │   ├── (auth)/        # Rutas públicas: login, registro, OTP, recuperación
│   │   └── (app)/         # Rutas protegidas: mapa, grupos, ajustes
│   └── src/
│       ├── components/    # ui/, auth/, group/, map/
│       ├── hooks/         # Custom hooks de React
│       ├── services/      # Lógica de negocio sin UI
│       ├── store/         # Estado global Zustand (auth.ts implementado; tracking.ts y groups.ts pendientes)
│       └── utils/         # Validaciones y formateo sin dependencias externas
├── services/              # Servicios reutilizables (fuera de la app scaffold)
│   ├── auth.service.ts    # Registro, login, OTP, recuperación de contraseña
│   └── biometric.service.ts  # Face ID / Touch ID vía expo-local-authentication
├── utils/                 # Utilidades compartidas
│   ├── validation.ts      # Email, contraseña (score progresivo), OTP, nombre
│   └── format.ts
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql   # Esquema completo + RLS + triggers
        └── 002_rpc_functions.sql    # Funciones SECURITY DEFINER expuestas vía .rpc()
```

### Backend: Supabase

- **Auth**: email + contraseña con OTP de 6 dígitos para verificación (no magic links). El template de email en Supabase debe enviar el token numérico, no un link.
- **Sesión persistente**: controlada por `keepSession` en el login. `true` → tokens en Keychain/EncryptedSharedPrefs (expo-secure-store, 30 días). `false` → solo en memoria.
- **Realtime**: habilitado en `locations`, `invisible_mode`, `sos_alerts`, `geofence_events`, `recovery_requests`, `recovery_approvals`.
- **RPC functions** (todas `SECURITY DEFINER`):
  - `create_group_with_invite` — crea grupo y código inicial de invitación
  - `join_group_with_code` — une al usuario a un grupo con código de 6 chars
  - `toggle_invisible_mode` — activa/desactiva visibilidad del usuario
  - `update_location` — endpoint principal del tracker (upsert + historial)
  - `check_geofence_crossings` — detecta entrada/salida en geofences del usuario
  - `start_recovery_request` — inicia recuperación social sin estar autenticado
  - `approve_recovery` — contacto de confianza aprueba recuperación (requiere biometría)
  - `panic_cancel_recovery` — usuario legítimo cancela intento y activa pánico (bloquea 30 días)
  - `get_group_live` — snapshot completo del grupo para pantalla del mapa

### RLS crítico

- `locations` oculta la posición si el usuario tiene una fila en `invisible_mode`.
- `recovery_requests` no permite INSERT directo desde el cliente (solo vía RPC `start_recovery_request`).
- `users_share_group(a, b)` es la función pivot para la mayoría de políticas de lectura cruzada.

### Estado global (Zustand)

- `src/store/auth.ts` — sesión de usuario (implementado)
- `src/store/tracking.ts` — estado del rastreador activo/pausado (pendiente)
- `src/store/groups.ts` — caché de grupos (pendiente)

### Variables de entorno

Configuradas en `app-scaffold/.env` (copiar desde `.env.example`):

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anon pública |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Token público Mapbox (empieza con `pk.`) |
| `MAPBOX_DOWNLOAD_TOKEN` | Token privado para descargar SDK Mapbox (solo build nativo) |
| `EXPO_PUBLIC_TRACKING_INTERVAL_MS` | Intervalo del tracker (default: 600000 ms = 10 min) |
| `EXPO_PUBLIC_TRACKING_DISTANCE_M` | Distancia mínima para emitir actualización (default: 50 m) |

### Decisiones de diseño relevantes

- El cliente Supabase se reconstruye (`rebuildSupabase()`) al hacer login porque el modo de almacenamiento del token debe fijarse antes de crear el cliente.
- `authenticateStrict()` deshabilita el fallback al PIN del dispositivo; úsalo para aprobación de recuperación, no para el biometric gate de apertura de app.
- Los códigos de invitación son 6 caracteres alfanuméricos sin caracteres ambiguos (sin `0`, `O`, `I`, `1`).
- La limpieza de datos históricos corre vía `pg_cron` a las 3:00 AM UTC con `cleanup_old_data()`. Activar desde Dashboard > Database > Extensions > pg_cron.
