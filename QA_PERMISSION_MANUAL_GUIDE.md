# Guía de Pruebas Manuales de Permisos — Brigada
## Manual Testing Step-by-Step

> **Audiencia:** Tester manual. No se requiere conocimiento de código.  
> **Prerequisito:** `seed_qa_permissions.py` ejecutado exitosamente (13 roles, 18 usuarios, 5 grupos).  
> **Última actualización:** 2026-04-16  
> **Sistemas:** Web CMS (`http://localhost:3100`) · Backend API (`http://localhost:8000`) · Mobile App (dispositivo/emulador)

---

## Cómo navegar esta guía

Cada escenario tiene tres secciones claramente marcadas:

- 🖥️ **CMS** — pasos en el navegador en `http://localhost:3100`
- 📱 **Mobile** — pasos en la app React Native / Expo
- 🔌 **API** — comandos curl directos contra `http://localhost:8000` (opcional, para profundizar)

Si solo pruebas la interfaz, puedes saltar la sección 🔌 API.

---

## Datos de acceso — Referencia rápida

| # | Email | Contraseña | Descripción |
|---|-------|-----------|-------------|
| SCEN-01 | `qa.full.admin@qa.brigada.com` | `QABrigada2026!` | Admin con todos los permisos (sin `is_system`) |
| SCEN-02 | `qa.survey.creator@qa.brigada.com` | `QABrigada2026!` | Puede crear encuestas, no publicar |
| SCEN-03 | `qa.survey.publisher@qa.brigada.com` | `QABrigada2026!` | Puede publicar, no crear ni editar |
| SCEN-04 | `qa.auditor@qa.brigada.com` | `QABrigada2026!` | Solo lectura en todo |
| SCEN-05 | `qa.brig.mgr@qa.brigada.com` | `QABrigada2026!` | Gestiona brigadistas, no encargados |
| SCEN-06 | `qa.scoped.enc@qa.brigada.com` | `QABrigada2026!` | Ve solo 2 encuestas específicas |
| SCEN-07 | `qa.user.creator@qa.brigada.com` | `QABrigada2026!` | Crea usuarios solo de tipo brigadista |
| SCEN-08 | `qa.user.editor@qa.brigada.com` | `QABrigada2026!` | Edita solo brigadistas (ve a todos) |
| SCEN-09 | `qa.no.cms@qa.brigada.com` | `QABrigada2026!` | Sin permiso `access_cms` — debe bloquearse |
| SCEN-10 | `qa.resp.only@qa.brigada.com` | `QABrigada2026!` | Ve respuestas, no encuestas |
| SCEN-11 | `qa.zero.perms@qa.brigada.com` | `QABrigada2026!` | Permisos vacíos — debe bloquearse |
| SCEN-12 | `qa.wildcard.mgr@qa.brigada.com` | `QABrigada2026!` | Targets `["*"]` — no debe alcanzar admin |
| SCEN-13 | `qa.inactive.role@qa.brigada.com` | `QABrigada2026!` | Rol desactivado — debe bloquearse |
| SCEN-14 | `qa.inactive.user@qa.brigada.com` | `QABrigada2026!` | Usuario desactivado — debe bloquearse |
| SCEN-15A | `qa.brigadista.alpha@qa.brigada.com` | `QABrigada2026!` | Brigadista Alpha |
| SCEN-15B | `qa.brigadista.beta@qa.brigada.com` | `QABrigada2026!` | Brigadista Beta |
| SCEN-16A | `qa.encargado.alpha@qa.brigada.com` | `QABrigada2026!` | Encargado del Grupo Alpha |
| SCEN-16B | `qa.encargado.beta@qa.brigada.com` | `QABrigada2026!` | Encargado del Grupo Beta |
| ADMIN | `admin@brigada.com` | `admin123` | Admin del sistema (para setup y verificación) |

---

## Cómo cerrar sesión entre escenarios

**CMS:** Clic en el avatar / nombre de usuario en la esquina superior derecha → seleccionar "Cerrar sesión".  
**Mobile:** Tab "Perfil" (ícono de persona, último tab) → botón "Cerrar sesión" al fondo de la pantalla.

---

## SCEN-01 — Admin Completo sin bypass de sistema

**Qué se valida:** El usuario `qa_full_admin` tiene los 44 permisos completos pero `is_system=False`. Debe poder hacer todo en el CMS sin restricciones, sin depender del bypass de super-admin del sistema.

---

### 🖥️ CMS — SCEN-01

**Paso 1 — Iniciar sesión**
1. Abre `http://localhost:3100` en el navegador.
2. En el campo **Correo electrónico** escribe: `qa.full.admin@qa.brigada.com`
3. En el campo **Contraseña** escribe: `QABrigada2026!`
4. Haz clic en **INICIAR SESIÓN**.

✅ **Debes ver:** El dashboard principal carga. En la barra lateral izquierda aparecen TODOS los módulos:
- Sección **Principal**: Dashboard, Encuestas, Grupos y Asignaciones, Gestiones, Zonas y Áreas
- Sección **Usuarios**: Usuarios, Invitaciones, Roles
- Sección **Análisis** (estadísticas, reportes)

❌ **Falla si:** El sidebar tiene módulos ocultos o aparece una página de "Acceso denegado".

---

**Paso 2 — Verificar módulo Encuestas**
1. En el sidebar, haz clic en **Encuestas**.
2. La URL debe cambiar a `/dashboard/surveys`.

✅ **Debes ver:**
- Lista de encuestas existentes.
- Botón **+ Nueva Encuesta** (o similar) visible en la parte superior derecha.
- Cada encuesta en la lista tiene botones de acción: editar (lápiz), opciones de menú.

---

**Paso 3 — Crear una encuesta de prueba**
1. En la página de Encuestas, haz clic en **+ Nueva Encuesta**.
2. Se abre un modal o formulario. Escribe en el campo de nombre/título: `SCEN01 Prueba Admin`.
3. Selecciona tipo: **Normal** (o el que esté disponible).
4. Haz clic en **Crear** o **Guardar**.

✅ **Debes ver:** La encuesta `SCEN01 Prueba Admin` aparece en la lista con estado `Borrador`.

❌ **Falla si:** El botón "Nueva Encuesta" no aparece, o el formulario de creación retorna un error de permisos.

---

**Paso 4 — Verificar módulo Usuarios**
1. En el sidebar, haz clic en **Usuarios**.
2. URL: `/dashboard/users`

