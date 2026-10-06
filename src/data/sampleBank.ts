import type { QuestionBank } from '@/types/exam'

const t1 = 'Tema 1 · Modelos de memoria'
const t2 = 'Tema 2 · Memoria a largo plazo'
const t3 = 'Tema 3 · Olvido y recuperación'

/** Banco de ejemplo que se crea en el primer arranque para poder probar la app al instante */
export function createSampleBank(now = Date.now()): QuestionBank {
  return {
    id: 'sample-memoria',
    name: 'Psicología de la Memoria (demo)',
    subject: 'Psicología · Ejemplo',
    description: 'Banco de demostración con 12 preguntas en 3 temas. Bórralo cuando importes el tuyo.',
    rules: { penaltyWrong: 0.33, timeLimitMinutes: 15 },
    createdAt: now,
    updatedAt: now,
    questions: [
      {
        id: 'm1',
        topic: t1,
        text: '¿Qué autores propusieron el modelo multialmacén de la memoria (1968)?',
        options: ['Baddeley y Hitch', 'Atkinson y Shiffrin', 'Craik y Lockhart', 'Tulving y Thomson'],
        correct: 1,
        explanation:
          'Atkinson y Shiffrin describieron tres almacenes secuenciales: registro sensorial, memoria a corto plazo y memoria a largo plazo.',
      },
      {
        id: 'm2',
        topic: t1,
        text: 'En el modelo de memoria de trabajo de Baddeley, ¿qué componente coordina los recursos atencionales?',
        options: ['El bucle fonológico', 'La agenda visoespacial', 'El ejecutivo central', 'El retén episódico'],
        correct: 2,
        explanation:
          'El ejecutivo central es el sistema de control atencional que supervisa y coordina a los sistemas esclavos.',
      },
      {
        id: 'm3',
        topic: t1,
        text: 'Según Miller (1956), la capacidad de la memoria a corto plazo es de aproximadamente…',
        options: ['3 ± 1 elementos', '7 ± 2 elementos', '12 ± 3 elementos', 'Ilimitada'],
        correct: 1,
        explanation: 'El "mágico número siete, más o menos dos" describe la amplitud de la MCP medida en chunks.',
      },
      {
        id: 'm4',
        topic: t1,
        text: 'La teoría de los niveles de procesamiento sostiene que el recuerdo depende principalmente de…',
        options: [
          'El número de repeticiones',
          'La profundidad con la que se procesa la información',
          'El almacén en el que se guarda',
          'La modalidad sensorial de entrada',
        ],
        correct: 1,
        explanation:
          'Craik y Lockhart (1972): el procesamiento semántico (profundo) produce huellas más duraderas que el superficial.',
      },
      {
        id: 'm5',
        topic: t2,
        text: 'Recordar qué desayunaste ayer es un ejemplo de memoria…',
        options: ['Semántica', 'Procedimental', 'Episódica', 'Sensorial'],
        correct: 2,
        explanation: 'La memoria episódica (Tulving) almacena experiencias personales situadas en un tiempo y lugar.',
      },
      {
        id: 'm6',
        topic: t2,
        text: 'Montar en bicicleta depende sobre todo de la memoria…',
        options: ['Declarativa', 'Procedimental', 'Episódica', 'Icónica'],
        correct: 1,
        explanation: 'Las habilidades motoras automatizadas forman parte de la memoria procedimental (no declarativa).',
      },
      {
        id: 'm7',
        topic: t2,
        text: 'El efecto de primacía en la curva de posición serial se atribuye a…',
        options: [
          'La memoria a corto plazo',
          'El mayor repaso de los primeros elementos, que pasan a la MLP',
          'La interferencia retroactiva',
          'El registro sensorial',
        ],
        correct: 1,
        explanation: 'Los primeros ítems reciben más repaso y se transfieren a la memoria a largo plazo.',
      },
      {
        id: 'm8',
        topic: t2,
        text: 'El priming (facilitación) es un fenómeno característico de la memoria…',
        options: ['Implícita', 'Explícita', 'Episódica', 'De trabajo'],
        correct: 0,
        explanation: 'El priming ocurre sin recuerdo consciente del episodio de aprendizaje: es memoria implícita.',
      },
      {
        id: 'm9',
        topic: t3,
        text: '¿Quién describió por primera vez la curva del olvido?',
        options: ['Bartlett', 'Ebbinghaus', 'Loftus', 'James'],
        correct: 1,
        explanation: 'Hermann Ebbinghaus (1885) estudió sílabas sin sentido y describió la pérdida rápida inicial.',
      },
      {
        id: 'm10',
        topic: t3,
        text: 'Cuando un aprendizaje nuevo dificulta el recuerdo de uno antiguo hablamos de interferencia…',
        options: ['Proactiva', 'Retroactiva', 'Semántica', 'Contextual'],
        correct: 1,
        explanation: 'Retroactiva: lo nuevo actúa "hacia atrás". Proactiva: lo antiguo perjudica lo nuevo.',
      },
      {
        id: 'm11',
        topic: t3,
        text: 'El principio de especificidad de la codificación afirma que el recuerdo mejora cuando…',
        options: [
          'Se estudia en sesiones masivas',
          'Las claves de recuperación coinciden con las presentes en la codificación',
          'Se usan imágenes mentales',
          'El material es emocional',
        ],
        correct: 1,
        explanation: 'Tulving y Thomson (1973): la eficacia de una clave depende de su solapamiento con la huella codificada.',
      },
      {
        id: 'm12',
        topic: t3,
        text: 'Practicar la recuperación (hacer tests) en lugar de releer produce mejor retención a largo plazo. ¿Cómo se llama este efecto?',
        options: ['Efecto de espaciado', 'Efecto test (testing effect)', 'Efecto Zeigarnik', 'Efecto de generación'],
        correct: 1,
        explanation:
          'El testing effect (Roediger y Karpicke, 2006) es la base del active recall que usa esta misma app.',
      },
    ],
  }
}
