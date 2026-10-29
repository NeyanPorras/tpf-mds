# Distribuidora de bebidas: TP final de Metodología de Sistemas II

Aplicación web para una distribuidora de bebidas: stock de productos, clientes, pedidos con confirmación transaccional y reportes. Stack: MySQL 8, FastAPI y React.

**Entrega:** 10 de noviembre de 2026.

## Documentación

| Documento | Para qué |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo trabajamos con Git: ramas, commits, PR y reuniones. **Leer primero.** |
| [docs/contrato-api.md](docs/contrato-api.md) | Endpoints, JSON y errores. Lo que acuerdan backend y frontend. |
| [docs/modelo-er.md](docs/modelo-er.md) | Tablas, relaciones, restricciones y el procedimiento almacenado. |
| [docs/decisiones.md](docs/decisiones.md) | Qué decidimos y por qué. |
| Tablero de tareas | https://claude.ai/artifact/8tsc2aeQHQmREaaMBuRK7E |

## Cómo levantar el proyecto

> Esta sección se completa a medida que cada parte esté lista (tareas D1, B1 y F1).

### 1. Base de datos (Docker)

Requisito: Docker Desktop abierto.

```bash
docker compose up -d
```

La primera vez, MySQL ejecuta solo todos los `.sql` de `database/` en orden alfabético (esquema, datos de prueba, procedimientos). Tarda unos 30 segundos.

| Dato | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `3307` (no choca con un MySQL instalado en la máquina) |
| Usuario | `root` |
| Contraseña | `root` |
| Base | `distribuidora` |

**Recrear la base desde cero** (después de cambiar un `.sql`, o si se rompió algo):

```bash
docker compose down -v
docker compose up -d
```

**Abrir la consola de MySQL:**

```bash
docker exec -it tpf-mds-db mysql -uroot -proot distribuidora
```

**Correr un script a mano** (funciona en PowerShell y en Git Bash):

```bash
Get-Content database/tests/01_schema_checks.sql | docker exec -i tpf-mds-db mysql -uroot -proot --force distribuidora
```

En Git Bash también se puede usar `<` en lugar de `Get-Content … |`. En PowerShell, `<` no funciona.

Para conectarse con MySQL Workbench o DBeaver, usar los datos de la tabla de arriba.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Documentación interactiva: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173

## Usuarios de prueba

Se definen en `database/02_seed.sql` (uno por rol: ADMIN, VENDEDOR y DEPOSITO).

## Integrantes

| Rol | Nombre |
|---|---|
| P1 · Base de datos y reportes | |
| P2 · Backend principal | |
| P3 · Autenticación y pedidos | |
| P4 · Frontend | |