✅ **Debes ver:**
- Tabla completa de usuarios del sistema.
- Botón **Crear Usuario** (ícono de persona con +) visible.
- Cada fila tiene íconos de acción: lápiz (editar), enchufe (activar/desactivar), papelera (eliminar).

---

**Paso 5 — Verificar módulo Roles**
1. En el sidebar, haz clic en **Roles**.
2. URL: `/dashboard/roles`

✅ **Debes ver:** Lista de roles del sistema con opción de crear/editar roles.

---

**Paso 6 — Limpieza**
1. Vuelve a **Encuestas**.
2. Encuentra `SCEN01 Prueba Admin` en la lista.
3. Haz clic en las opciones de la encuesta (ícono de tres puntos o similar) → **Eliminar**.
4. Confirma la eliminación en el diálogo que aparece.

---

### 🔌 API — SCEN-01 (opcional)

```bash
# 1. Obtener token
curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.full.admin@qa.brigada.com&password=QABrigada2026!" \
  | python3 -m json.tool | grep access_token
# → Copia el valor del token

TOKEN="<pega_el_token_aquí>"

# 2. Listar encuestas
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/admin/surveys/metadata?limit=5 | python3 -m json.tool

# 3. Listar usuarios
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/users?limit=5 | python3 -m json.tool

# Esperado: HTTP 200 en todas las peticiones
```

---

## SCEN-02 — Editor de Encuestas bloqueado en Publicar

**Qué se valida:** `qa.survey.creator` puede CREAR y EDITAR encuestas, pero el botón **Publicar** debe estar oculto o deshabilitado porque le falta el permiso `publish_survey`.

---

### 🖥️ CMS — SCEN-02

**Paso 1 — Iniciar sesión**
1. Cierra cualquier sesión activa (ver "Cómo cerrar sesión").
2. Abre `http://localhost:3100`.
3. Correo: `qa.survey.creator@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga. En el sidebar aparece **Encuestas** (tiene `view_surveys`). Puede que NO aparezcan los módulos de Usuarios, Roles si no tiene esos permisos.

---

**Paso 2 — Crear una encuesta**
1. Clic en **Encuestas** en el sidebar.
2. Clic en **+ Nueva Encuesta**.
3. Nombre: `SCEN02 Encuesta Creador`. Tipo: **Normal**.
4. Clic en **Crear**.

✅ **Debes ver:** La encuesta se crea correctamente y aparece en la lista con estado `Borrador`.

---

**Paso 3 — Abrir la encuesta y buscar el botón Publicar**
1. Haz clic en la encuesta `SCEN02 Encuesta Creador` para abrir su detalle.
2. Revisa todos los botones visibles en la parte superior del detalle.

✅ **Debes ver:** Botones de **Editar**, **Guardar** o similares para modificar contenido. El botón **Publicar** NO debe aparecer o debe estar en estado deshabilitado con mensaje de "Sin permisos".

❌ **Falla si (BUG UX):** El botón **Publicar** aparece activo y al hacer clic no muestra error o muestra un error técnico genérico sin explicación.

---

**Paso 4 — Editar la encuesta (debe funcionar)**
1. Desde el detalle de la encuesta, edita el título cambiándolo a `SCEN02 Encuesta Creador — Editada`.
2. Guarda los cambios.

✅ **Debes ver:** Los cambios se guardan y el título se actualiza en la vista.

---

**Paso 5 — Limpieza**
1. Vuelve al listado de Encuestas.
2. Elimina `SCEN02 Encuesta Creador — Editada`.

---

### 🔌 API — SCEN-02 (opcional)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.survey.creator@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Crear encuesta → debe ser 201
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"SCEN02 API Test","survey_type":"normal"}' \
  http://localhost:8000/admin/surveys
# Esperado: 201

# Obtener version_id de la encuesta recién creada
SURVEY_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/admin/surveys/metadata?limit=5" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) else d.get('items',d.get('data',[]))[0]['id'])")

# Intentar publicar → debe ser 403
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/admin/surveys/$SURVEY_ID/versions/1/publish
# Esperado: 403
```

---

## SCEN-03 — Publicador sin Creador

**Qué se valida:** `qa.survey.publisher` puede PUBLICAR encuestas pero NO puede crear ni editar. El botón **Nueva Encuesta** no debe aparecer; el formulario de detalle debe estar en solo lectura.

---

### 🖥️ CMS — SCEN-03

**Paso 1 — Iniciar sesión**
1. Correo: `qa.survey.publisher@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga. Sidebar muestra **Encuestas** (tiene `view_surveys`). El resto de módulos dependiendo de sus permisos.

---

**Paso 2 — Verificar que NO puede crear**
1. Clic en **Encuestas** en el sidebar.
2. Observa la parte superior de la página.

✅ **Debes ver:** El botón **+ Nueva Encuesta** NO aparece en ningún lugar de la pantalla.

❌ **Falla si:** El botón existe. Aunque falle al hacer clic, la presencia del botón es un BUG UX.

---

**Paso 3 — Abrir una encuesta existente en estado Borrador**
1. En la lista de encuestas, busca una encuesta en estado **Borrador** (Draft).
2. Haz clic para abrir su detalle.
3. Revisa si hay campos de formulario editables (título, descripción, preguntas).

✅ **Debes ver:** La encuesta se muestra en **modo solo lectura**. Los campos de texto no son editables (aparecen como texto plano, no como inputs activos). No hay botón de **Guardar cambios**.

✅ **Debes ver:** Botón **Publicar** visible y activo (tiene `publish_survey`).

---

**Paso 4 — Publicar la encuesta**
1. Haz clic en **Publicar**.
2. Aparece un diálogo de confirmación. Confirma.

✅ **Debes ver:** La encuesta cambia de estado **Borrador → Publicada**. Aparece un mensaje de éxito.

❌ **Falla si:** El botón de publicar retorna un error 403 desde la API.

---

### 🔌 API — SCEN-03 (opcional)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.survey.publisher@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Intentar crear → debe ser 403
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"SCEN03 No debe crearse","survey_type":"normal"}' \
  http://localhost:8000/admin/surveys
# Esperado: 403

# Listar encuestas → debe ser 200
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/admin/surveys/metadata?limit=5
# Esperado: 200
```

---

## SCEN-04 — Auditor Solo Lectura

