# Cómo trabajamos en este repo

Un solo repositorio en GitHub. Cada uno programa por su cuenta en una rama, y el código entra a `main` solo por Pull Request (PR) revisado por otro integrante. En las reuniones no programamos: revisamos los PR abiertos y destrabamos problemas.

## 1. Preparar la máquina (una sola vez)

1. Instalar Git, Python 3.12, Node 20 LTS y MySQL 8.
2. Clonar el repo:
   ```bash
   git clone https://github.com/<organizacion>/tpf-mds.git
   cd tpf-mds
   ```
3. Configurar tu nombre y email (los mismos de GitHub):
   ```bash
   git config user.name "Tu Nombre"
   git config user.email "tu@email.com"
   ```
4. Seguir el README para levantar base, backend y frontend.

## 2. Reglas de oro

1. **Nadie hace push a `main`.** Está protegida: solo entra código por PR aprobado.
2. **Una rama por tarea del tablero.** Si la tarea es grande, varios PR chicos son mejores que uno enorme.
3. **El contrato manda.** Si necesitás cambiar un endpoint o una tabla, primero abrí un PR que modifique `docs/contrato-api.md` o `docs/modelo-er.md` y avisá en el grupo.
4. **Nunca subas secretos.** El `.env` está en `.gitignore`; se comparte `.env.example` con valores de ejemplo.
5. **Si te trabás más de 1 hora, avisá.** No esperes a la reunión.

## 3. El ciclo de una tarea

```bash
# 1. Partir siempre de main actualizado
git switch main
git pull

# 2. Crear la rama con el ID de la tarea
git switch -c feat/B3-crud-productos

# 3. Trabajar y commitear seguido
git add backend/app/routers/productos.py
git commit -m "feat(productos): add list and create endpoints"

# 4. Antes de subir, traer lo nuevo de main y resolver conflictos en tu rama
git fetch origin
git rebase origin/main

# 5. Subir la rama
git push -u origin feat/B3-crud-productos
```

6. En GitHub, abrir el PR hacia `main` usando la plantilla.
7. Marcar la tarea **En curso** en el tablero al empezar y **Hecha** cuando el PR se integra.

### Nombres de ramas

`<tipo>/<ID-tarea>-<descripcion-corta>`

| Tipo | Para qué | Ejemplo |
|---|---|---|
| `feat` | Funcionalidad nueva | `feat/B5-confirmar-pedido` |
| `fix` | Corrección de un error | `fix/F4-validacion-cuit` |
| `docs` | Documentación o contrato | `docs/T0-contrato-api` |
| `db` | Scripts SQL | `db/D3-sp-confirmar-pedido` |
| `chore` | Configuración, dependencias | `chore/B1-config-env` |

### Mensajes de commit

Formato *Conventional Commits*, en inglés, en presente:

```
<tipo>(<área>): <qué hace>

feat(auth): add JWT login endpoint
fix(pedidos): return 409 when stock is insufficient
docs(api): add reportes endpoints to contract
```

Un commit = un cambio con sentido. Nada de `"cambios"` ni `"arreglos varios"`.

## 4. Pull Requests

**Quién revisa:** la persona que más depende de tu código.

| Si el PR toca… | Revisa |
|---|---|
| `database/` | P2 o P3 (los que la consumen) |
| `backend/` | P4 (consume la API) o el otro backend |
| `frontend/` | P3 (también hace pantallas) |
| `docs/` | Todos dan el OK |

**El autor, antes de pedir revisión:**
- El código corre en su máquina y cumple el "Terminada cuando…" de la tarea.
- No quedan `print`, `console.log` ni código comentado.
- El PR explica qué hace y cómo probarlo.

**El revisor:**
- Revisa en menos de 24 horas.
- Comenta el código, no a la persona: "esto puede fallar si…", no "esto está mal".
- Aprueba, o pide cambios con un motivo concreto.
- Las dudas que no se resuelven por comentarios se anotan para la reunión.

**Integración:** con 1 aprobación, el autor integra con **Squash and merge** y borra la rama.

## 5. Conflictos

Los resuelve **el dueño de la rama**, en su rama, con `git rebase origin/main`. Si el conflicto es con código de otro y no está claro qué versión vale, se llama a esa persona. Nunca uses `git push --force` sobre `main`; sobre tu propia rama, solo `git push --force-with-lease` después de un rebase.

## 6. Reuniones

Dos o tres por semana, 45 minutos como máximo.

1. **Tablero (5 min):** qué se terminó, qué está trabado.
2. **PR abiertos (30 min):** el autor muestra su PR en pantalla, se discuten los comentarios pendientes y se decide.
3. **Próximos pasos (10 min):** quién toma qué tarea de las "Listas para empezar".

Las decisiones que cambian el diseño se anotan en `docs/decisiones.md` con fecha y motivo.

## 7. Estructura del repo

```
tpf-mds/
├── database/      Scripts SQL: esquema, datos de prueba, procedimiento, consultas
├── backend/       API en FastAPI, organizada en capas
├── frontend/      Aplicación React (Vite)
└── docs/          Contrato de API, modelo E/R, decisiones
```

### Capas del backend

```
backend/app/
├── routers/       Reciben la petición HTTP y devuelven la respuesta. Sin SQL ni lógica.
├── services/      Reglas de negocio. Llaman a los repositorios.
├── repositories/  Único lugar con SQL. Una clase por tabla o agregado.
├── schemas/       Modelos Pydantic de entrada y salida (validación del servidor).
└── core/          Configuración, conexión a la base, seguridad JWT, manejo de errores.
```

Flujo: `router → service → repository → MySQL`. Un router nunca llama a un repositorio directamente.
