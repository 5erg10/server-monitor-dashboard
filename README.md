# Server Monitor Dashboard - 

Dashboard web en tiempo real para monitorizar el estado de un servidor Linux: CPU, memoria, disco, red, contenedores Docker, logs del sistema y alertas configurables. Autenticación protegida por Google OAuth2 con lista blanca de emails.

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, React Router |
| Backend | Node.js, Express, WebSockets (`ws`) |
| Base de datos | SQLite (`better-sqlite3`) |
| Métricas | `systeminformation`, `dockerode` |
| Auth | Google OAuth2 (`passport`), JWT |
| Seguridad | `helmet`, `express-rate-limit`, CORS |
| Deploy | Docker (multi-stage build) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │Dashboard │  │ Docker   │  │  Logs    │  │   Alerts     │   │
│  │  /       │  │ /docker  │  │  /logs   │  │   /alerts    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│         │              │           │               │            │
│         └──────────────┴───────────┴───────────────┘           │
│                              │                                  │
│                   React + React Router                          │
│                    Tailwind + Recharts                          │
└──────────────────────────────┼──────────────────────────────────┘
                               │
              HTTP/REST  ──────┤──────  WebSocket (ws://)
              :3500/api        │        :3500  (métricas live)
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                         SERVER (Express)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   API Routes                            │   │
│  │  /api/auth   /api/metrics   /api/docker                 │   │
│  │  /api/logs   /api/alerts    /api/health                 │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────┐  ┌────┴────────────┐  ┌────────────────┐    │
│  │ Auth / JWT   │  │ Metrics         │  │ WS Server      │    │
│  │ Google OAuth │  │ Collector       │  │ push cada 3s   │    │
│  │ Passport     │  │ (cron interno)  │  └────────────────┘    │
│  └──────────────┘  └────┬────────────┘                         │
│                         │                                       │
│  ┌──────────────────────┴──────────────────────────────────┐   │
│  │                   Collectors                            │   │
│  │   systeminformation          dockerode                  │   │
│  │   (CPU / RAM / disco / red)  (contenedores Docker)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               SQLite  (better-sqlite3)                  │   │
│  │        métricas históricas · logs · alertas             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │         HOST SYSTEM         │
                │  /proc · /sys · Docker API  │
                └─────────────────────────────┘
```

---

## Requisitos previos

- **Node.js** >= 20
- **npm** >= 9
- (Opcional) **Docker** para despliegue en producción o monitorización de contenedores

---

## Configuración

Copia el fichero de ejemplo y rellena los valores:

```bash
cp .env.example .env
```

Variables clave en `.env`:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (defecto `3500`) |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mín. 32 chars) |
| `SESSION_SECRET` | Secreto de sesión Express |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth2 |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth2 |
| `GOOGLE_CALLBACK_URL` | URL de callback OAuth (ej. `http://localhost:3500/api/auth/google/callback`) |
| `ALLOWED_EMAILS` | Emails autorizados separados por coma |
| `COLLECTOR_INTERVAL` | Intervalo de recogida de métricas en ms (defecto `3000`) |
| `DB_PATH` | Ruta del fichero SQLite (defecto `/app/data/dashboard.db`) |

> Para crear credenciales OAuth visita [console.cloud.google.com](https://console.cloud.google.com/).

---

## Arrancar en desarrollo

```bash
# 1. Instalar dependencias (raíz + workspaces)
npm install

# 2. Levantar servidor y cliente en paralelo
npm run dev
```

- API + WebSocket: `http://localhost:3500`
- Frontend (Vite HMR): `http://localhost:5173`

---

## Despliegue en producción

### Con Node.js directamente

```bash
# Compilar el frontend
npm run build

# Arrancar el servidor (sirve el build estático de /public)
npm start
```

### Con Docker

```bash
# Construir la imagen
docker build -t server-monitor-dashboard .

# Ejecutar el contenedor
docker run -d \
  --name monitor \
  -p 3500:3500 \
  -v monitor_data:/app/data \
  --env-file .env \
  server-monitor-dashboard
```

La imagen usa un build multi-stage: compila el cliente con Node 20 Alpine y genera una imagen de producción mínima que sirve el frontend estático desde el mismo proceso Express.

---

## Comandos principales

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias de todos los workspaces |
| `npm run dev` | Levanta servidor y cliente en modo desarrollo (con hot-reload) |
| `npm run build` | Compila el frontend para producción |
| `npm start` | Arranca el servidor en modo producción |
| `docker build -t monitor .` | Construye la imagen Docker |

### Workspaces individuales

```bash
# Solo el servidor
npm run dev --workspace=server

# Solo el cliente
npm run dev --workspace=client
```

---

## Estructura del proyecto

```
server-monitor-dashboard/
├── client/                  # Frontend React (Vite)
│   ├── src/
│   │   ├── pages/           # Dashboard, Docker, Logs, Alerts, Login
│   │   ├── components/      # Componentes UI y layout
│   │   └── hooks/           # useAuth y otros custom hooks
│   └── vite.config.js
├── server/                  # Backend Express
│   └── src/
│       ├── api/routes/      # alerts, auth, docker, logs, metrics
│       ├── auth/            # Passport + Google OAuth2
│       ├── collector/       # systeminformation + dockerode
│       ├── db/              # Inicialización SQLite
│       ├── middleware/      # requireAuth
│       ├── ws/              # WebSocket server (push de métricas)
│       └── app.js
├── Dockerfile               # Multi-stage build
├── package.json             # Monorepo (npm workspaces)
└── .env.example
```

---

## Flujo de autenticación

1. El usuario accede a `/login` y pulsa "Continuar con Google".
2. El servidor redirige a Google OAuth2 (`/api/auth/google`).
3. Google devuelve el perfil al callback (`/api/auth/google/callback`).
4. El servidor valida que el email esté en `ALLOWED_EMAILS`.
5. Se genera un JWT que se envía como cookie `httpOnly`; el cliente queda autenticado.
6. Todas las rutas `/api/*` (excepto `/api/health` y `/api/auth`) requieren el JWT.