**Qué se valida:** `qa.auditor` tiene todos los permisos `view_*` pero cero permisos de escritura. En toda la UI deben desaparecer botones de crear, editar y eliminar. Ninguna acción de escritura debe prosperar.

---

### 🖥️ CMS — SCEN-04

**Paso 1 — Iniciar sesión**
1. Correo: `qa.auditor@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga con módulos de lectura visibles (Encuestas, Usuarios, etc.).

---

**Paso 2 — Verificar Encuestas — solo lectura**
1. Clic en **Encuestas**.
2. Revisa la página completa.

✅ **Debes ver:**
- Lista de encuestas visible.
- **NO** aparece el botón **+ Nueva Encuesta**.
- Las encuestas en la lista **NO** tienen botones de eliminar o editar habilitados (pueden no aparecer, o aparecer pero deshabilitados con tooltip "Sin permisos").

---

**Paso 3 — Verificar Usuarios — solo lectura**
1. Clic en **Usuarios**.
2. Revisa la tabla y los controles.

✅ **Debes ver:**
- Tabla completa de usuarios (tiene `view_all_users`).
- **NO** aparece el botón **Crear Usuario**.
- Las filas de la tabla **NO** tienen botones de lápiz (editar) activos ni ícono de papelera activo.

---

**Paso 4 — Verificar Grupos y Asignaciones — solo lectura**
1. Clic en **Grupos y Asignaciones**.

✅ **Debes ver:** Lista de grupos visible. **NO** aparece botón de crear nuevo grupo. **NO** hay opciones de editar/eliminar grupos en la lista.

---

**Paso 5 — Intentar crear un usuario (forzado)**
1. Escribe directamente en el navegador: `http://localhost:3100/dashboard/users`
2. Intenta encontrar algún botón de "Crear usuario". Si no aparece: ✅ correcto.
3. Si aparece, haz clic. Llena el formulario con datos ficticios y envía.

❌ **Falla si:** El usuario se crea exitosamente (la API retornó 200/201 desde la UI).

---

### 🔌 API — SCEN-04 (opcional)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.auditor@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Lecturas deben ser 200
curl -s -o /dev/null -w "surveys: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/admin/surveys/metadata?limit=5

curl -s -o /dev/null -w "users: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" http://localhost:8000/users?limit=5

# Escrituras deben ser 403
curl -s -o /dev/null -w "create survey: %{http_code}\n" \
  -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"SCEN04 No debe crearse"}' http://localhost:8000/admin/surveys

curl -s -o /dev/null -w "create user: %{http_code}\n" \
  -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"tmp@qa.brigada.com","password":"x","full_name":"Tmp","custom_role_id":1}' \
  http://localhost:8000/users
# Esperado: 403 en ambas escrituras
```

---

## SCEN-05 — Brigadista Manager (gestiona brigadistas, no encargados)

**Qué se valida:** `qa.brig.mgr` tiene el permiso `manage_brigadista_assignments` (puede asignar brigadistas a grupos) pero NO `manage_assignments` (no puede asignar encargados). En la UI el flujo de "crear grupo con encargado" debe fallar.

---

### 🖥️ CMS — SCEN-05

**Paso 1 — Iniciar sesión**
1. Correo: `qa.brig.mgr@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga. En el sidebar aparece **Grupos y Asignaciones** (tiene `manage_brigadista_assignments`).

---

**Paso 2 — Crear un grupo con target BRIGADISTA (debe funcionar)**
1. Clic en **Grupos y Asignaciones**.
2. Clic en **+ Nuevo grupo** o botón equivalente para crear un grupo.
3. Completa el formulario:
   - Nombre del grupo: `SCEN05 Test Brigadista`
   - Tipo de asignación / target: selecciona **Brigadista**
   - Agrega la encuesta: busca y selecciona una encuesta QA publicada
   - Agrega el usuario: busca y selecciona `QA Brigadista Alpha`
4. Haz clic en **Crear** o **Guardar**.

✅ **Debes ver:** El grupo se crea y aparece en la lista.

---

**Paso 3 — Intentar crear un grupo con target ENCARGADO (debe bloquearse)**
1. Clic en **+ Nuevo grupo**.
2. En el campo de tipo de asignación / target: selecciona **Encargado**.
3. Completa el resto del formulario con datos de encargado.
4. Haz clic en **Crear**.

✅ **Debes ver:** El sistema retorna un error de permisos (toast rojo o mensaje de error) indicando que no puede asignar encargados.

❌ **Falla si:** El grupo con target encargado se crea exitosamente (la diferencia entre `manage_brigadista_assignments` y `manage_assignments` no se verifica).

---

**Paso 4 — Limpieza**
1. Elimina el grupo `SCEN05 Test Brigadista` desde la lista de grupos.

---

## SCEN-06 — Scope restringido de encuestas (allowed_survey_ids)

**Qué se valida:** `qa.scoped.enc` solo tiene acceso a 2 encuestas específicas (las que están en `allowed_survey_ids` de su rol). La lista de encuestas en el CMS debe mostrar exactamente esas 2, y acceder a cualquier otra debe ser bloqueado.

---

### 🖥️ CMS — SCEN-06

**Preparación (con admin)**
> Antes de empezar este escenario, con la cuenta admin identifica el ID de una encuesta que NO esté en el scope de `qa.scoped.enc`:
> 1. Login como `admin@brigada.com`
> 2. Ve a Encuestas → anota el título de 2–3 encuestas que NO empiecen con "QA Scoped"
> 3. Cierra sesión

**Paso 1 — Iniciar sesión con usuario de scope restringido**
1. Correo: `qa.scoped.enc@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

---

**Paso 2 — Verificar lista de encuestas — exactamente 2**
1. Clic en **Encuestas** en el sidebar.
2. Cuenta cuántas encuestas aparecen en la lista.

✅ **Debes ver:** Exactamente **2 encuestas** (las del scope permitido). La lista no tiene paginación con más páginas.

❌ **Falla si:** La lista muestra más de 2 encuestas (el scope `allowed_survey_ids` está siendo ignorado en el listado).

---

**Paso 3 — Abrir encuesta IN-scope**
1. Haz clic en una de las 2 encuestas visibles para abrir su detalle.

✅ **Debes ver:** El detalle de la encuesta carga correctamente con sus preguntas y datos.

---

**Paso 4 — Intentar acceder a encuesta OUT-of-scope**
1. En el navegador, navega directamente a:
   `http://localhost:3100/dashboard/surveys` para ver el ID de alguna encuesta fuera del scope.
   > Si no sabes el ID, pídelo al administrador o usa el endpoint API con admin token.
