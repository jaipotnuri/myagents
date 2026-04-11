# Modo: scan — Portal Scanner (Descubrimiento de Ofertas)

Escanea portales de empleo configurados, filtra por relevancia de título, y añade nuevas ofertas al pipeline para evaluación posterior.

## Ejecución recomendada

Ejecutar como subagente para no consumir contexto del main:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contenido de este archivo + datos específicos]",
    run_in_background=True
)
```

## Configuración

Leer `portals.yml` que contiene:
- `search_queries`: Lista de queries WebSearch con `site:` filters por portal (descubrimiento amplio)
- `tracked_companies`: Empresas específicas con `careers_url` para navegación directa
- `title_filter`: Keywords positive/negative/seniority_boost para filtrado de títulos

## Estrategia de descubrimiento (4 niveles)

### Nivel 1 — Chrome MCP directo (PRINCIPAL)

**Para cada empresa en `tracked_companies`** que NO sea Ashby ni Greenhouse (es decir: Lever, custom URL, Workday): Navegar a su `careers_url` con el Chrome MCP (`mcp__Claude_in_Chrome__navigate` + `mcp__Claude_in_Chrome__get_page_text`), leer todos los job listings, y extraer título + URL.

**IMPORTANTE — Cowork/Claude Desktop:** `browser_navigate` y `browser_snapshot` (Playwright) NO están disponibles en este entorno. Usar siempre los equivalentes del Chrome MCP:
- `browser_navigate` → `mcp__Claude_in_Chrome__navigate`
- `browser_snapshot` → `mcp__Claude_in_Chrome__get_page_text` (para texto) o `mcp__Claude_in_Chrome__read_page` (para snapshot DOM)

Level 1 se ejecuta **secuencialmente** (el Chrome MCP no soporta navegación paralela real).

### Nivel 1.5 — Ashby JSON API (RÁPIDO Y FIABLE)

Las empresas en Ashby tienen una API pública JSON que devuelve todos sus jobs en tiempo real — sin necesidad de navegar con el browser:

```
GET https://api.ashbyhq.com/posting-api/job-board/{slug}
```

donde `{slug}` es el último segmento de la `careers_url` de Ashby (ej: `jobs.ashbyhq.com/langchain` → slug `langchain`).

El JSON devuelve: `{ "jobs": [ { "title": "...", "jobUrl": "...", "isRemote": true/false, ... } ] }`

Usar este nivel (via WebFetch) para TODAS las empresas con `careers_url` que empiece por `https://jobs.ashbyhq.com/`. Es más rápido que Chrome MCP y no requiere navegación. Ejecutar en paralelo.

### Nivel 2 — Greenhouse API (COMPLEMENTARIO)

