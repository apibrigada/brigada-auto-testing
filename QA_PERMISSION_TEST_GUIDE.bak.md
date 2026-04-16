# QA Permission Test Guide — Brigada

> **Audiencia:** Testers manuales y QA automation engineers  
> **Prerequisito:** Haber corrido `seed_qa_permissions.py` exitosamente (13 roles, 18 usuarios, 5 grupos creados)  
> **Última actualización:** 2026-04-16  
> **Sistemas cubiertos:** Backend API · Web CMS · Mobile App (React Native/Expo)

---

## Credenciales QA

| Escenario | Email | Contraseña | Rol | Estado |
|-----------|-------|-----------|-----|--------|
| SCEN-01 | `qa.full.admin@qa.brigada.com` | `QABrigada2026!` | qa_full_admin | ✅ Activo |
| SCEN-02 | `qa.survey.creator@qa.brigada.com` | `QABrigada2026!` | qa_survey_creator | ✅ Activo |
| SCEN-03 | `qa.survey.publisher@qa.brigada.com` | `QABrigada2026!` | qa_survey_publisher | ✅ Activo |
| SCEN-04 | `qa.auditor@qa.brigada.com` | `QABrigada2026!` | qa_auditor_readonly | ✅ Activo |
| SCEN-05 | `qa.brig.mgr@qa.brigada.com` | `QABrigada2026!` | qa_brigadista_manager | ✅ Activo |
| SCEN-06 | `qa.scoped.enc@qa.brigada.com` | `QABrigada2026!` | qa_survey_scoped | ✅ Activo |
| SCEN-07 | `qa.user.creator@qa.brigada.com` | `QABrigada2026!` | qa_brigadista_creator | ✅ Activo |
| SCEN-08 | `qa.user.editor@qa.brigada.com` | `QABrigada2026!` | qa_brigadista_editor | ✅ Activo |
| SCEN-09 | `qa.no.cms@qa.brigada.com` | `QABrigada2026!` | qa_no_cms_access | ✅ Activo |
| SCEN-10 | `qa.resp.only@qa.brigada.com` | `QABrigada2026!` | qa_responses_only | ✅ Activo |
| SCEN-11 | `qa.zero.perms@qa.brigada.com` | `QABrigada2026!` | qa_zero_perms | ✅ Activo |
| SCEN-12 | `qa.wildcard.mgr@qa.brigada.com` | `QABrigada2026!` | qa_wildcard_manager | ✅ Activo |
| SCEN-13 | `qa.inactive.role@qa.brigada.com` | `QABrigada2026!` | qa_inactive_role | ⚠️ Rol inactivo |
| SCEN-14 | `qa.inactive.user@qa.brigada.com` | `QABrigada2026!` | qa_auditor_readonly | ❌ Usuario inactivo |
| SCEN-15A | `qa.brigadista.alpha@qa.brigada.com` | `QABrigada2026!` | brigadista | ✅ Activo |
| SCEN-15B | `qa.brigadista.beta@qa.brigada.com` | `QABrigada2026!` | brigadista | ✅ Activo |
| SCEN-16A | `qa.encargado.alpha@qa.brigada.com` | `QABrigada2026!` | encargado | ✅ Activo |
| SCEN-16B | `qa.encargado.beta@qa.brigada.com` | `QABrigada2026!` | encargado | ✅ Activo |

**Admin del sistema (para setup/verificación):**  
Email: `admin@brigada.com` · Contraseña: `admin123`

---

## Artefactos de Testing Automatizado

Los escenarios de esta guía tienen cobertura automatizada en tres plataformas. Ejecutar la suite completa:

### Playwright — CMS UI + API (SCEN-01 → SCEN-14)

```bash
cd brigada-auto-testing
npm run test:e2e -- --grep "permission"
# O por archivo:
npx playwright test tests/e2e/specs/permission-cms-access.spec.ts
npx playwright test tests/e2e/specs/permission-surveys.spec.ts
npx playwright test tests/e2e/specs/permission-users.spec.ts
npx playwright test tests/e2e/specs/permission-assignments.spec.ts
npx playwright test tests/e2e/specs/permission-privilege-escalation.spec.ts
```

Variables de entorno necesarias en `.env` (ver `.env.example`):
```
API_BASE_URL=http://localhost:8000
E2E_BASE_URL=http://localhost:3100
QA_USER_PASSWORD=QABrigada2026!
```

### Postman — API pura con assertions (todos los SCEN)

Archivo: `tests/postman/qa-permissions.postman_collection.json`  
Importar en Postman → fijar variables de colección `base_url` y `admin_password` → correr la carpeta **🔧 Setup** primero → luego cada escenario.

```bash
# Via Newman (CLI):
npx newman run tests/postman/qa-permissions.postman_collection.json \
  --env-var "base_url=http://localhost:8000" \
  --env-var "admin_password=admin123" \
  --env-var "qa_password=QABrigada2026!"
```

### Maestro — Mobile UI (SCEN-15 y SCEN-16)

```bash
# SCEN-15: aislamiento de datos entre brigadistas
maestro test tests/maestro/permission-brigadista-isolation.yaml \
  --env TEST_ALPHA_EMAIL=qa.brigadista.alpha@qa.brigada.com \
  --env TEST_BETA_EMAIL=qa.brigadista.beta@qa.brigada.com \
  --env QA_PASSWORD=QABrigada2026!

# SCEN-16: scope de grupos entre encargados
maestro test tests/maestro/permission-encargado-scope.yaml \
  --env TEST_ENC_ALPHA_EMAIL=qa.encargado.alpha@qa.brigada.com \
  --env TEST_ENC_BETA_EMAIL=qa.encargado.beta@qa.brigada.com \
  --env QA_PASSWORD=QABrigada2026!
```

---