2. Modifica la URL del navegador para intentar acceder: `http://localhost:3100/dashboard/surveys/999` (usa el ID de una encuesta que NO sea de las 2 visibles).

✅ **Debes ver:** La página muestra un error de acceso denegado (403/404) o redirige al listado sin cargar el detalle.

❌ **Falla si:** La encuesta fuera del scope carga normalmente (el scope no se verifica al acceder al detalle).

---

### 🔌 API — SCEN-06 (opcional)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.scoped.enc@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Lista encuestas → debe retornar exactamente 2
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/admin/surveys/metadata?limit=50" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); print(f'Total encuestas: {len(items)}')"
# Esperado: Total encuestas: 2
```

---

## SCEN-07 — Creador de Usuarios limitado a Brigadistas

**Qué se valida:** `qa.user.creator` puede crear usuarios con rol **brigadista**, pero si intenta crear un usuario con rol **encargado** o **admin**, debe recibir un error 403. Además, el selector de roles en el formulario de "Crear Usuario" debe mostrar SOLO roles de tipo brigadista.

---

### 🖥️ CMS — SCEN-07

**Paso 1 — Iniciar sesión**
1. Correo: `qa.user.creator@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

---

**Paso 2 — Abrir el formulario de Crear Usuario**
1. Clic en **Usuarios** en el sidebar.
2. Clic en **Crear Usuario** (botón con ícono de persona +).
3. Observa el campo de **Rol** / selector de roles.

✅ **Debes ver:** El selector de roles muestra SOLO roles de tipo brigadista (ej. "Brigadista", "brigadista QA"). No aparecen roles de tipo encargado, admin, ni auditor.

❌ **Falla si:** El selector muestra todos los roles del sistema incluyendo "Encargado", "Admin", "Auditor", etc.

---

**Paso 3 — Crear usuario de tipo Brigadista (debe funcionar)**
1. Completa el formulario:
   - Nombre: `SCEN07 Test Brigadista`
   - Email: `scen07.test.brig@qa.brigada.com`
   - Contraseña: `QABrigada2026!`
   - Rol: selecciona el rol **Brigadista** (o `brigadista`)
2. Haz clic en **Crear** / **Guardar**.

✅ **Debes ver:** El usuario se crea exitosamente. Aparece en la lista de usuarios con rol Brigadista.

---

**Paso 4 — Intentar crear usuario de tipo Encargado (debe bloquearse)**
1. Haz clic en **Crear Usuario** nuevamente.
2. Intenta seleccionar un rol de tipo **Encargado** en el selector.

✅ **Debes ver:** La opción de rol Encargado no aparece en el dropdown.

> Si el selector mostrara el rol encargado (BUG), continúa: selecciona Encargado, llena el formulario y envía.

❌ **Falla si:** Un usuario con rol encargado se crea exitosamente (el backend no verificó `create_user_targets`).

---

**Paso 5 — Limpieza**
1. Con la cuenta admin (`admin@brigada.com`): busca y elimina el usuario `scen07.test.brig@qa.brigada.com`.

---

## SCEN-08 — Editor de Usuarios limitado a Brigadistas

**Qué se valida:** `qa.user.editor` tiene `view_all_users` (ve a TODOS los usuarios) y `edit_user_targets=["brigadista"]` (solo puede editar brigadistas). Intentar editar un encargado o admin debe retornar 403.

---

### 🖥️ CMS — SCEN-08

**Paso 1 — Iniciar sesión**
1. Correo: `qa.user.editor@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

---

**Paso 2 — Verificar que ve a TODOS los usuarios**
1. Clic en **Usuarios**.
2. Revisa la lista.

✅ **Debes ver:** La lista completa de usuarios del sistema (brigadistas, encargados, admins). Tiene `view_all_users`.

---

**Paso 3 — Editar un usuario de tipo BRIGADISTA (debe funcionar)**
1. Busca al usuario `QA Brigadista Alpha` en la lista (o filtra por email `qa.brigadista.alpha@qa.brigada.com`).
2. Haz clic en el ícono de lápiz (editar) en su fila.
3. Cambia el nombre a `QA Brigadista Alpha [SCEN08]`.
4. Haz clic en **Guardar**.

✅ **Debes ver:** Los cambios se guardan. El nombre actualizado aparece en la lista.

---

**Paso 4 — Intentar editar un usuario de tipo ENCARGADO (debe bloquearse)**
1. Busca al usuario `QA Encargado Alpha` en la lista (`qa.encargado.alpha@qa.brigada.com`).
2. Haz clic en el ícono de lápiz (editar).
3. Intenta cambiar el nombre y guardar.

✅ **Debes ver:** Al intentar guardar, aparece un error tipo toast rojo: "Sin permisos" o "No autorizado" o similar.

❌ **Falla si:** El nombre del encargado se actualiza exitosamente (el backend no verificó `edit_user_targets`).

---

**Paso 5 — Restaurar nombre de Brigadista Alpha**
1. Edita nuevamente `QA Brigadista Alpha [SCEN08]` y restaura el nombre original: `QA Brigadista Alpha`.
2. Guarda.

---

## SCEN-09 — Usuario sin access_cms — Login bloqueado

**Qué se valida:** `qa.no.cms` tiene permisos de datos (`view_surveys`, `view_responses`) pero le falta el permiso fundamental `access_cms`. El backend rechaza el login antes de emitir el token JWT. La app CMS no debe cargar.

---

### 🖥️ CMS — SCEN-09

**Paso 1 — Intentar iniciar sesión**
1. Cierra cualquier sesión activa.
2. Abre `http://localhost:3100`.
3. Correo: `qa.no.cms@qa.brigada.com` · Contraseña: `QABrigada2026!`.
4. Haz clic en **INICIAR SESIÓN**.

✅ **Debes ver:** La pantalla de login muestra un mensaje de error claro, por ejemplo:
- "Acceso denegado"
- "Tu cuenta no tiene acceso a esta plataforma"
- "No tienes permisos para acceder al CMS"

La URL **permanece** en `/login`. No hay redirección al dashboard.

❌ **Falla si:**
- La URL cambia a `/dashboard` aunque sea brevemente.
- Aparece una pantalla en blanco sin mensaje de error.
- El dashboard carga aunque sea parcialmente.

---