Para empresas con Greenhouse, la API JSON (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`) devuelve datos estructurados limpios. Usar para TODAS las `tracked_companies` con `api:` configurada. Ejecutar en paralelo.

### Nivel 3 — WebSearch queries (DESCUBRIMIENTO AMPLIO)

Dos sub-niveles:

**3a — Top-level `search_queries`** (cubren portales de forma transversal — bueno para descubrir empresas nuevas):
Para cada query en `search_queries` con `enabled: true` → ejecutar WebSearch.

**3b — Per-company `scan_query`** (coberturas específicas para empresas con `scan_method: websearch`):
Para cada empresa en `tracked_companies` con `scan_method: websearch` y `scan_query` definida → ejecutar WebSearch con su `scan_query`. Esto cubre: OpenAI, xAI, Groq, Lambda Labs, Databricks, Gong, Salesforce, Twilio, Dialpad, LivePerson, Genesys, Retool, Talkdesk, AI21, Hugging Face, Langfuse, Runway, y similares con URLs custom.

**Prioridad de ejecución:**
1. Nivel 1.5: Ashby API → todas las `tracked_companies` con Ashby `careers_url` (paralelo)
2. Nivel 2: Greenhouse API → todas las `tracked_companies` con `api:` (paralelo)
3. Nivel 1: Chrome MCP → `tracked_companies` restantes (Lever, custom URL) que no tienen API ni Ashby (secuencial)
4. Nivel 3a+3b: WebSearch → `search_queries` top-level + per-company `scan_query` (paralelo)

Los niveles son aditivos — se ejecutan todos, los resultados se mezclan y deduplicar.

## Workflow

1. **Leer configuración**: `portals.yml`
2. **Leer historial**: `data/scan-history.tsv` → URLs ya vistas
3. **Leer dedup sources**: `data/applications.md` + `data/pipeline.md`

4. **Nivel 1.5 — Ashby API** (paralelo):
   Para cada empresa en `tracked_companies` con `careers_url` que empiece por `https://jobs.ashbyhq.com/` y `enabled: true`:
   a. Extraer `{slug}` del último segmento de la URL (ej: `jobs.ashbyhq.com/langchain` → `langchain`)
   b. WebFetch → `https://api.ashbyhq.com/posting-api/job-board/{slug}`
   c. Parsear JSON → array `jobs[]` con campos `title` y `jobUrl`
   d. Para cada job extraer: `{title: job.title, url: job.jobUrl, company: nombre_empresa}`
   e. Si la respuesta devuelve 404 o no tiene `jobs`, intentar `mcp__Claude_in_Chrome__navigate` a la `careers_url` como fallback
   f. Acumular en lista de candidatos

5. **Nivel 2 — Greenhouse APIs** (paralelo):
   Para cada empresa en `tracked_companies` con `api:` definida y `enabled: true`:
   a. WebFetch de la URL de API → JSON con lista de jobs
   b. Para cada job extraer: `{title, url, company}`
   c. Acumular en lista de candidatos (dedup con Nivel 1.5)

5.5. **Nivel 1 — Chrome MCP** (secuencial, solo para lo que no cubrieron 1.5 y 2):
   Para cada empresa en `tracked_companies` con `enabled: true` que:
   - NO tiene `careers_url` de Ashby, Y
   - NO tiene `api:` de Greenhouse, Y
   - NO tiene `scan_method: websearch`
   (es decir: Lever, custom URL sin scan_method, Workday)
   a. `mcp__Claude_in_Chrome__navigate` a la `careers_url`
   b. `mcp__Claude_in_Chrome__get_page_text` para leer todos los job listings
   c. Si la página pagina resultados, navegar páginas adicionales
   d. Para cada job listing extraer: `{title, url, company}`
   e. Si falla (404, timeout), intentar `scan_query` del entry si existe, sino anotar para actualización
   f. Acumular en lista de candidatos

6. **Nivel 3 — WebSearch queries** (paralelo):

   **3a — Top-level queries:**
   Para cada query en `search_queries` con `enabled: true`:
   a. Ejecutar WebSearch con el `query` definido
   b. De cada resultado extraer: `{title, url, company}`
   c. Acumular en lista de candidatos

   **3b — Per-company scan_queries:**
   Para cada empresa en `tracked_companies` con `scan_method: websearch` y `scan_query` definida y `enabled: true`:
   a. Ejecutar WebSearch con el `scan_query` de esa empresa
   b. De cada resultado extraer: `{title, url, company}` usando el nombre de la empresa como `company`
   c. Acumular en lista de candidatos (dedup con niveles anteriores)

   **Extracción de título/empresa de resultados WebSearch:**
   - **title**: del título del resultado (antes del " @ " o " | " o " at ")
   - **url**: URL del resultado
   - **company**: después del " @ " en el título, o del nombre de empresa del entry si viene de 3b

6. **Filtrar por título** usando `title_filter` de `portals.yml`:
   - Al menos 1 keyword de `positive` debe aparecer en el título (case-insensitive)
   - 0 keywords de `negative` deben aparecer
   - `seniority_boost` keywords dan prioridad pero no son obligatorios

7. **Deduplicar** contra 3 fuentes:
   - `scan-history.tsv` → URL exacta ya vista
   - `applications.md` → empresa + rol normalizado ya evaluado
   - `pipeline.md` → URL exacta ya en pendientes o procesadas

7.5. **Verificar liveness de resultados de WebSearch (Nivel 3)** — ANTES de añadir a pipeline:

   Los resultados de WebSearch pueden estar desactualizados (Google cachea resultados durante semanas o meses). Para evitar evaluar ofertas expiradas, verificar con Chrome MCP cada URL nueva que provenga del Nivel 3. Los Niveles 1.5 y 2 son inherentemente en tiempo real y no requieren esta verificación.

   Para cada URL nueva de Nivel 3 (secuencial — solo una navegación Chrome a la vez):
   a. `mcp__Claude_in_Chrome__navigate` a la URL
   b. `mcp__Claude_in_Chrome__get_page_text` para leer el contenido
   c. Clasificar:
      - **Activa**: título del puesto visible + descripción del rol + botón Apply/Submit/Solicitar
      - **Expirada** (cualquiera de estas señales):
        - URL final contiene `?error=true` (Greenhouse redirige así cuando la oferta está cerrada)
        - Página contiene: "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found"
        - Solo navbar y footer visibles, sin contenido JD (contenido < ~300 chars)
   d. Si expirada: registrar en `scan-history.tsv` con status `skipped_expired` y descartar
   e. Si activa: continuar al paso 8

   **Alternativa rápida:** Para URLs de Greenhouse (`job-boards.greenhouse.io`) se puede usar WebFetch en lugar de Chrome MCP — si devuelve 200 con contenido y título del rol, está activa. Si redirige a `?error=true`, está cerrada.

   **No interrumpir el scan entero si una URL falla.** Si `mcp__Claude_in_Chrome__navigate` da error (timeout, 403, etc.), marcar como `skipped_expired` y continuar con la siguiente.

8. **Para cada oferta nueva verificada que pase filtros**:
   a. Añadir a `pipeline.md` sección "Pendientes": `- [ ] {url} | {company} | {title}`
   b. Registrar en `scan-history.tsv`: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`

9. **Ofertas filtradas por título**: registrar en `scan-history.tsv` con status `skipped_title`
10. **Ofertas duplicadas**: registrar con status `skipped_dup`
11. **Ofertas expiradas (Nivel 3)**: registrar con status `skipped_expired`

## Extracción de título y empresa de WebSearch results

Los resultados de WebSearch vienen en formato: `"Job Title @ Company"` o `"Job Title | Company"` o `"Job Title — Company"`.

Patrones de extracción por portal:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Regex genérico: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## URLs privadas

Si se encuentra una URL no accesible públicamente:
1. Guardar el JD en `jds/{company}-{role-slug}.md`
2. Añadir a pipeline.md como: `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`

## Scan History

`data/scan-history.tsv` trackea TODAS las URLs vistas:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## Resumen de salida

```
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries ejecutados: N
Ofertas encontradas: N total
Filtradas por título: N relevantes
Duplicadas: N (ya evaluadas o en pipeline)
Expiradas descartadas: N (links muertos, Nivel 3)
Nuevas añadidas a pipeline.md: N

  + {company} | {title} | {query_name}
  ...

→ Ejecuta /career-ops pipeline para evaluar las nuevas ofertas.
```

## Gestión de careers_url

Cada empresa en `tracked_companies` debe tener `careers_url` — la URL directa a su página de ofertas. Esto evita buscarlo cada vez.

**Patrones conocidos por plataforma:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` o `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **Custom:** La URL propia de la empresa (ej: `https://openai.com/careers`)

**Si `careers_url` no existe** para una empresa:
1. Intentar el patrón de su plataforma conocida
2. Si falla, hacer un WebSearch rápido: `"{company}" careers jobs`
3. Confirmar con WebFetch (para Ashby/Greenhouse APIs) o `mcp__Claude_in_Chrome__navigate` (para URLs custom)
4. **Guardar la URL encontrada en portals.yml** para futuros scans

**Si `careers_url` devuelve 404 o redirect:**
1. Anotar en el resumen de salida
2. Intentar scan_query como fallback
3. Marcar para actualización manual

## Auto-promoción de empresas nuevas a portals.yml

Cuando una empresa aparece en resultados de Nivel 3 (WebSearch) y **no está ya en `tracked_companies`**, promoverla automáticamente a portals.yml al final de cada scan. Esto evita depender de Google indefinidamente para empresas que claramente son relevantes.

### Cuándo promover

Promover una empresa nueva si:
- Al menos 1 de sus roles pasó el title filter, Y
- La URL es de una plataforma reconocida (Ashby, Greenhouse, Lever), Y
- La empresa no está ya en `tracked_companies` (check por nombre y por dominio de URL)

No promover si:
- La URL es de un agregador genérico (LinkedIn, Indeed, Glassdoor, Wellfound) — esos no tienen careers_url propia
- La empresa parece irrelevante o el rol fue el único match y es marginal

### Cómo determinar la config

Detectar la plataforma por el dominio de la URL del job:

| URL pattern | Platform | Config |
|-------------|----------|--------|
| `jobs.ashbyhq.com/{slug}/...` | Ashby | `careers_url: https://jobs.ashbyhq.com/{slug}` |
| `job-boards.greenhouse.io/{slug}/...` | Greenhouse | `careers_url` + `api: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| `job-boards.eu.greenhouse.io/{slug}/...` | Greenhouse EU | `careers_url` + `api: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| `jobs.lever.co/{slug}/...` | Lever | `careers_url: https://jobs.lever.co/{slug}` |
| custom domain | Custom | `careers_url` + `scan_method: websearch` + `scan_query: '"{company}" "AI Engineer" OR "ML Engineer" site:{domain}'` |

### Formato de entrada en portals.yml

Añadir al final de `tracked_companies`, bajo el bloque de comentario `# NEW — Discovered via Level 3 WebSearch {YYYY-MM-DD}`:

```yaml
  - name: {Company Name}
    careers_url: https://{platform}/{slug}
    api: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs   # solo si Greenhouse
    notes: "{location if known}. {one-line description}. Discovered via Level 3 {date}."
    enabled: true
```

### Al final del scan

Después de escribir pipeline.md y scan-history.tsv, añadir un bloque al resumen de salida:

```
Empresas nuevas promovidas a portals.yml: N
  + {Company} ({platform}) — {N} roles encontrados
```

Si N=0, omitir el bloque del resumen.

## Mantenimiento del portals.yml

- **SIEMPRE guardar `careers_url`** cuando se añade una empresa nueva
- Añadir nuevos queries según se descubran portales o roles interesantes
- Desactivar queries con `enabled: false` si generan demasiado ruido
- Ajustar keywords de filtrado según evolucionen los roles target
- Añadir empresas a `tracked_companies` cuando interese seguirlas de cerca
- Verificar `careers_url` periódicamente — las empresas cambian de plataforma ATS
