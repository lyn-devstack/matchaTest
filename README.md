# 🍵 matchaTest

**Creada por Leslie Carolyn.** Idea, diseño y concepto basados en sus propias necesidades y métodos de estudio como estudiante universitaria.

Simulador de exámenes tipo test **local-first** para estudiantes universitarios. Sin cuentas, sin backend: los bancos de preguntas, el historial y el mazo de repaso viven en el navegador (IndexedDB).

## Funcionalidades

- **Motor de reglas configurable**: puntos por acierto, penalización por fallo, descuento por blanca, nota de corte y tiempo límite.
  `Nota = (A·Pa − F·Pf − B·Pb) · 10 / (N·Pa)`. Con `Pa = 1` es la fórmula clásica `· 10/N`; la nota se limita a [0, 10].
- **Lector de guías docentes**: pega el texto o sube un PDF/TXT y detecta penalización ("cada tres incorrectas restan una correcta", "−0,25", "1/4"…), duración, nota de corte y nº de preguntas. Siempre muestra el fragmento en el que se basa cada valor.
- **Modos**: Simulacro real (cronómetro y sin corrección hasta entregar), Práctica (corrección inmediata, explicación y marcador de confianza) y Mazo de repaso (Leitner de 5 cajas con fallos, blancas y aciertos dudados).
- **Estadísticas**: historial, evolución de la nota, dominio por tema y tasa de aprobados.
- Atajos de teclado en el examen (`1-4`/`A-C`, `←/→`, `F` marcar, `D` dudosa, `S` seguro), la sesión se mantiene si recargas la página, y copia de seguridad para exportar/restaurar.

## Formatos de importación

**JSON**

```json
{
  "name": "Psicología de la Memoria",
  "subject": "Psicología · UNED",
  "rules": { "penaltyWrong": 0.33, "timeLimitMinutes": 90 },
  "questions": [
    {
      "text": "¿Quién propuso el modelo multialmacén?",
      "options": ["Baddeley", "Atkinson y Shiffrin", "Tulving"],
      "correct": 1,
      "explanation": "Atkinson y Shiffrin (1968).",
      "topic": "Tema 1"
    }
  ]
}
```

`correct` admite índice desde 0, letra (`"B"`) o el texto de la opción. También se acepta una lista de preguntas sin envoltorio, claves en español (`pregunta`, `opciones`, `respuesta`, `explicacion`, `tema`) y `{ "temas": [{ "nombre", "preguntas" }] }`.

**Markdown**

```markdown
# Nombre del banco
## Tema 1: Modelos de memoria

1. ¿Quién propuso el modelo multialmacén?
- [ ] Baddeley
- [x] Atkinson y Shiffrin
> Explicación opcional

2. Otra pregunta
a) opción
b) opción correcta *
Respuesta: B
```

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests unitarios (puntuación, importadores, parser de criterios, repaso)
npm run build      # typecheck + build de producción en dist/
```

Stack: Vue 3 (`<script setup>`) · Vite · TypeScript · Tailwind CSS · lucide-vue-next · idb. pdf.js se carga solo cuando subes un PDF.

## Despliegue gratuito

- **GitHub Pages**: sube el repo a GitHub, ve a *Settings → Pages → Source: GitHub Actions*. El workflow `.github/workflows/deploy.yml` hace build y publica en cada push a `main`.
- **Vercel / Netlify**: importa el repo. Build `npm run build`, salida `dist`. No hace falta configurar nada más: el router usa hash history y la base es relativa.

## Autoría y licencia

matchaTest es un proyecto de **Leslie Carolyn**: la idea, el diseño de la experiencia y el enfoque de estudio (active recall, repaso espaciado, simulacros con las reglas reales de cada asignatura) nacen de su manera de preparar los exámenes.

Se distribuye bajo licencia [MIT](LICENSE): puedes usarla, modificarla y compartirla, siempre que **conserves el aviso de copyright con su nombre** en todas las copias o versiones derivadas.