**Paso 2 — Verificar en DevTools (opcional, para profundizar)**
1. Abre las DevTools del navegador (F12) → pestaña **Network**.
2. Repite el intento de login.
3. Busca la petición a `/auth/login` en el panel de red.

✅ **Debes ver:** La petición a `/auth/login` retorna **HTTP 403** (no 200).

---

### 🔌 API — SCEN-09

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8000/auth/login \
  -d "username=qa.no.cms@qa.brigada.com&password=QABrigada2026!"
# Esperado: 403
```

---

## SCEN-10 — Respuestas sin contexto de encuesta

**Qué se valida:** `qa.resp.only` tiene `view_responses` pero NO `view_surveys`. Debe poder ver el listado de respuestas y el detalle de una respuesta sin que la página crashee. El módulo **Encuestas** no debe aparecer en el sidebar.

---

### 🖥️ CMS — SCEN-10

**Paso 1 — Iniciar sesión**
1. Correo: `qa.resp.only@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga. El sidebar **NO** muestra "Encuestas" (le falta `view_surveys`). Sí debe aparecer algún módulo de respuestas o reportes.

---

**Paso 2 — Navegar a Respuestas**
1. Busca en el sidebar el módulo de **Respuestas** o **Reportes** (puede estar en la sección de Análisis).
2. Haz clic para abrirlo.
3. URL esperada: `/dashboard/responses-metadata` o similar.

✅ **Debes ver:** Lista de respuestas visible, con datos cargados correctamente. No hay error 403 ni pantalla en blanco.

---

**Paso 3 — Abrir el detalle de una respuesta**
1. Haz clic en cualquier respuesta de la lista.
2. Se abre la vista de detalle.

✅ **Debes ver:** Los datos de la respuesta se muestran completos: preguntas y sus respuestas, datos del brigadista, fecha de captura.

❌ **Falla si:** La pantalla de detalle se muestra en blanco o lanza un error porque intentó cargar datos de la encuesta (`GET /admin/surveys/{id}`) y recibió 403.

---

**Paso 4 — Verificar que NO puede acceder al módulo Encuestas**
1. Intenta navegar directamente: `http://localhost:3100/dashboard/surveys`.

✅ **Debes ver:** Redirección a un página de error, al dashboard, o a acceso denegado. La lista de encuestas **no** carga.

---

## SCEN-11 — Rol activo sin permisos (permissions=[])

**Qué se valida:** `qa.zero.perms` tiene un rol activo pero con la lista de permisos completamente vacía. El backend debe bloquear el acceso antes de emitir un token útil. Ningún endpoint debe devolver 200.

---

### 🖥️ CMS — SCEN-11

**Paso 1 — Intentar iniciar sesión**
1. Cierra cualquier sesión activa.
2. Correo: `qa.zero.perms@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Mensaje de error claro. La URL permanece en `/login`. No hay redirección al dashboard.

✅ **Extra:** No debe aparecer ningún error técnico (500 Internal Server Error) ni pantalla en blanco. El mensaje debe ser legible para el usuario.

❌ **Falla si:**
- El dashboard carga aunque sea con un sidebar vacío.
- Aparece error 500 (el backend falló al evaluar lista vacía de permisos).
- La pantalla queda en blanco sin mensaje.

---

### 🔌 API — SCEN-11

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8000/auth/login \
  -d "username=qa.zero.perms@qa.brigada.com&password=QABrigada2026!"
# Esperado: 403 (no 500)
```

---

## SCEN-12 — Escalación de Privilegios con targets comodín ["*"]

**Qué se valida (CRÍTICO):** `qa.wildcard.mgr` tiene targets `["*"]` en sus permisos de usuario (puede crear/editar/eliminar/resetear cualquier usuario). El comodín **NO debe alcanzar** usuarios marcados como `is_system=True` (el admin principal del sistema). Este es el bug de seguridad más crítico de la suite.

---

### 🖥️ CMS — SCEN-12

**Preparación — Identificar el admin principal**
> Con admin (`admin@brigada.com`):
> 1. Ve a **Usuarios**.
> 2. Identifica al usuario `admin@brigada.com` en la lista y anota su nombre completo actual (para restaurarlo si algo sale mal).
> 3. Cierra sesión.

**Paso 1 — Iniciar sesión como wildcard manager**
1. Correo: `qa.wildcard.mgr@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga. Sidebar tiene módulo **Usuarios**.

---

**Paso 2 — Ver lista de usuarios (debe funcionar)**
1. Clic en **Usuarios**.

✅ **Debes ver:** Tabla completa de todos los usuarios (tiene `view_all_users`).

---

**Paso 3 — Intentar EDITAR el admin principal (CRÍTICO)**
1. Busca al usuario `admin@brigada.com` en la lista.
2. Haz clic en el ícono de lápiz (editar) en su fila.
3. Intenta cambiar el nombre a `admin SCEN12 ESCALACION`.
4. Haz clic en **Guardar**.

✅ **CRÍTICO — Debes ver:** El sistema retorna un error de permisos: "No autorizado", "No se puede modificar este usuario" o similar. El nombre del admin **NO cambia**.

❌ **FALLA CRÍTICA DE SEGURIDAD:** Si el nombre del admin cambia a `admin SCEN12 ESCALACION`, significa que el comodín `["*"]` permite modificar usuarios del sistema. **Reportar inmediatamente como bug crítico.**

---

**Paso 4 — Intentar ELIMINAR el admin principal (CRÍTICO)**
1. En la fila del usuario `admin@brigada.com`, busca el ícono de papelera o el botón de eliminar.
2. Intenta hacer clic.

✅ **CRÍTICO — Debes ver:** El botón de eliminar está deshabilitado para el admin principal, o al intentar la acción aparece un error de permisos.

❌ **FALLA CRÍTICA DE SEGURIDAD:** Si el sistema permite proceder con la eliminación del admin principal.

---

**Paso 5 — Verificar que SÍ puede editar un usuario brigadista**
1. Busca a `QA Brigadista Alpha` en la lista.
2. Haz clic en editar → cambia el nombre a `QA Brigadista Alpha [SCEN12]` → Guardar.

✅ **Debes ver:** El cambio se aplica (el comodín sí aplica para usuarios normales).

**Limpieza:** Restaura el nombre original de `QA Brigadista Alpha`.

---

### 🔌 API — SCEN-12 (opcional pero recomendado)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.wildcard.mgr@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=admin@brigada.com&password=admin123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Obtener ID del admin principal
ADMIN_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8000/users?limit=100" \
  | python3 -c "import sys,json; users=json.load(sys.stdin); users=users if isinstance(users,list) else users.get('items',users.get('data',[])); print(next((u['id'] for u in users if u['email']=='admin@brigada.com'), 'NOT FOUND'))")

echo "Admin ID: $ADMIN_ID"

# CRÍTICO: intentar editar admin con wildcard token → DEBE ser 403
curl -s -o /dev/null -w "PATCH admin → %{http_code}\n" \
  -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"full_name":"SCEN12 ESCALACION"}' \
  http://localhost:8000/users/$ADMIN_ID
# Esperado: 403 (si retorna 200 → BUG CRÍTICO)

# CRÍTICO: intentar eliminar admin → DEBE ser 403
curl -s -o /dev/null -w "DELETE admin → %{http_code}\n" \
  -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/users/$ADMIN_ID
# Esperado: 403 (si retorna 200/204 → BUG CRÍTICO)
```

