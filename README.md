# Twitter Clone — Frontend (Cliente React/TypeScript)

> **📢 Aviso para Evaluadores (The Flock):** Este repositorio forma parte de un sistema distribuido y contiene exclusivamente el cliente React. Para acceder al **Runbook Principal**, las justificaciones de diseño arquitectónico, el seed data y los comandos de orquestación unificada con Docker, por favor diríjase al repositorio orquestador: [https://github.com/Gonzalo-Ranieri/TwitterClone-Backend](https://github.com/Gonzalo-Ranieri/TwitterClone-Backend).

---

## Ejecución Aislada del Cliente (Entorno de Desarrollo)

Los siguientes pasos permiten levantar el cliente React de forma autónoma, de modo que el desarrollador pueda trabajar sobre la interfaz de usuario sin necesidad de levantar el ecosistema Docker completo. Se asume que la API del backend ya está disponible en `http://localhost:8080`.

### Prerrequisitos

- **Node.js**: Versión mínima 20.x y gestor de paquetes `npm`.
- La **API del backend** debe estar en ejecución y ser accesible (por defecto en `http://localhost:8080`).

---

### Paso 1 — Configuración de Variables de Entorno

Copie el archivo de plantilla de variables de entorno y edítelo si el servidor backend opera en un host o puerto distinto al predeterminado:

```bash
cp .env.example .env
```

El contenido por defecto del archivo `.env` es el siguiente:

```
VITE_API_URL=http://localhost:8080
```

---

### Paso 2 — Instalación de Dependencias

Instale todas las dependencias del proyecto mediante el gestor de paquetes `npm`:

```bash
npm install
```

---

### Paso 3 — Iniciar el Servidor de Desarrollo

Levante el servidor de desarrollo de Vite:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173).

---

## Suite de Pruebas

Para ejecutar la suite de pruebas de integración del cliente (Vitest + Testing Library), ejecute el siguiente comando desde la raíz de este directorio:

```bash
npm run test
```
