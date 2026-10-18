"""Builds the architecture diagrams in this folder.

    python3 docs/architecture/diagrams.py                     # rewrites the .svg files
    python3 docs/architecture/diagrams.py TEMPLATE.html OUT   # also builds a page with all of them

Edit the coordinates and labels below, run it, and commit the regenerated SVGs.
"""

import html
import sys
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent


def esc(text):
    return html.escape(str(text), quote=True)


def text_width(text, size=11, bold=True):
    return len(text) * size * (0.58 if bold else 0.54)


class Diagram:
    def __init__(self, key, width, height, label):
        self.key, self.w, self.h, self.label = key, width, height, label
        self.parts = []

    def add(self, svg):
        self.parts.append(svg)

    def zone(self, x, y, w, h, label):
        self.add(f'<rect class="dg-zone" x="{x}" y="{y}" width="{w}" height="{h}" rx="18"/>')
        self.add(f'<text class="dg-z" x="{x + 16}" y="{y + 24}">{esc(label)}</text>')

    def node(self, x, y, w, h, title, lines=(), kind="", mono=()):
        cls = {"": "dg-node", "acc": "dg-node dg-node-acc", "ext": "dg-node dg-node-ext",
               "ent": "dg-node dg-node-ent"}[kind]
        self.add(f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="14"/>')
        ty = y + 25
        self.add(f'<text class="dg-t" x="{x + 14}" y="{ty}">{esc(title)}</text>')
        if kind == "ent":
            self.add(f'<line class="dg-rule" x1="{x}" y1="{y + 36}" x2="{x + w}" y2="{y + 36}"/>')
            ty += 6
        for i, line in enumerate(lines):
            cls_line = "dg-m" if i in mono or line.startswith(("≈", "USD")) else "dg-s"
            self.add(f'<text class="{cls_line}" x="{x + 14}" y="{ty + 18 * (i + 1)}">{esc(line)}</text>')

    def edge(self, points, label=None, at=None, kind=""):
        cls = {"": "dg-edge", "acc": "dg-edge dg-edge-acc", "dep": "dg-edge dg-edge-dep",
               "ret": "dg-edge dg-edge-ret", "ext": "dg-edge dg-edge-ret"}[kind]
        marker = {"acc": "aa", "dep": "ad"}.get(kind, "a")
        pts = " ".join(f"{px},{py}" for px, py in points)
        self.add(f'<polyline class="{cls}" points="{pts}" marker-end="url(#{self.key}-{marker})"/>')
        if label:
            self.pill(at or points[len(points) // 2], label, kind)

    def pill(self, at, label, kind=""):
        x, y = at
        w = text_width(label) + 16
        cls = "dg-e dg-e-acc" if kind == "acc" else "dg-e dg-e-dep" if kind == "dep" else "dg-e"
        self.add(f'<rect class="dg-pill" x="{x - w / 2:.1f}" y="{y - 10}" width="{w:.1f}" height="20" rx="10"/>')
        self.add(f'<text class="{cls}" x="{x}" y="{y + 4}" text-anchor="middle">{esc(label)}</text>')

    def svg(self, standalone=False):
        defs = "".join(
            f'<marker id="{self.key}-{m}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
            f'markerHeight="7" orient="auto-start-reverse"><path class="{c}" d="M0,0 L10,5 L0,10 z"/></marker>'
            for m, c in (("a", "dg-mk"), ("aa", "dg-mk dg-mk-acc"), ("ad", "dg-mk dg-mk-dep"))
        )
        body = f"<defs>{defs}</defs>" + "".join(self.parts)
        attrs = f'viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{esc(self.label)}"'
        if standalone:
            return (f'<svg xmlns="http://www.w3.org/2000/svg" class="dg" {attrs} '
                    f'width="{self.w}" height="{self.h}"><style>{SVG_STYLE}</style>'
                    f'<rect class="dg-bg" width="{self.w}" height="{self.h}"/>{body}</svg>\n')
        return f'<svg class="dg" {attrs}>{body}</svg>'


# ---------------------------------------------------------------- 1. Vista física
fisica = Diagram("fis", 1260, 680,
                 "Vista física: los usuarios entran solo por CloudFront, que manda todo a una instancia EC2 "
                 "donde Docker Compose corre la web, la API y PostgreSQL; los datos viven en un volumen aparte "
                 "con snapshots cada noche y GitHub despliega con un rol OIDC.")
d = fisica
d.zone(252, 20, 984, 640, "AWS · us-east-1 · Free plan")
d.zone(520, 100, 700, 220, "EC2 t4g.small · Docker Compose · solo acepta a CloudFront")
d.node(24, 40, 190, 70, "OpenStreetMap", ["mapas y direcciones"], "ext")
d.node(24, 150, 190, 64, "Comensal", ["celular o navegador"], "ext")
d.node(24, 232, 190, 64, "Restaurante", ["navegador"], "ext")
d.node(24, 400, 190, 84, "GitHub", ["repo público", "Actions: CI y deploy"], "ext")
d.node(24, 560, 190, 70, "Equipo (6 personas)", ["docker compose local"], "ext")
d.node(282, 150, 180, 146, "CloudFront", ["HTTPS · *.cloudfront.net", "cachea solo /assets",
                                          "≈ USD 0 · free tier"], "acc")
d.node(540, 150, 180, 120, "web · nginx", ["la app de React", "manda /api a la API"], "acc")
d.node(780, 150, 180, 120, "api · FastAPI", ["Python 3.12", "migra la base al iniciar"], "acc")
d.node(1020, 150, 180, 120, "db · PostgreSQL 17", ["igual que en local", "sin puertos abiertos"], "acc")
d.node(540, 400, 180, 84, "IAM · rol de deploy", ["OIDC, sin claves", "solo la rama main"])
d.node(780, 400, 180, 84, "SSM Parameter Store", ["contraseña de la base", "cifrada · USD 0"])
d.node(1020, 400, 180, 84, "EBS · datos", ["8 GB · cifrado", "sobrevive al reemplazo"])
d.node(1020, 540, 180, 84, "Snapshots", ["Data Lifecycle Manager", "se guardan los últimos 7"])
d.node(282, 540, 180, 84, "AWS Budgets", ["alerta USD 15/mes", "por email al equipo"])
d.edge([(214, 182), (280, 182)], "HTTPS", (247, 182), "acc")
d.edge([(214, 264), (280, 264)], "HTTPS", (247, 264), "acc")
d.edge([(119, 150), (119, 112)], "mapa", (119, 131), "ext")
d.edge([(462, 210), (538, 210)], kind="acc")
d.pill((500, 190), "HTTP :80", "acc")
d.edge([(720, 210), (778, 210)], kind="acc")
d.pill((749, 190), "/api/*", "acc")
d.edge([(960, 210), (1018, 210)], kind="acc")
d.pill((989, 190), "SQL", "acc")
d.edge([(1110, 270), (1110, 398)], "guarda los datos", (1110, 360))
d.edge([(1110, 484), (1110, 538)], "cada noche", (1110, 511))
d.edge([(870, 322), (870, 398)], "lee la contraseña", (870, 360))
d.edge([(214, 442), (538, 442)], "asume el rol (OIDC)", (376, 442), "dep")
d.edge([(630, 400), (630, 322)], "deploy.sh por SSM", (630, 360), "dep")
d.edge([(119, 560), (119, 486)], "push · PR", (119, 523))

# ---------------------------------------------------------------- 2. Recorrido de una solicitud
seq = Diagram("seq", 1000, 588,
              "Recorrido de una solicitud: CloudFront pide la página a nginx en la instancia y guarda los "
              "archivos de /assets en el borde; los pedidos a /api pasan sin cache por nginx a la API y "
              "esta consulta PostgreSQL.")
d = seq
actors = [("Navegador", "comensal", 100), ("CloudFront", "borde, HTTPS", 300), ("web", "nginx", 480),
          ("api", "FastAPI", 680), ("db", "PostgreSQL", 880)]
d.add('<rect class="dg-band" x="20" y="86" width="960" height="202" rx="14"/>')
d.add('<text class="dg-z" x="36" y="108">1 · Abre la app</text>')
d.add('<rect class="dg-band" x="20" y="302" width="960" height="268" rx="14"/>')
d.add('<text class="dg-z" x="36" y="324">2 · Busca restaurantes</text>')
for name, sub, x in actors:
    d.add(f'<line class="dg-life" x1="{x}" y1="70" x2="{x}" y2="570"/>')
    d.add(f'<rect class="dg-node dg-node-acc" x="{x - 75}" y="18" width="150" height="52" rx="14"/>')
    d.add(f'<text class="dg-t" x="{x}" y="40" text-anchor="middle">{esc(name)}</text>')
    d.add(f'<text class="dg-s" x="{x}" y="58" text-anchor="middle">{esc(sub)}</text>')
messages = [
    (100, 300, 134, "GET /", "acc"), (300, 480, 162, "reenvía, sin cache", "acc"),
    (480, 300, 190, "index.html", "ret"), (300, 100, 218, "index.html", "ret"),
    (100, 300, 246, "GET /assets/… (JS, CSS)", "acc"), (300, 100, 274, "desde la cache del borde", "ret"),
    (100, 300, 352, "GET /api/restaurantes?precio=$$", "acc"), (300, 480, 380, "reenvía, sin cache", "acc"),
    (480, 680, 408, "/api → api:8000", "acc"), (680, 880, 436, "SELECT …", "acc"),
    (880, 680, 464, "filas", "ret"), (680, 480, 492, "JSON", "ret"), (480, 300, 520, "JSON", "ret"),
    (300, 100, 548, "JSON → React dibuja el mapa", "ret"),
]
for x1, x2, y, label, kind in messages:
    step = 6 if x2 > x1 else -6
    d.edge([(x1 + step, y), (x2 - step, y)], kind=kind)
    d.pill(((x1 + x2) / 2, y - 12), label, "acc" if kind == "acc" else "")

# ---------------------------------------------------------------- 3. Vista lógica
logica = Diagram("log", 1240, 560,
                 "Vista lógica: el frontend en React habla con la API por HTTP usando un cliente tipado que "
                 "se genera del contrato OpenAPI de FastAPI; la API valida, aplica reglas y persiste en PostgreSQL.")
d = logica
d.zone(20, 20, 420, 380, "Frontend · React + TypeScript (Vite)")
d.zone(760, 20, 300, 520, "Backend · FastAPI (Python 3.12)")
d.node(44, 64, 372, 64, "Páginas", ["src/pages · rutas con React Router"], mono=(0,))
d.node(44, 164, 176, 84, "Sistema de diseño", ["src/components", "marca, UI, pedido…"], mono=(0,))
d.node(240, 164, 176, 84, "Datos del servidor", ["TanStack Query", "cache y reintentos"])
d.node(44, 284, 372, 64, "Cliente API tipado", ["src/api/client.ts · openapi-fetch"], "acc", mono=(0,))
d.node(480, 420, 220, 100, "Contrato OpenAPI", ["openapi.json + schema.d.ts", "make api-types lo genera",
                                                  "CI verifica que esté al día"], "acc", mono=(0,))
d.node(784, 64, 252, 64, "Routers /api", ["app/api · uno por recurso"], "acc", mono=(0,))
d.node(784, 158, 252, 64, "Validación", ["app/schemas · Pydantic → 400"], mono=(0,))
d.node(784, 252, 252, 64, "Reglas de negocio", ["app/services"], mono=(0,))
d.node(784, 346, 252, 64, "Modelos", ["app/models · SQLAlchemy 2"], mono=(0,))
d.node(784, 446, 252, 64, "Migraciones", ["migrations · Alembic"], mono=(0,))
d.node(1100, 300, 120, 84, "PostgreSQL", ["17 · Docker"], "acc")
d.edge([(230, 128), (130, 128), (130, 162)], "usa", (180, 128))
d.edge([(330, 128), (330, 162)])
d.pill((352, 146), "pide datos")
d.edge([(328, 248), (328, 282)], "llama", (328, 266))
d.edge([(416, 316), (740, 316), (740, 96), (782, 96)], "HTTP JSON · /api/*", (578, 316), "acc")
for y1, y2 in ((128, 156), (222, 250), (316, 344)):
    d.edge([(910, y1), (910, y2)])
d.edge([(1036, 378), (1070, 378), (1070, 342), (1098, 342)], "SQL", (1070, 360))
d.edge([(1036, 478), (1160, 478), (1160, 386)], "crea tablas", (1098, 478))
d.edge([(760, 470), (702, 470)], kind="dep")
d.pill((731, 448), "genera", "dep")
d.edge([(480, 470), (230, 470), (230, 350)], "tipa el cliente", (355, 470), "dep")

# ---------------------------------------------------------------- 4. CI/CD
cicd = Diagram("cic", 1200, 380,
               "Del código a producción: cada US va en una rama y un PR con CI y revisión; al mergear a main, "
               "GitHub Actions asume un rol temporal y por SSM le pide a la instancia que baje el commit y "
               "rearme sus contenedores.")
d = cicd
d.zone(10, 16, 1180, 150, "Cada cambio")
d.zone(10, 186, 1180, 180, "Al mergear a main")
row = [("Rama por US", ["002-us5-mapa"], ""), ("Pull request", ["plantilla + uso de IA"], ""),
       ("CI en GitHub", ["backend · frontend · infra", "sin atribución a IA"], "acc"),
       ("Revisión cruzada", ["otro integrante lo entiende"], ""), ("Merge a main", ["historial atómico"], "")]
for i, (title, lines, kind) in enumerate(row):
    d.node(30 + i * 232, 52, 200, 92, title, lines, kind, mono=(0,) if i == 0 else ())
    if i:
        d.edge([(30 + i * 232 - 30, 98), (30 + i * 232 - 2, 98)])
d.node(958, 238, 200, 84, "Deploy", ["GitHub Actions"], "acc")
d.node(706, 238, 200, 84, "Rol OIDC", ["credenciales temporales"])
d.node(430, 224, 230, 112, "deploy.sh en la instancia", ["por SSM Run Command", "baja el commit de main",
                                                         "rearma los contenedores"])
d.node(150, 238, 220, 84, "App en línea", ["https://….cloudfront.net", "migraciones al iniciar"],
       "acc", mono=(0,))
d.edge([(1058, 144), (1058, 236)], "si cambió backend, frontend o infra/ec2", (1048, 176), "dep")
d.edge([(958, 280), (908, 280)], kind="dep")
d.edge([(706, 280), (662, 280)], kind="dep")
d.edge([(430, 280), (372, 280)], kind="dep")

# ---------------------------------------------------------------- 5. Flujo SDD
sdd = Diagram("sdd", 1090, 350,
              "Flujo de Spec-Driven Development: el equipo y la PO definen y validan, el agente de IA "
              "escribe spec, plan, tareas y código con Spec Kit, y todo vuelve al equipo por PR y revisión.")
d = sdd
steps = [("Backlog", ["historias en la planilla"], "EQUIPO"),
         ("spec.md", ["/speckit-specify", "en español"], "AGENTE IA"),
         ("Valida la PO", ["criterios y dudas"], "PO"),
         ("Plan", ["/speckit-plan", "constitución + mapa de tests"], "AGENTE IA"),
         ("Tareas", ["/speckit-tasks", "tests primero"], "AGENTE IA"),
         ("Código y tests", ["/speckit-implement", "/speckit-converge"], "AGENTE IA"),
         ("PR, CI y revisión", ["uso de IA declarado", "otro integrante revisa"], "EQUIPO"),
         ("Demo a la PO", ["review del miércoles"], "EQUIPO + PO")]
cols = [30, 300, 570, 840]
for i, (title, lines, who) in enumerate(steps):
    row = i // 4
    x = cols[i % 4] if row == 0 else cols[3 - i % 4]
    y = 40 if row == 0 else 216
    agent = who == "AGENTE IA"
    d.node(x, y, 220, 104, title, lines, "acc" if agent else "",
           mono=tuple(j for j, line in enumerate(lines) if line.startswith("/")))
    chip_w = text_width(who, 10) + 16
    d.add(f'<rect class="dg-chip{' dg-chip-acc' if agent else ''}" x="{x + 220 - 12 - chip_w:.1f}" '
          f'y="{y + 12}" width="{chip_w:.1f}" height="18" rx="9"/>')
    d.add(f'<text class="dg-chip-t{' dg-e-acc' if agent else ''}" x="{x + 220 - 12 - chip_w / 2:.1f}" '
          f'y="{y + 25}" text-anchor="middle">{esc(who)}</text>')
for i in range(1, 8):
    if i < 4:
        d.edge([(cols[i - 1] + 220, 92), (cols[i] - 2, 92)])
    elif i == 4:
        d.edge([(950, 144), (950, 214)])
    else:
        d.edge([(cols[3 - (i - 1) % 4], 268), (cols[3 - i % 4] + 222, 268)])
d.add('<text class="dg-s" x="30" y="342">Si algo cambia el comportamiento, primero se actualiza la spec y la vuelve a validar la PO.</text>')

# ---------------------------------------------------------------- 6. Mapa del repositorio
repo = Diagram("rep", 1240, 450,
               "Mapa del repositorio: producto y cátedra, instrucciones para agentes, código y "
               "automatización; los agentes leen la documentación y escriben el código, que CI y Terraform llevan a AWS.")
d = repo
groups = [
    (20, "Producto y cátedra", [("specs/", "requisitos por funcionalidad"), ("docs/product/", "visión, backlog, plan"),
                                ("docs/catedra/", "reglas del TP"), ("docs/decisions/", "decisiones (ADR)"),
                                ("docs/architecture/", "estos diagramas"), ("docs/design/", "identidad visual")]),
    (340, "Agentes de IA", [("AGENTS.md", "instrucciones para todos"), ("CLAUDE.md", "importa AGENTS.md"),
                           (".specify/", "constitución y plantillas"), (".claude/ · .agents/", "comandos Spec Kit"),
                           (".github/skills/", "comandos para Copilot"), (".gemini/", "comandos para Gemini")]),
    (660, "Código", [("backend/", "FastAPI, modelos y tests"), ("frontend/", "React y sistema de diseño"),
                     ("docker-compose.yml", "entorno local completo"), ("Makefile", "make up · lint · test")]),
    (980, "Infra y automatización", [("infra/terraform/", "todo lo de AWS"), ("infra/ec2/", "compose de producción"),
                                     (".github/workflows/", "CI, deploy, atribución"),
                                     ("scripts/", "exporta el backlog")]),
]
for gx, title, items in groups:
    d.zone(gx, 20, 240 if gx == 980 else 270, 410, title)
    for i, (name, desc) in enumerate(items):
        y = 54 + i * 60
        d.add(f'<rect class="dg-node" x="{gx + 14}" y="{y}" width="{212 if gx == 980 else 242}" '
              f'height="50" rx="12"/>')
        d.add(f'<text class="dg-mono-t" x="{gx + 28}" y="{y + 21}">{esc(name)}</text>')
        d.add(f'<text class="dg-s" x="{gx + 28}" y="{y + 39}">{esc(desc)}</text>')
d.edge([(338, 80), (292, 80)], "lee", (315, 62))
d.edge([(612, 80), (658, 80)], "escribe", (635, 62))
d.edge([(932, 80), (978, 80)], kind="dep")
d.pill((955, 62), "despliega", "dep")

# ---------------------------------------------------------------- 7. Modelo de dominio
dominio = Diagram("dom", 1160, 610,
                  "Modelo de dominio conceptual: un comensal hace reservas en un restaurante; una reserva puede "
                  "tener un pedido con ítems de platos y un pago; el restaurante define turnos, mesas, bloqueos, "
                  "platos y promociones; las reseñas son sobre reservas realizadas.")
d = dominio
d.node(40, 40, 200, 86, "Comensal", ["email (usuario)", "contraseña (hash)"], "ent")
d.node(330, 40, 200, 122, "Reserva", ["fecha y hora", "personas", "mesa y tipo", "estado"], "ent")
d.node(620, 40, 200, 122, "Restaurante", ["nombre, CUIT, teléfono", "ubicación", "nivel de precio",
                                          "restricciones"], "ent")
d.node(930, 20, 200, 86, "Turno", ["día, inicio y fin", "capacidad"], "ent")
d.node(930, 120, 200, 104, "Grupo de mesas", ["capacidad × cantidad", "adentro, afuera…", "disponible"], "ent")
d.node(930, 238, 200, 70, "Bloqueo", ["fecha o franja"], "ent")
d.node(930, 330, 200, 86, "Promoción", ["vigencia", "platos o condiciones"], "ent")
d.node(40, 300, 200, 140, "Reseña", ["rating 1–5", "comentario y fotos", "gasto por persona",
                                     "respuesta del local"], "ent")
d.node(330, 300, 200, 86, "Pedido", ["hora de llegada", "total"], "ent")
d.node(620, 300, 200, 122, "Plato", ["categoría y precio", "tiempo de preparación", "restricciones",
                                     "disponible"], "ent")
d.node(240, 480, 200, 104, "Pago", ["efectivo o electrónico", "pagado / pendiente", "seña"], "ent")
d.node(560, 480, 200, 86, "Ítem de pedido", ["cantidad", "precio pactado"], "ent")
d.edge([(240, 90), (328, 90)], "hace · 1:N", (284, 72))
d.edge([(530, 90), (618, 90)], "en · N:1", (574, 72))
d.edge([(140, 126), (140, 298)], "escribe · 1:N", (140, 212))
d.edge([(240, 340), (285, 340), (285, 140), (328, 140)], "sobre · 1:1", (285, 240))
d.edge([(430, 162), (430, 298)], "puede tener · 1:0..1", (430, 232))
d.edge([(380, 386), (380, 478)], "1:0..1", (380, 432))
d.edge([(480, 386), (480, 444), (660, 444), (660, 478)], "incluye · 1:N", (570, 444))
d.edge([(740, 480), (740, 424)], "N:1", (740, 452))
d.edge([(720, 162), (720, 298)], "ofrece · 1:N", (720, 232))
d.edge([(820, 100), (876, 100)])
d.add('<polyline class="dg-edge" points="876,63 876,373"/>')
for y in (63, 172, 273, 373):
    d.edge([(876, y), (928, y)])
d.pill((876, 120), "tiene · 1:N")
d.edge([(930, 400), (822, 400)], "aplica a", (876, 400))

DIAGRAMS = [
    ("01-vista-fisica", fisica), ("02-recorrido-solicitud", seq), ("03-vista-logica", logica),
    ("04-ci-cd", cicd), ("05-flujo-sdd", sdd), ("06-mapa-repositorio", repo), ("07-modelo-dominio", dominio),
]

TOKENS_LIGHT = {"bg": "#fdf9ee", "surface": "#ffffff", "zone": "#f6eedd", "ink": "#3b1f18",
                "muted": "#6b4a40", "line": "#dccdb2", "accent": "#c23d17", "deploy": "#2563c9"}
TOKENS_DARK = {"bg": "#1d110d", "surface": "#2a1914", "zone": "#24150f", "ink": "#fbeee0",
               "muted": "#cdb5a6", "line": "#5a3b30", "accent": "#ff8d66", "deploy": "#8fb8ff"}

CLASSES = """
.dg { font-family: Nunito, 'Segoe UI', system-ui, sans-serif; }
.dg-bg { fill: var(--d-bg); }
.dg-zone { fill: var(--d-zone); stroke: var(--d-line); stroke-width: 1.5; stroke-dasharray: 6 5; }
.dg-band { fill: var(--d-zone); }
.dg-node { fill: var(--d-surface); stroke: var(--d-line); stroke-width: 1.5; }
.dg-node-acc { stroke: var(--d-accent); stroke-width: 2; }
.dg-node-ext { fill: var(--d-bg); stroke: var(--d-muted); stroke-dasharray: 4 3; }
.dg-node-ent { stroke: var(--d-ink); stroke-width: 1.5; }
.dg-rule { stroke: var(--d-line); stroke-width: 1.5; }
.dg-t { font-weight: 800; font-size: 13.5px; fill: var(--d-ink); }
.dg-s { font-weight: 600; font-size: 11.5px; fill: var(--d-muted); }
.dg-m { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 500; font-size: 11px; fill: var(--d-muted); }
.dg-mono-t { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; font-size: 12px; fill: var(--d-ink); }
.dg-z { font-weight: 800; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; fill: var(--d-muted); }
.dg-e { font-weight: 700; font-size: 11px; fill: var(--d-ink); }
.dg-e-acc { fill: var(--d-accent); }
.dg-e-dep { fill: var(--d-deploy); }
.dg-pill { fill: var(--d-bg); }
.dg-edge { fill: none; stroke: var(--d-muted); stroke-width: 1.6; }
.dg-edge-acc { stroke: var(--d-accent); stroke-width: 2; }
.dg-edge-dep { stroke: var(--d-deploy); stroke-width: 1.8; stroke-dasharray: 7 4; }
.dg-edge-ret { stroke-dasharray: 5 4; }
.dg-life { stroke: var(--d-line); stroke-width: 1.5; stroke-dasharray: 3 5; }
.dg-mk { fill: var(--d-muted); }
.dg-mk-acc { fill: var(--d-accent); }
.dg-mk-dep { fill: var(--d-deploy); }
.dg-chip { fill: var(--d-zone); }
.dg-chip-acc { fill: var(--d-bg); stroke: var(--d-accent); stroke-width: 1.2; }
.dg-chip-t { font-weight: 800; font-size: 10px; letter-spacing: .05em; fill: var(--d-muted); }
"""


def token_block(selector, tokens, extra=""):
    return selector + " { " + " ".join(f"--d-{k}: {v};" for k, v in tokens.items()) + extra + " }"


SVG_STYLE = (token_block("svg", TOKENS_LIGHT) + " @media (prefers-color-scheme: dark) { "
             + token_block("svg", TOKENS_DARK) + " } " + " ".join(CLASSES.split()))
SVG_STYLE = SVG_STYLE.replace("} .", "}\n.")

for name, diagram in DIAGRAMS:
    (OUT_DIR / f"{name}.svg").write_text(diagram.svg(standalone=True), encoding="utf-8")

if len(sys.argv) == 3:
    tokens = "\n".join([
        ":root { " + " ".join(f"--d-{k}: {v};" for k, v in TOKENS_LIGHT.items()) + " }",
        "@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { "
        + " ".join(f"--d-{k}: {v};" for k, v in TOKENS_DARK.items()) + " color-scheme: dark; } }",
        ":root[data-theme='dark'] { " + " ".join(f"--d-{k}: {v};" for k, v in TOKENS_DARK.items())
        + " color-scheme: dark; }",
        CLASSES,
    ])
    page = Path(sys.argv[1]).read_text(encoding="utf-8").replace("/*TOKENS*/", tokens)
    for slot, diagram in (("fisica", fisica), ("seq", seq), ("logica", logica), ("cicd", cicd),
                          ("sdd", sdd), ("repo", repo), ("dominio", dominio)):
        page = page.replace(f"<!--SVG:{slot}-->", diagram.svg())
    Path(sys.argv[2]).write_text(page, encoding="utf-8")