---

## SCEN-13 — Rol Inactivo con Permisos Válidos

**Qué se valida:** `qa.inactive.role` tiene un rol con todos los permisos pero ese rol tiene `is_active=False`. El login debe bloquearse. Luego se reactiva el rol (con admin) para verificar que el ciclo funciona, y se vuelve a desactivar probando que el caché de Redis (TTL 60s) invalida las sesiones activas.

---

### 🖥️ CMS — SCEN-13

**Paso 1 — Intentar login con rol inactivo**
1. Correo: `qa.inactive.role@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Error de acceso. La URL permanece en `/login`.

---

**Paso 2 — Reactivar el rol desde admin**
1. Abre una **nueva pestaña del navegador** (o en modo incógnito).
2. Login con `admin@brigada.com` / `admin123`.
3. Ve a **Roles** en el sidebar.
4. Busca el rol `qa_inactive_role`.
5. Activa el rol (botón de toggle/activar junto al nombre del rol).

✅ **Debes ver:** El estado del rol cambia a activo (toggle en verde o indicador visual de "Activo").

---

**Paso 3 — Verificar que ahora SÍ puede hacer login**
1. Vuelve a la pestaña original (o una nueva).
2. Correo: `qa.inactive.role@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Dashboard carga correctamente con los módulos del rol ahora activo.

---

**Paso 4 — Probar el TTL del caché de Redis (avanzado)**
1. Desde la pestaña del admin: desactiva el rol `qa_inactive_role` nuevamente.
2. En la sesión del usuario `qa.inactive.role` que quedó activa: intenta navegar a cualquier módulo.
3. Espera **60 segundos** (expiración del caché Redis).
4. Intenta navegar nuevamente o refresca la página.

✅ **Debes ver (después de 60s):** El CMS redirige al login o muestra un error de sesión expirada. Las peticiones a la API retornan 403.

❌ **Falla si:** La sesión del usuario con rol inactivo sigue funcionando indefinidamente después de los 60 segundos.

---

### 🔌 API — SCEN-13 (TTL testing)

```bash
# 1. Con admin, reactivar el rol qa_inactive_role
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=admin@brigada.com&password=admin123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Obtener ID del rol
ROLE_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/roles \
  | python3 -c "import sys,json; roles=json.load(sys.stdin); roles=roles if isinstance(roles,list) else roles.get('items',[]); print(next((r['id'] for r in roles if r.get('key')=='qa_inactive_role'), 'NOT FOUND'))")

echo "Role ID: $ROLE_ID"

# Activar rol
curl -s -o /dev/null -w "Activate role: %{http_code}\n" \
  -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"is_active":true}' http://localhost:8000/roles/$ROLE_ID

# 2. Obtener token del usuario ahora con rol activo
USER_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.inactive.role@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 3. Desactivar rol
curl -s -o /dev/null -w "Deactivate role: %{http_code}\n" \
  -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"is_active":false}' http://localhost:8000/roles/$ROLE_ID

# 4. Inmediatamente: el token anterior aún funciona (caché activo)
curl -s -o /dev/null -w "Surveys (immediate, cached): %{http_code}\n" \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:8000/admin/surveys/metadata?limit=5
# Puede retornar 200 (caché de 60s aún vigente)

echo "Esperando 65 segundos para expiración del caché..."
sleep 65

# 5. Después de 60s: el token debe ser rechazado
curl -s -o /dev/null -w "Surveys (after TTL): %{http_code}\n" \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:8000/admin/surveys/metadata?limit=5
# Esperado: 403
```

---

## SCEN-14 — Usuario Inactivo

**Qué se valida:** `qa.inactive.user` tiene `is_active=False`. El login debe retornar 401/403. Tokens previamente emitidos (antes de la desactivación) también deben quedar invalidados.

---

### 🖥️ CMS — SCEN-14

**Paso 1 — Intentar login**
1. Correo: `qa.inactive.user@qa.brigada.com` · Contraseña: `QABrigada2026!` → **INICIAR SESIÓN**.

✅ **Debes ver:** Mensaje de error tipo "Usuario inactivo", "Cuenta desactivada" o similar. La URL permanece en `/login`.

---

**Paso 2 — Reactivar con admin y verificar**
1. Login con admin → Ve a **Usuarios** → Busca `qa.inactive.user@qa.brigada.com`.
2. En la fila del usuario, haz clic en el ícono de **activar** (botón de enchufe o toggle).
3. Confirma la activación.
4. Cierra sesión del admin.
5. Intenta login con `qa.inactive.user@qa.brigada.com`.

✅ **Debes ver:** El login ahora funciona y carga el dashboard correctamente.

---

**Paso 3 — Probar invalidación de tokens**
1. Con el usuario activo, navega por el CMS (abre cualquier módulo).
2. En admin: desactiva nuevamente al usuario `qa.inactive.user`.
3. Vuelve a la sesión del usuario desactivado.
4. Refresca la página o navega a un módulo.

✅ **Debes ver:** El CMS redirige al login. El usuario ya no puede acceder aunque tenga una sesión abierta.

---

## SCEN-15 — Aislamiento de Datos entre Brigadistas (Mobile + API)

**Qué se valida:** Dos brigadistas comparten el mismo grupo de asignación (grupo 18 — "QA Aislamiento Compartido") con la misma encuesta. Alpha llena y envía una respuesta. Beta NO debe ver esa respuesta en ningún caso — ni en la app ni por API.