## Grupos de Asignación

| Grupo | ID | Encargado | Brigadista(s) | Escenario |
|-------|-----|-----------|---------------|-----------|
| QA — Grupo Alpha | 16 | encargado.alpha | brigadista.alpha | SCEN-15/16-A |
| QA — Grupo Beta | 17 | encargado.beta | brigadista.beta | SCEN-15/16-B |
| QA — Aislamiento Compartido | 18 | — | alpha + beta | SCEN-15 |
| QA — Encargado Scoped | 19 | scoped.enc | — | SCEN-06 |
| QA — Gestión | 20 | encargado.alpha | brigadista.alpha | SCEN-gestión |

---

## URLs de Referencia

| Sistema | URL |
|---------|-----|
| Backend API | `http://localhost:8000` |
| API Docs (Swagger) | `http://localhost:8000/docs` |
| Web CMS | `http://localhost:3100` |

---

## Topología Cross-Sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│ Web CMS (Next.js :3100) — AUTORIDAD DE CONFIGURACIÓN                 │
│  SCEN-01–12,14: login, módulos del sidebar, botones CRUD             │
│  SCEN-02/03: botón Publicar, formulario solo-lectura                 │
│  SCEN-07/08: selector de roles filtrado por targets                  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ REST /admin/* + /auth/login
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Backend API (FastAPI :8000) — FUENTE DE VERDAD                       │
│  Verifica permisos en CADA request (no delega al CMS)               │
│  Redis caché de permisos con TTL 60s (relevante SCEN-13)            │
│  Soft-delete de usuarios (relevante bug BE-USER-1)                  │
└──────────┬───────────────────────────────────────────────────────────┘
           │
     ┌─────┴────────────────────────────────────────┐
     │ /mobile/*                  │ /admin/*         │
     ▼                            ▼                  │
┌────────────────────┐  ┌────────────────────┐      │
│ Mobile App (Expo)  │  │ Web CMS Analytics  │      │
│  SCEN-15/16        │  │  SCEN-06/10/16     │      │
│  SQLite offline    │  │  respuestas vía    │      │
│  → sync queue      │  │  GET /admin/resp.  │      │
│  → batch upload    │  └────────────────────┘      │
└────────────────────┘                              │
```

### Dónde se aplica `access_cms`

> **Importante:** `access_cms` es un permiso del **backend** que el endpoint `/auth/login` verifica antes de emitir el JWT. Si falta, el login devuelve 403 independientemente del cliente.
> - **CMS** (`http://localhost:3100`): el middleware de Next.js hace login en `/auth/login` → si 403, redirige a error
> - **Mobile** (app React Native): usa el **mismo** `/auth/login`. Si un usuario tiene `access_cms=False` y solo debería usar la app mobile, el backend debe devolver un token de mobile scope (flujo distinto o campo diferente). **Comportamiento a verificar en SCEN-09.**
> - **API directa** (Postman/curl): también recibe el 403 de login antes de poder usar cualquier endpoint.

### Ciclo de vida de una respuesta mobile (SCEN-15)

```
Brigadista llena encuesta offline
          │ SQLite (WAL, offline-first)
          ▼
  sync_queue (status=pending)
          │ NetInfo detecta conectividad
          ▼
  processSyncQueue() → POST /mobile/responses/batch
          │ {client_id: UUID, survey_version_id, answers: [...]}
          ▼
  Backend: UNIQUE(client_id) → 200 status:"ok" | 200 status:"duplicate"
          │ almacena en survey_responses con user_id del token
          ▼
  CMS admin: GET /admin/responses?survey_id=X → solo ve su scope
  Otro brigadista: GET /mobile/responses/{id} → 403/404
```

### Ciclo de vida de grupos de encargado (SCEN-16)

```
Admin CMS: POST /assignments/team (target_role=encargado)
          │ crea assignment_group con encargado_alpha como supervisor
          ▼
Backend: scope de encargado = solo sus grupos asignados
          │ GET /assignments/groups filtra por user_id del token
          ▼
Encargado Alpha: solo ve Grupo Alpha (id=16)
Encargado Beta:  solo ve Grupo Beta  (id=17)
Acceso cruzado: GET /assignments/groups/17 con token alpha → 403/404
```

---

## Cómo ejecutar peticiones API

Para probar los flujos de API directamente, usa cualquier cliente REST (Insomnia, Postman, curl).  
Obtén el token primero:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=qa.full.admin@qa.brigada.com&password=QABrigada2026!"
# → Copia el campo "access_token"
```

Luego en cada petición:
```
Authorization: Bearer <access_token>
```

---

## SCEN-01 — Admin Completo sin bypass de sistema

**Riesgo:** `qa_full_admin` tiene `is_system=False`. El bypass de super-admin (que aplica solo a roles del sistema) NO debe activarse. Los 44 permisos explícitos deben funcionar sin él.

### Preparación
- [ ] Confirmar que existe al menos una encuesta QA publicada (correr `seed_qa_surveys.py` si no hay)
- [ ] Tener el ID del rol `qa_full_admin` (obtener con `GET /roles`)

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.full.admin@qa.brigada.com` / `QABrigada2026!`  
   → **Esperado:** HTTP 200, campo `access_token` presente

2. - [ ] `GET /admin/surveys` con el token obtenido  
   → **Esperado:** HTTP 200, lista de encuestas visible

3. - [ ] `POST /admin/surveys` body `{"title": "SCEN01 Tmp", "survey_type": "normal"}`  
   → **Esperado:** HTTP 201, encuesta creada (guardar `id` para el paso 5)

4. - [ ] `GET /users`  
   → **Esperado:** HTTP 200, lista completa de usuarios visible

5. - [ ] `DELETE /admin/surveys/<id_del_paso_3>` (limpiar)  
   → **Esperado:** HTTP 200 o 204

6. - [ ] `GET /admin/stats`  
   → **Esperado:** HTTP 200

### Pasos — CMS
7. - [ ] Iniciar sesión en `http://localhost:3100` con `qa.full.admin@qa.brigada.com`  
   → **Esperado:** Dashboard visible con TODOS los módulos en sidebar

8. - [ ] Navegar a cada sección del sidebar (Encuestas, Usuarios, Asignaciones, Estadísticas, Configuración)  
   → **Esperado:** Todas las secciones cargan sin error 403 ni módulo oculto

### ✅ Pasa si
- Todos los endpoints retornan los códigos esperados
- CMS muestra todos los módulos sin restricciones

### ❌ Falla si
- Cualquier endpoint retorna 403 teniendo todos los permisos presentes
- CMS oculta algún módulo porque no detecta `is_system=True`
- `POST /roles` retorna 403 (backend exige `is_system` para gestión de roles)

---

## SCEN-02 — Editor de Encuestas bloqueado en Publicar

**Riesgo:** Tiene `create_survey` + `edit_survey` pero le falta `publish_survey`. El botón "Publicar" puede estar visible en el CMS y fallar solo al hacer clic.

### Preparación
- [ ] Identificar una encuesta QA en estado `draft` (o crearla con el admin)

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.survey.creator@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `GET /admin/surveys`  
   → **Esperado:** HTTP 200, lista visible

3. - [ ] `POST /admin/surveys` body `{"title": "SCEN02 Test Survey", "survey_type": "normal"}`  
   → **Esperado:** HTTP 201 ✅ (tiene `create_survey`)

4. - [ ] `PUT /admin/surveys/<id_creado>` body `{"title": "SCEN02 Test Survey Editada"}`  
   → **Esperado:** HTTP 200 ✅ (tiene `edit_survey`)

5. - [ ] Obtener `version_id` de la encuesta: `GET /admin/surveys/<id_creado>`  
   → Anotar el `version_id` de la versión actual

6. - [ ] `POST /admin/surveys/<id>/versions/<version_id>/publish`  
   → **Esperado:** HTTP 403 ❌ (no tiene `publish_survey`)

### Pasos — CMS
7. - [ ] Iniciar sesión con `qa.survey.creator@qa.brigada.com`  
8. - [ ] Navegar a una encuesta en draft  
9. - [ ] Verificar que el botón "Publicar" esté **oculto o deshabilitado**  
   → Si está visible y clickeable: **BUG UX**

### ✅ Pasa si
- `POST /admin/surveys` → 201
- `PUT /admin/surveys/{id}` → 200
- `POST .../publish` → 403
- CMS: botón Publicar oculto o deshabilitado con mensaje claro

### ❌ Falla si
- `POST .../publish` → 200 (permiso no verificado)
- Botón Publicar clickeable sin feedback de error

---

## SCEN-03 — Publicador sin Creador

**Riesgo:** Tiene `publish_survey` pero le faltan `create_survey` y `edit_survey`. CMS puede mostrar formulario de edición o botón "Nueva Encuesta".

### Preparación
- [ ] Identificar una encuesta QA en draft para publicar (anotar `id` y `version_id`)

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.survey.publisher@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `POST /admin/surveys` body `{"title": "SCEN03 No debe crearse", "survey_type": "normal"}`  
   → **Esperado:** HTTP 403 ❌ (no tiene `create_survey`)

3. - [ ] `PUT /admin/surveys/<id_encuesta_draft>` body `{"title": "Modificado"}`  
   → **Esperado:** HTTP 403 ❌ (no tiene `edit_survey`)

4. - [ ] `POST /admin/surveys/<id>/versions/<version_id>/publish`  
   → **Esperado:** HTTP 200 ✅ (tiene `publish_survey`)

### Pasos — CMS
5. - [ ] Iniciar sesión con `qa.survey.publisher@qa.brigada.com`  
6. - [ ] Verificar que el botón "Nueva Encuesta" esté **oculto**  
7. - [ ] Abrir el detalle de una encuesta → el formulario debe estar en **solo lectura**, sin botón de guardar activo

### ✅ Pasa si
- POST /admin/surveys → 403
- PUT /admin/surveys/{id} → 403
- POST .../publish → 200

### ❌ Falla si
- POST /admin/surveys → 201 (create_survey no verificado en backend)
- Formulario de edición visible y con submit funcional

---

## SCEN-04 — Auditor Solo Lectura

**Riesgo:** Todos los `view_*` activos, cero permisos de escritura. CMS puede mostrar botones que retornan 403 sin feedback visual.

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.auditor@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `GET /admin/surveys` → **Esperado:** 200 ✅
3. - [ ] `GET /users` → **Esperado:** 200 ✅
4. - [ ] `GET /admin/responses` → **Esperado:** 200 ✅
5. - [ ] `GET /admin/stats` → **Esperado:** 200 ✅
6. - [ ] `POST /admin/surveys` body `{"title": "SCEN04 No debe crearse"}` → **Esperado:** 403 ❌
7. - [ ] `POST /users` body `{"email":"tmp@qa.brigada.com","password":"x","full_name":"Tmp","custom_role_id":1}` → **Esperado:** 403 ❌
8. - [ ] `DELETE /admin/surveys/<cualquier_id>` → **Esperado:** 403 ❌

### Pasos — CMS
9. - [ ] Iniciar sesión con `qa.auditor@qa.brigada.com`  
10. - [ ] Verificar que no hay botones de "Crear", "Editar", "Eliminar" visibles ni funcionales en ninguna sección

### ✅ Pasa si
- TODOS los GET → 200; TODOS los POST/PUT/DELETE → 403
- CMS no muestra botones de acción

### ❌ Falla si
- Cualquier endpoint de escritura retorna 200
- Botones de acción visibles sin restricción

---

## SCEN-05 — manage_brigadista_assignments vs manage_assignments

**Riesgo:** Tiene `manage_brigadista_assignments` pero NO `manage_assignments`. Asignar a un encargado debe devolver 403.

### Preparación
- [ ] Obtener el ID de `qa.brigadista.alpha@qa.brigada.com` y de `qa.encargado.alpha@qa.brigada.com` via `GET /users` con admin
- [ ] Obtener el ID de una encuesta QA publicada

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.brig.mgr@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `POST /assignments/team` body:
   ```json
   {
     "survey_ids": [<id_encuesta_qa>],
     "user_ids": [<id_brigadista_alpha>],
     "target_role": "brigadista",
     "group_name": "SCEN05 Test Brig",
     "group_description": "test"
   }
   ```
   → **Esperado:** HTTP 200/201 ✅ (tiene `manage_brigadista_assignments`)

3. - [ ] `POST /assignments/team` body:
   ```json
   {
     "survey_ids": [<id_encuesta_qa>],
     "user_ids": [<id_encargado_alpha>],
     "target_role": "encargado",
     "group_name": "SCEN05 Test Enc",
     "group_description": "test"
   }
   ```
   → **Esperado:** HTTP 403 ❌ (no tiene `manage_assignments`)

4. - [ ] `DELETE /assignments/<cualquier_id>` → **Esperado:** 403 ❌

### ✅ Pasa si
- POST con `target_role: "brigadista"` → 200
- POST con `target_role: "encargado"` → 403
- DELETE → 403

### ❌ Falla si
- POST con `target_role: "encargado"` → 200 (los dos permisos son tratados como alias)

---

## SCEN-06 — Restricción de Scope por allowed_survey_ids

**Riesgo:** Rol `qa_survey_scoped` tiene `view_surveys` (sin `view_all_surveys`) con `allowed_survey_ids` restringido a 2 encuestas. La lista debe contener solo esas 2 encuestas; el acceso a cualquier otra debe ser 403.

### Preparación
- [ ] Con el admin, hacer `GET /roles` y encontrar `qa_survey_scoped`
- [ ] Anotar los `allowed_survey_ids` del rol (2 IDs de encuestas QA)
- [ ] Identificar el ID de cualquier encuesta que NO esté en esa lista (para probar out-of-scope)

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.scoped.enc@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `GET /admin/surveys`  
   → **Esperado:** HTTP 200, respuesta contiene **exactamente 2 items** correspondientes a los IDs permitidos

3. - [ ] `GET /admin/surveys/<id_IN_scope>`  
   → **Esperado:** HTTP 200 ✅

4. - [ ] `GET /admin/surveys/<id_OUT_of_scope>`  
   → **Esperado:** HTTP 403 o 404 ❌

5. - [ ] `GET /admin/responses?survey_id=<id_IN_scope>`  
   → **Esperado:** HTTP 200 ✅

6. - [ ] `GET /admin/responses?survey_id=<id_OUT_of_scope>`  
   → **Esperado:** HTTP 403 o 404 ❌

7. - [ ] `GET /assignments/groups/19` (grupo Encargado Scoped)  
   → **Esperado:** HTTP 200, solo las 2 encuestas del scope

### ✅ Pasa si
- Lista de encuestas: exactamente 2 items
- Detalle in-scope → 200
- Detalle out-of-scope → 403 o 404

### ❌ Falla si
- `GET /admin/surveys` retorna más de 2 encuestas (scope ignorado en lista)
- `GET /admin/surveys/<out_of_scope_id>` → 200 (scope no verificado en detalle)

---

## SCEN-07 — Creador con Target Restringido a Brigadistas

**Riesgo:** `create_user_targets=["brigadista"]`. Crear un usuario con rol encargado debe retornar 403. CMS puede mostrar todos los roles en el selector sin filtrar.

### Preparación
- [ ] Con el admin, obtener el ID del rol `encargado` y del rol `brigadista` (via `GET /roles`)

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.user.creator@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `POST /users` body:
   ```json
   {
     "email": "scen07.brig.test@qa.brigada.com",
     "full_name": "SCEN07 Test Brigadista",
     "password": "QABrigada2026!",
     "custom_role_id": <id_rol_brigadista>
   }
   ```
   → **Esperado:** HTTP 201 ✅ (target `brigadista` permitido)

3. - [ ] `POST /users` body:
   ```json
   {
     "email": "scen07.enc.test@qa.brigada.com",
     "full_name": "SCEN07 Test Encargado",
     "password": "QABrigada2026!",
     "custom_role_id": <id_rol_encargado>
   }
   ```
   → **Esperado:** HTTP 403 ❌ (target `encargado` fuera de scope)

4. - [ ] **Cleanup:** Con el admin, eliminar `scen07.brig.test@qa.brigada.com`

### Pasos — CMS
5. - [ ] Iniciar sesión con `qa.user.creator@qa.brigada.com` e ir a "Crear Usuario"  
6. - [ ] Verificar que el selector de rol solo muestra roles del tipo `brigadista` (no encargado, no admin)

### ✅ Pasa si
- POST con `brigadista` → 201
- POST con `encargado` → 403

### ❌ Falla si
- POST con `encargado` → 201 (create_user_targets no verificado)
- Selector de roles en CMS muestra todos los roles

---

## SCEN-08 — Editor con Target Restringido a Brigadistas

**Riesgo:** `edit_user_targets=["brigadista"]` + `view_all_users`. Ve a todos pero solo puede editar brigadistas. `PUT /users/<encargado_id>` debe ser 403.

### Preparación
- [ ] Con el admin, obtener:
  - ID de `qa.brigadista.alpha@qa.brigada.com`
  - ID de `qa.encargado.alpha@qa.brigada.com`
  - ID de `qa.full.admin@qa.brigada.com`

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.user.editor@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `GET /users`  
   → **Esperado:** HTTP 200, lista completa (tiene `view_all_users`)

3. - [ ] `PUT /users/<id_brigadista_alpha>` body `{"full_name": "SCEN08 Editado Alpha"}`  
   → **Esperado:** HTTP 200 ✅ (target brigadista permitido)

4. - [ ] `PUT /users/<id_encargado_alpha>` body `{"full_name": "SCEN08 Editado Enc"}`  
   → **Esperado:** HTTP 403 ❌ (encargado fuera de target)

5. - [ ] `PUT /users/<id_full_admin>` body `{"full_name": "SCEN08 Editado Admin"}`  
   → **Esperado:** HTTP 403 ❌

6. - [ ] `DELETE /users/<id_brigadista_alpha>`  
   → **Esperado:** HTTP 403 ❌ (no tiene `delete_user`)

### ✅ Pasa si
- GET /users → 200 lista completa
- PUT brigadista → 200
- PUT encargado → 403
- PUT admin → 403

### ❌ Falla si
- `PUT /users/<encargado_id>` → 200 (edit_user_targets no verificado)
- Botón Editar habilitado para todos en la lista del CMS

---

## SCEN-09 — Datos sin access_cms

**Riesgo:** Tiene permisos de datos (`view_surveys`, `view_responses`) pero le falta `access_cms`. Login al CMS debe ser rechazado. El token puede ser válido para mobile pero no para `/admin/*`.

**Sistema afectado:** Backend (auth) → CMS (login redirect)

> **Flujo cross-sistema:** CMS llama a `POST /auth/login` → Backend verifica `access_cms` → devuelve 403 → Next.js middleware redirige a página de error sin cargar el dashboard. El CMS **nunca** llega a hacer el primer request autenticado.

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.no.cms@qa.brigada.com`  
   → **Esperado:** HTTP 403 ❌ (sin `access_cms`, el backend bloquea la emisión del JWT)

2. - [ ] **Si obtuvo token** (indicaría un bug en el backend): `GET /admin/surveys`  
   → **Esperado:** HTTP 403 ❌ (todos los endpoints `/admin/*` requieren `access_cms`)

3. - [ ] **Si obtuvo token:** `GET /admin/responses`  
   → **Esperado:** HTTP 403 ❌

4. - [ ] **Variante mobile (informativo):** Si el rol solo debe acceder por mobile, verificar si el mismo endpoint devuelve token de scope móvil. Este comportamiento debe documentarse en `ai-context/06-agent-rules.md` si aplica.

### Pasos — CMS
5. - [ ] Intentar iniciar sesión en `http://localhost:3100` con `qa.no.cms@qa.brigada.com`  
   → **Esperado:** Página de error de acceso denegado (no dashboard, no pantalla en blanco)
6. - [ ] Abrir DevTools → Network → verificar que la respuesta a `/auth/login` es 403

### ✅ Pasa si
- `/auth/login` → 403 (bloqueado por falta de `access_cms`)
- CMS muestra mensaje de acceso denegado sin cargar ningún módulo

### ❌ Falla si
- Login → 200 y algún `/admin/*` retorna 200 (`access_cms` ignorado)
- CMS carga parcialmente antes de redirigir al error

---

## SCEN-10 — Respuestas sin Contexto de Encuesta

**Riesgo:** Tiene `view_responses` pero le falta `view_surveys`. La página de detalle de respuestas puede hacer fetch implícito a `/admin/surveys/{id}` y crashear con 403 aunque la respuesta sí sea accesible.

### Preparación
- [ ] Con el admin, obtener el ID de alguna respuesta existente

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.resp.only@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `GET /admin/responses`  
   → **Esperado:** HTTP 200, lista de respuestas ✅

3. - [ ] `GET /admin/responses/<id_respuesta>`  
   → **Esperado:** HTTP 200, datos completos sin crash ✅

4. - [ ] `GET /admin/surveys`  
   → **Esperado:** HTTP 403 ❌ (no tiene `view_surveys`)

5. - [ ] `GET /admin/surveys/<cualquier_id>`  
   → **Esperado:** HTTP 403 ❌

### Pasos — CMS
6. - [ ] Iniciar sesión con `qa.resp.only@qa.brigada.com`  
7. - [ ] Navegar al detalle de una respuesta  
   → **Esperado:** La respuesta renderiza completa sin pantalla en blanco  
8. - [ ] Abrir DevTools → pestaña Network → verificar que no hay errores 403 que bloqueen el render

### ✅ Pasa si
- GET /admin/responses → 200
- GET /admin/responses/{id} → 200 con datos completos renderizados
- CMS renderiza la respuesta aunque /admin/surveys falle

### ❌ Falla si
- Página de respuesta muestra error por 403 en `/surveys/{id}`
- GET /admin/responses/{id} → 500 (backend hace join con surveys y falla)

---

## SCEN-11 — Rol Activo Sin Permisos

**Riesgo:** `permissions=[]`. Todas las llamadas deben retornar 403. El backend no debe crashear con 500 al evaluar lista vacía.

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.zero.perms@qa.brigada.com`  
   → **Esperado:** HTTP 403 (falta `access_cms`) o 200 (si login no verifica `access_cms`)

2. - [ ] **Si obtuvo token:** `GET /admin/surveys` → **Esperado:** 403 ❌
3. - [ ] **Si obtuvo token:** `GET /users` → **Esperado:** 403 ❌
4. - [ ] **Si obtuvo token:** `GET /admin/responses` → **Esperado:** 403 ❌
5. - [ ] **Si obtuvo token:** `GET /admin/stats` → **Esperado:** 403 ❌

### Pasos — CMS
6. - [ ] Intentar iniciar sesión con `qa.zero.perms@qa.brigada.com`  
   → **Esperado:** Error de acceso claro, sin pantalla en blanco ni crash 500

### ✅ Pasa si
- TODOS los endpoints → 403
- No hay errores 500
- CMS muestra mensaje de error o redirige a acceso denegado

### ❌ Falla si
- Cualquier endpoint → 200 con `permissions=[]`
- Backend → 500 al evaluar lista vacía de permisos
- CMS muestra pantalla en blanco sin mensaje

---

## SCEN-12 — Escalación de Privilegios con Target Comodín

**Riesgo:** `create/edit/delete/reset_password targets=["*"]`. El comodín puede permitir modificar usuarios admin. Bug crítico si permite editar o eliminar el admin principal del sistema.

### Preparación
- [ ] Con el admin, obtener el ID del usuario `admin@brigada.com` (admin principal del sistema)

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.wildcard.mgr@qa.brigada.com`  
   → **Esperado:** HTTP 200

2. - [ ] `GET /users`  
   → **Esperado:** HTTP 200, lista completa ✅

3. - [ ] `PUT /users/<id_admin_principal>` body `{"full_name": "SCEN12 Wildcard Test"}`  
   → **Esperado:** HTTP 403 ❌ (backend debe proteger usuarios is_system de targets['*'])

4. - [ ] `DELETE /users/<id_admin_principal>`  
   → **Esperado:** HTTP 403 ❌ ⚠️ **BUG CRÍTICO si retorna 200**

5. - [ ] `POST /users/reset-password/<id_admin_principal>`  
   → **Esperado:** HTTP 403 ❌

6. - [ ] `POST /roles` body `{"key": "scen12_tmp", "display_name": "Tmp", "permissions": []}`  
   → **Esperado:** HTTP 403 ❌ (no tiene `manage_access_control`)

### ✅ Pasa si
- PUT/DELETE en admin principal → 403
- POST /roles → 403

### ❌ Falla si (CRÍTICO)
- `PUT /users/<admin_principal_id>` → 200 (escalación de privilegios)
- `DELETE /users/<admin_principal_id>` → 200 (eliminación de admin con comodín)

---

## SCEN-13 — Rol Inactivo con Permisos Válidos

**Riesgo:** El usuario está activo pero su rol `qa_inactive_role` tiene `is_active=False`. Si el backend cachea permisos en el JWT (TTL Redis 60s), el token puede funcionar brevemente.

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.inactive.role@qa.brigada.com`  
   → **Esperado:** HTTP 403 ❌ (rol inactivo bloquea login)

2. - [ ] **Con el admin**, reactivar el rol:  
   `PATCH /roles/<id_qa_inactive_role>` body `{"is_active": true}`  
   → **Esperado:** HTTP 200

3. - [ ] `POST /auth/login` de nuevo con `qa.inactive.role@qa.brigada.com`  
   → **Esperado:** HTTP 200 ✅ (rol activo → login funciona)

4. - [ ] `GET /admin/surveys` con el nuevo token  
   → **Esperado:** HTTP 200 ✅

5. - [ ] **Con el admin**, desactivar el rol de nuevo:  
   `PATCH /roles/<id>` body `{"is_active": false}`

6. - [ ] Esperar 60 segundos (expiración del caché Redis)

7. - [ ] `GET /admin/surveys` con el token antiguo del paso 3  
   → **Esperado:** HTTP 403 ❌ (caché expirado, rol inactivo bloqueado)

### ✅ Pasa si
- Con rol inactivo: login → 403; endpoints → 403
- Tras reactivar: login → 200; endpoints → 200
- Tras desactivar + 60s: vuelve a 403

### ❌ Falla si
- Con rol inactivo: login → 200 y `/admin/surveys` → 200 (is_active del rol ignorado)
- Sesión activa funciona indefinidamente tras desactivar el rol

---

## SCEN-14 — Usuario Inactivo

**Riesgo:** `qa.inactive.user` tiene `is_active=False`. Login debe retornar 401 o 403. Tokens previos emitidos antes de la desactivación también deben quedar invalidados.

### Pasos — API

1. - [ ] `POST /auth/login` con `qa.inactive.user@qa.brigada.com`  
   → **Esperado:** HTTP 401 o 403 ❌ (usuario inactivo)

2. - [ ] **Con el admin**, reactivar el usuario:  
   `PATCH /users/<id_qa_inactive_user>` body `{"is_active": true}`

3. - [ ] `POST /auth/login` con `qa.inactive.user@qa.brigada.com`  
   → **Esperado:** HTTP 200 ✅ (usuario activo → login funciona)

4. - [ ] **Con el admin**, desactivar de nuevo:  
   `PATCH /users/<id>` body `{"is_active": false}`

5. - [ ] Usar el token del paso 3 (pre-desactivación) en `GET /admin/surveys`  
   → **Esperado:** HTTP 401 o 403 ❌ (token previo invalidado)

### ✅ Pasa si
- Login con usuario inactivo → 401 o 403
- Tokens anteriores a la desactivación → 401 o 403
- Tras reactivar: login → 200

### ❌ Falla si
- Login → 200 con usuario inactivo
- Token previo sigue válido indefinidamente tras desactivar

---

## SCEN-15 — Aislamiento de Datos entre Brigadistas

**Riesgo:** Alpha y Beta comparten el grupo "QA — Aislamiento Compartido" (misma encuesta, `id=18`). Cada uno debe ver SOLO sus propias respuestas. `GET /mobile/responses/{id_de_alpha}` desde la sesión de Beta debe retornar 403 o 404.

**Sistemas afectados:** Mobile App → Backend (sync) → (CMS admin verifica resultado)

> **Flujo cross-sistema completo:**
> 1. **Mobile offline:** Alpha llena encuesta → se guarda en `SQLite` → queda en `sync_queue (status=pending)`
> 2. **Mobile sync:** Al detectar conectividad → `POST /mobile/responses/batch` con `{client_id: UUID, user_id: alpha, answers: [...]}`
> 3. **Backend:** almacena en `survey_responses` con `user_id = alpha`. UNIQUE en `client_id` → dedup automático.
> 4. **Verificación cross-brigadista:** `GET /mobile/responses` con token de beta → backend filtra por `user_id = beta` → respuesta de alpha no aparece
> 5. **CMS admin:** puede ver ambas respuestas con `GET /admin/responses?survey_id=X` (tiene `view_all_responses`)

### Preparación
- [ ] Confirmar que ambos brigadistas están asignados al grupo 18 via `GET /assignments/groups/18` (con admin token)
- [ ] Confirmar que la encuesta del grupo 18 tiene al menos 1 versión publicada
- [ ] La app mobile de alpha debe estar instalada y alpha debe tener al menos 1 asignación visible

### Pasos — Mobile (Maestro o manual)

> **Automatizado:** `tests/maestro/permission-brigadista-isolation.yaml`

1. - [ ] Abrir la app con `qa.brigadista.alpha@qa.brigada.com` / `QABrigada2026!`  
   → **Esperado:** App carga, aparece la asignación del grupo 18

2. - [ ] Sin conexión (modo avión): llenar la encuesta completa incluyendo texto identificador **"ALPHA_RESPONSE_SCEN15"** en algún campo de texto  
   → Respuesta queda en SQLite (`sync_queue status=pending`)

3. - [ ] Activar red → esperar sincronización (max 2 min o forzar abriendo la app desde background)  
   → **Esperado:** Queue item pasa de `pending` → `completed`

4. - [ ] Cerrar sesión y entrar con `qa.brigadista.beta@qa.brigada.com` / `QABrigada2026!`  
   → **Esperado:** La lista de respuestas de beta NO muestra el texto "ALPHA_RESPONSE_SCEN15"

### Pasos — API

5. - [ ] `POST /auth/login` como `qa.brigadista.alpha@qa.brigada.com` → guardar `token_alpha`

6. - [ ] `POST /mobile/responses/batch` con `token_alpha`:  
   ```json
   {
     "responses": [{
       "client_id": "<uuid-v4-nuevo>",
       "survey_version_id": <version_id>,
       "answers": [{"question_id": 1, "value": "ALPHA_RESPONSE_SCEN15"}],
       "submitted_at": "<ISO8601>"
     }]
   }
   ```
   → **Esperado:** HTTP 200, `status: "ok"` o `status: "duplicate"` (ambos son éxito) — anotar `response_id`

7. - [ ] `GET /mobile/responses` con `token_alpha`  
   → **Esperado:** Lista incluye la respuesta recién sincronizada ✅

8. - [ ] `POST /auth/login` como `qa.brigadista.beta@qa.brigada.com` → guardar `token_beta`

9. - [ ] `GET /mobile/responses` con `token_beta`  
   → **Esperado:** Lista **NO contiene** la respuesta de alpha ✅

10. - [ ] `GET /mobile/responses/<response_id_de_alpha>` con `token_beta`  
    → **Esperado:** HTTP 403 o 404 ❌ (acceso cross-brigadista bloqueado)

### Pasos — CMS (verificación cross-sistema)

11. - [ ] `POST /auth/login` con admin → `GET /admin/responses?survey_id=<id_encuesta_grupo18>`  
    → **Esperado:** Admin ve AMBAS respuestas (alpha y beta) ✅  
    → Si el admin no ve la respuesta de alpha: bug en `POST /mobile/responses/batch`

### ✅ Pasa si
- Sync queue mobile → `completed` tras conectividad
- Cada brigadista solo ve sus propias respuestas vía `/mobile/responses`
- Acceso a respuesta del otro → 403 o 404
- Admin CMS ve ambas respuestas

### ❌ Falla si
- `GET /mobile/responses` de beta incluye respuestas de alpha
- `GET /mobile/responses/<alpha_id>` desde beta → 200
- Sync queue queda en `dead_letter` → revisar logs de `/mobile/responses/batch`
- Admin CMS no ve la respuesta (sync nunca llegó al backend)

---

## SCEN-16 — Aislamiento de Scope entre Encargados

**Riesgo:** Alpha tiene "QA — Grupo Alpha" (id=16), Beta tiene "QA — Grupo Beta" (id=17). Grupos completamente separados. Cada encargado debe ver SOLO su grupo.

**Sistemas afectados:** CMS (creación de grupos) → Backend (scope enforcement) → Mobile App (vista de encargado)

> **Flujo cross-sistema completo:**
> 1. **CMS admin** crea los grupos con `POST /assignments/team (target_role=encargado)` asignando `enc.alpha` al grupo 16 y `enc.beta` al grupo 17
> 2. **Backend** almacena `assignment_group_members` vinculando cada encargado a su grupo
> 3. **Backend scope:** `GET /assignments/groups` con token de encargado filtra por `user_id` del token → solo sus grupos asignados
> 4. **Mobile app** (si el encargado usa la app): `GET /mobile/assignments` también filtra por scope del encargado
> 5. **CMS encargado** (si el rol tiene `access_cms`): ve solo sus grupos en el dashboard

### Preparación
- [ ] Con admin: `GET /assignments/groups/16` y `/17` → confirmar que existen con los encargados correctos
- [ ] Con admin: `GET /users?email=qa.encargado.alpha@qa.brigada.com` → anotar user_id de alpha para verificar membership

### Pasos — API

1. - [ ] `POST /auth/login` como `qa.encargado.alpha@qa.brigada.com` → guardar `token_alpha`

2. - [ ] `GET /assignments/groups` con `token_alpha`  
   → **Esperado:** Lista contiene **solo** "QA — Grupo Alpha" (id=16) — **NO "QA — Grupo Beta"** ✅

3. - [ ] `GET /assignments/groups/17` (grupo de Beta) con `token_alpha`  
   → **Esperado:** HTTP 403 o 404 ❌

4. - [ ] `GET /admin/responses?group_id=17` con `token_alpha`  
   → **Esperado:** HTTP 403 o respuesta vacía ❌

5. - [ ] `GET /admin/responses?group_id=16` con `token_alpha`  
   → **Esperado:** HTTP 200, solo respuestas del grupo Alpha ✅

6. - [ ] `POST /auth/login` como `qa.encargado.beta@qa.brigada.com` → guardar `token_beta`

7. - [ ] `GET /assignments/groups` con `token_beta`  
   → **Esperado:** Lista contiene **solo** "QA — Grupo Beta" (id=17) — **NO "QA — Grupo Alpha"** ✅

8. - [ ] `GET /assignments/groups/16` (grupo de Alpha) con `token_beta`  
   → **Esperado:** HTTP 403 o 404 ❌

### Pasos — Mobile (Maestro o manual)

> **Automatizado:** `tests/maestro/permission-encargado-scope.yaml`

9. - [ ] Abrir la app con `qa.encargado.alpha@qa.brigada.com` / `QABrigada2026!`  
   → **Esperado:** Vista de grupos muestra "QA — Grupo Alpha" y **NO** "QA — Grupo Beta"

10. - [ ] Cerrar sesión → entrar con `qa.encargado.beta@qa.brigada.com`  
    → **Esperado:** Vista muestra "QA — Grupo Beta" y **NO** "QA — Grupo Alpha"

### Pasos — CMS (verificación cross-sistema)

11. - [ ] Login como `qa.encargado.alpha@qa.brigada.com` en `http://localhost:3100` (si el rol tiene `access_cms`)  
    → **Esperado:** Dashboard de asignaciones muestra solo Grupo Alpha
    → Si el rol no tiene `access_cms`: login debe retornar 403 (ver SCEN-09)

12. - [ ] **Con admin:** `GET /admin/analytics/responses?group_id=16` vs `group_id=17` → confirmar segregación en analytics

### ✅ Pasa si
- `GET /assignments/groups` de cada encargado retorna exactamente 1 grupo (el propio)
- Acceso al grupo del otro → 403 o 404
- Mobile muestra solo el grupo correcto para cada encargado
- CMS (si aplica) no mezcla datos de grupos

### ❌ Falla si
- `GET /assignments/groups` devuelve todos los grupos del sistema
- `GET /assignments/groups/{otro_grupo_id}` → 200 (scope no verificado en detalle)
- Mobile muestra ambos grupos mezclados

---

## Resumen de Cobertura

| Escenario | Permiso clave que se prueba | Sistemas | Automatizado | Prioridad |
|-----------|-----------------------------|-----------|--------------|-----------|
| SCEN-01 | Todos los permisos sin `is_system` | Backend + CMS | Playwright + Postman | Alta |
| SCEN-02 | `publish_survey` bloqueado | Backend + CMS | Playwright + Postman | Alta |
| SCEN-03 | `create_survey` / `edit_survey` bloqueados | Backend + CMS | Playwright + Postman | Alta |
| SCEN-04 | Cero escrituras con todos los views | Backend + CMS | Playwright + Postman | Alta |
| SCEN-05 | `manage_brigadista_assignments` vs `manage_assignments` | Backend + CMS | Playwright + Postman | Media |
| SCEN-06 | `allowed_survey_ids` scope restriction | Backend + CMS | Playwright + Postman | Alta |
| SCEN-07 | `create_user_targets` scope | Backend + CMS | Playwright + Postman | Media |
| SCEN-08 | `edit_user_targets` scope | Backend + CMS | Playwright + Postman | Media |
| SCEN-09 | `access_cms` como permiso de login | Backend → CMS | Playwright + Postman | Alta |
| SCEN-10 | Dependencia implícita de `view_surveys` | Backend + CMS | Playwright + Postman | Media |
| SCEN-11 | `permissions=[]` no crashea | Backend → CMS | Playwright + Postman | Alta |
| SCEN-12 | Escalación con targets `["*"]` | Backend + CMS | Playwright + Postman | **Crítica** |
| SCEN-13 | Rol `is_active=False` + caché TTL 60s | Backend → CMS | Playwright + Postman | Alta |
| SCEN-14 | Usuario `is_active=False` | Backend → CMS | Playwright + Postman | Alta |
| SCEN-15 | Aislamiento entre brigadistas mismo grupo | Mobile + Backend + CMS | Maestro + Postman | Alta |
| SCEN-16 | Aislamiento entre encargados distintos grupos | CMS + Backend + Mobile | Maestro + Postman | Alta |

---

## Re-seeding / Limpieza

Si la data QA fue modificada durante las pruebas (usuarios editados, respuestas creadas, etc.), se puede resetear:

```bash
# 1. Ir al directorio del backend
cd /Users/dou1013/Documents/GithubProyects/brigadaBackEnd

# 2. Cleanup (desactiva usuarios y grupos QA)
venv/bin/python scripts/seed_qa_permissions.py --password admin123 --cleanup

# 3. Re-seed completo
venv/bin/python scripts/seed_qa_permissions.py --password admin123

# Esperado: 13 roles, 18 usuarios, 5 grupos creados
```

> ⚠️ **Nota:** Si se usó `DELETE /users` en vez de deactivate, el email puede quedar bloqueado por el soft-delete. Ver bug BE-USER-1.