**Flujo cross-sistema:**
```
Alpha llena offline → SQLite → sync_queue pending
         → conecta red → POST /mobile/responses/batch → Backend almacena con user_id=Alpha
                                                       → Beta hace GET /mobile/responses → NO ve respuesta de Alpha
```

---

### 📱 Mobile — SCEN-15 Parte A: Alpha llena la encuesta

**Paso 1 — Abrir la app e iniciar sesión como Alpha**
1. Abre la app Brigada en el dispositivo o emulador.
2. Si hay sesión activa, ciérrala: Tab **Perfil** → **Cerrar sesión**.
3. En la pantalla de login:
   - Correo: `qa.brigadista.alpha@qa.brigada.com`
   - Contraseña: `QABrigada2026!`
4. Toca **INICIAR SESIÓN**.

✅ **Debes ver:** Pantalla de inicio del brigadista con la lista de cuestionarios asignados.

---

**Paso 2 — Activar modo avión (para probar offline)**
1. Desliza el centro de control del dispositivo.
2. Activa **Modo Avión** (desconecta de cualquier red).

---

**Paso 3 — Seleccionar la encuesta del grupo QA Aislamiento**
1. En la pantalla de cuestionarios, busca la encuesta del grupo "QA Aislamiento Compartido".
2. Toca la encuesta para abrirla.

✅ **Debes ver:** La encuesta abre correctamente aunque no haya conexión (datos cargados desde SQLite local). Aparece barra de progreso en la parte superior.

---

**Paso 4 — Llenar la encuesta pregunta por pregunta**
1. Aparece la primera pregunta. Responde con el valor que corresponda.
   > En la primera pregunta de texto libre, escribe: **RESPUESTA_ALPHA_SCEN15** (este texto único permitirá verificar aislamiento).
2. Toca **Siguiente →** para avanzar a la siguiente pregunta.
3. Continúa respondiendo todas las preguntas hasta llegar al final.
4. En la última pregunta, en lugar de "Siguiente" aparece **Enviar** o **Finalizar**.
5. Toca **Enviar**.

✅ **Debes ver:** Mensaje de confirmación: "Respuesta guardada", "Encuesta enviada" o similar. La respuesta queda en la cola de sincronización local (se enviará cuando haya red).

---

**Paso 5 — Activar red y esperar sincronización**
1. Desactiva el Modo Avión.
2. Espera en la pantalla de inicio (máximo 2 minutos — la app sincroniza automáticamente cuando detecta conectividad).
3. Observa si hay un indicador de sincronización (ícono de nube, barra de progreso, badge).

✅ **Debes ver:** El indicador de sync desaparece o muestra "Sincronizado". La respuesta ya está en el servidor.

---

**Paso 6 — Cerrar sesión de Alpha**
1. Tab **Perfil** → **Cerrar sesión**.

---

### 📱 Mobile — SCEN-15 Parte B: Beta NO ve la respuesta de Alpha

**Paso 7 — Iniciar sesión como Beta**
1. En la pantalla de login:
   - Correo: `qa.brigadista.beta@qa.brigada.com`
   - Contraseña: `QABrigada2026!`
2. Toca **INICIAR SESIÓN**.

✅ **Debes ver:** Beta ve su propia pantalla de cuestionarios.

---

**Paso 8 — Verificar que Beta NO ve la respuesta de Alpha**
1. Navega al historial de respuestas de Beta (tab de historial o ícono de historial en la encuesta).
2. Revisa todas las respuestas visibles.

✅ **CRÍTICO — Debes ver:** Ninguna respuesta contiene el texto **RESPUESTA_ALPHA_SCEN15**. Beta solo ve sus propias respuestas.

❌ **Falla si:** La respuesta de Alpha aparece en el historial de Beta (violación de aislamiento de datos).

---

### 🖥️ CMS — SCEN-15 Parte C: Admin verifica ambas respuestas

**Paso 9 — Verificar desde el CMS que la respuesta de Alpha llegó**
1. Login con `admin@brigada.com` en `http://localhost:3100`.
2. Ve a **Grupos y Asignaciones** → Busca el grupo "QA Aislamiento Compartido".
3. Accede a las respuestas del grupo.

✅ **Debes ver:** La respuesta de Alpha aparece en la lista de respuestas del grupo, con el texto "RESPUESTA_ALPHA_SCEN15" visible.

---

### 🔌 API — SCEN-15 (opcional)

```bash
# Token de Alpha
TOKEN_ALPHA=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.brigadista.alpha@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Token de Beta
TOKEN_BETA=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.brigadista.beta@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Alpha envía una respuesta
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN_ALPHA" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [{
      "client_id": "aaaaaaaa-0001-0002-0003-111111111111",
      "survey_version_id": 1,
      "answers": [{"question_id": 1, "value": "RESPUESTA_ALPHA_SCEN15_API"}],
      "submitted_at": "2026-04-16T12:00:00Z"
    }]
  }' http://localhost:8000/mobile/responses/batch)

echo "Respuesta de sync Alpha: $RESPONSE"
RESP_ID=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('results',d.get('items',[{}]))[0].get('id','NOT FOUND'))" 2>/dev/null || echo "revisar manualmente")

# Beta lista SUS respuestas → NO debe ver la de Alpha
curl -s -H "Authorization: Bearer $TOKEN_BETA" \
  "http://localhost:8000/mobile/responses?limit=20" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
alpha_found = any('ALPHA' in str(r) for r in items)
print('Beta ve respuesta de Alpha: BUG CRÍTICO' if alpha_found else 'OK: Beta no ve respuesta de Alpha')
print(f'Total respuestas de Beta: {len(items)}')
"
```

---

## SCEN-16 — Aislamiento de Scope entre Encargados (Mobile + CMS + API)

**Qué se valida:** Encargado Alpha supervisa Grupo Alpha (id=16), Encargado Beta supervisa Grupo Beta (id=17). Cada encargado debe ver **solo su propio grupo** — ni en la app ni en el CMS ni por API puede acceder al grupo del otro.

**Flujo cross-sistema:**
```
Admin CMS crea grupos → Backend guarda membresía por user_id
         → GET /assignments/groups con token Alpha → solo grupo 16
         → GET /assignments/groups/17 con token Alpha → 403/404
```

---

### 📱 Mobile — SCEN-16 Parte A: Encargado Alpha

**Paso 1 — Iniciar sesión como Encargado Alpha**
1. Cierra cualquier sesión activa en la app.
2. Correo: `qa.encargado.alpha@qa.brigada.com` · Contraseña: `QABrigada2026!`
3. Toca **INICIAR SESIÓN**.

✅ **Debes ver:** Pantalla del encargado. La pantalla principal muestra sus grupos asignados.

---

**Paso 2 — Verificar que solo ve Grupo Alpha**
1. Navega a la sección de grupos o asignaciones en la app (tab de inicio del encargado).
2. Lee los nombres de los grupos visibles.

✅ **Debes ver:**
- **"QA — Grupo Alpha"** aparece en la lista.
- **"QA — Grupo Beta"** NO aparece en ningún lugar.

❌ **Falla si:** Ambos grupos aparecen en la lista del encargado Alpha.

---

**Paso 3 — Explorar el Grupo Alpha**
1. Toca **QA — Grupo Alpha** para abrir los detalles.
2. Revisa los brigadistas asignados al grupo.

✅ **Debes ver:**
- `QA Brigadista Alpha` aparece en la lista de brigadistas.
- `QA Brigadista Beta` NO aparece (pertenece al Grupo Beta).

---

**Paso 4 — Cerrar sesión de Alpha**
1. Tab **Perfil** → **Cerrar sesión**.

---

### 📱 Mobile — SCEN-16 Parte B: Encargado Beta

**Paso 5 — Iniciar sesión como Encargado Beta**
1. Correo: `qa.encargado.beta@qa.brigada.com` · Contraseña: `QABrigada2026!`
2. Toca **INICIAR SESIÓN**.

---

**Paso 6 — Verificar que solo ve Grupo Beta**
1. Navega a la sección de grupos.

✅ **Debes ver:**
- **"QA — Grupo Beta"** aparece.
- **"QA — Grupo Alpha"** NO aparece.

---

### 🖥️ CMS — SCEN-16 Verificación cross-sistema

**Paso 7 — Verificar scope desde admin**
1. Login con `admin@brigada.com` en `http://localhost:3100`.
2. Ve a **Grupos y Asignaciones**.

✅ **Debes ver:** El admin puede ver **ambos** grupos: "QA — Grupo Alpha" y "QA — Grupo Beta". El admin tiene `view_all_assignments`.

---

**Paso 8 — Verificar encargado Alpha en CMS** (si el rol tiene `access_cms`)
1. Cierra la sesión del admin.
2. Login con `qa.encargado.alpha@qa.brigada.com`.
3. Si el login es exitoso (el rol encargado tiene `access_cms`): ve a **Grupos y Asignaciones**.

✅ **Debes ver:** Solo aparece "QA — Grupo Alpha". "QA — Grupo Beta" no figura.

> Si el login falla con 403: el rol encargado no tiene `access_cms`. Esto es aceptable — indica que el encargado solo usa la app mobile, no el CMS.

---

### 🔌 API — SCEN-16 (opcional)

```bash
# Token Alpha (encargado)
TOKEN_ALPHA=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.encargado.alpha@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Token Beta (encargado)
TOKEN_BETA=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=qa.encargado.beta@qa.brigada.com&password=QABrigada2026!" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Alpha lista grupos → solo debe ver grupo 16
curl -s -H "Authorization: Bearer $TOKEN_ALPHA" \
  "http://localhost:8000/assignments/groups?limit=50" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('items', d.get('data', []))
names = [g.get('name','') for g in items]
print('Grupos visibles para Alpha:', names)
print('BUG: Grupo Beta visible para Alpha!' if any('Beta' in n for n in names) else 'OK: solo Grupo Alpha')
"

# Alpha intenta acceder al grupo 17 (Beta) → debe ser 403/404
curl -s -o /dev/null -w "Alpha → Grupo Beta (id=17): %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_ALPHA" \
  http://localhost:8000/assignments/groups/17
# Esperado: 403 o 404

# Beta intenta acceder al grupo 16 (Alpha) → debe ser 403/404
curl -s -o /dev/null -w "Beta → Grupo Alpha (id=16): %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_BETA" \
  http://localhost:8000/assignments/groups/16
# Esperado: 403 o 404
```

---

## Tabla de Resultados

Usa esta tabla para registrar los resultados de cada escenario:

| Escenario | Resultado CMS | Resultado Mobile | Resultado API | Notas |
|-----------|--------------|-----------------|---------------|-------|
| SCEN-01 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-02 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-03 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-04 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-05 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-06 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-07 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-08 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-09 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-10 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-11 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-12 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-13 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-14 | ⬜ PASA / ⬜ FALLA | N/A | ⬜ PASA / ⬜ FALLA | |
| SCEN-15 | ⬜ PASA / ⬜ FALLA | ⬜ PASA / ⬜ FALLA | ⬜ PASA / ⬜ FALLA | |
| SCEN-16 | ⬜ PASA / ⬜ FALLA | ⬜ PASA / ⬜ FALLA | ⬜ PASA / ⬜ FALLA | |

---

## Re-seeding — Restaurar datos QA

Si los datos QA se alteraron durante las pruebas:

```bash
cd /Users/dou1013/Documents/GithubProyects/brigadaBackEnd

# Cleanup (desactiva usuarios y grupos QA, no elimina)
venv/bin/python scripts/seed_qa_permissions.py --password admin123 --cleanup

# Re-seed completo (crea los 13 roles, 18 usuarios, 5 grupos)
venv/bin/python scripts/seed_qa_permissions.py

# Esperado: "13 roles, 18 usuarios, 5 grupos creados"
```

> ⚠️ Si se usó DELETE en lugar de desactivar usuarios, puede quedar el email bloqueado por soft-delete. Ver bug **BE-USER-1** en `brigadaBackEnd/ai-context/07-known-bugs.md`.

---

## Artefactos de Testing Automatizado

Para ejecutar los mismos escenarios de forma automatizada:

| Herramienta | Qué cubre | Cómo ejecutar |
|-------------|-----------|---------------|
| **Playwright** | CMS UI + API (SCEN-01 a SCEN-14) | `npm run test:e2e -- --grep "permission"` |
| **Postman** | Todas las APIs (SCEN-01 a SCEN-16) | Importar `tests/postman/qa-permissions.postman_collection.json` |
| **Maestro** | Mobile UI (SCEN-15 y SCEN-16) | `maestro test tests/maestro/permission-brigadista-isolation.yaml` |
