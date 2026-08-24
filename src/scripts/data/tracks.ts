/*
 * Seed content for GUARDA.
 *
 * Ported mechanically from `guarda-prototipo/src/data/trilhas.js` — the same
 * tracks, modules, lessons and durations the Paper artboards were designed
 * against. Keys are English to match the schema; the content stays in
 * Portuguese because it is what the instructor actually wrote.
 *
 * `daysAgo` / `hoursAgo` are relative so the seed keeps producing believable
 * "published 2 days ago" copy no matter when it runs.
 */

export type SeedLesson = {
  title: string
  durationSec: number
  status: 'DRAFT' | 'PUBLISHED'
  description?: string | null
  daysAgo?: number | null
}

export type SeedModule = { title: string; lessons: SeedLesson[] }

export type SeedTrack = {
  slug: string
  title: string
  category: 'GUARD' | 'PASSING' | 'CONTROL' | 'SUBMISSIONS' | 'ESCAPES' | 'TAKEDOWNS'
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  published: boolean
  description: string
  modules: SeedModule[]
}

export type SeedOrphanLesson = Omit<SeedLesson, 'daysAgo'> & { hoursAgo: number }

export const TRACKS: SeedTrack[] = [
  {
    "slug": "passagem-pressao",
    "title": "Passagem de Guarda: Sistema de Pressão",
    "category": "PASSING",
    "level": "INTERMEDIATE",
    "published": true,
    "description": "A sequência completa que eu uso e ensino há doze anos, do controle inicial até a estabilização dos 100kg. Faça na ordem — cada aula assume a anterior.",
    "modules": [
      {
        "title": "Controle inicial",
        "lessons": [
          {
            "title": "Por que a sua passagem falha",
            "durationSec": 492,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 14
          },
          {
            "title": "A pegada no colarinho e no joelho",
            "durationSec": 764,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 14
          },
          {
            "title": "Postura: onde colocar o peso",
            "durationSec": 930,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 11
          },
          {
            "title": "Neutralizando o gancho da meia-guarda",
            "durationSec": 662,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 11
          }
        ]
      },
      {
        "title": "A passagem",
        "lessons": [
          {
            "title": "Toreando: o passo lateral",
            "durationSec": 980,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 8
          },
          {
            "title": "Knee cut: entrada e travamento",
            "durationSec": 1185,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 6
          },
          {
            "title": "Quebrando a estrutura da meia-guarda",
            "durationSec": 1112,
            "status": "PUBLISHED",
            "description": "O detalhe da pegada no colarinho que impede o adversário de recuperar o gancho. Treine essa antes de ir pra passagem propriamente dita.",
            "daysAgo": 4
          },
          {
            "title": "Estabilizando os 100kg em cima",
            "durationSec": 850,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 4
          },
          {
            "title": "Quando ele recompõe a guarda",
            "durationSec": 785,
            "status": "DRAFT",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Fechando a sequência",
        "lessons": [
          {
            "title": "Passando para a montada",
            "durationSec": 658,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Joelho na barriga: a transição que ninguém treina",
            "durationSec": 744,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Pegando as costas depois da passagem",
            "durationSec": 846,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Kimura de quem passou por cima",
            "durationSec": 820,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Amassando a meia-guarda invertida",
            "durationSec": 912,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "O erro de correr pra finalização",
            "durationSec": 695,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Passagem contra a guarda De La Riva",
            "durationSec": 1008,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Passagem contra a X-guard",
            "durationSec": 862,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Encadeando tudo: a sequência completa",
            "durationSec": 838,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "raspagens-meia-guarda",
    "title": "Raspagens da Meia-Guarda",
    "category": "GUARD",
    "level": "INTERMEDIATE",
    "published": true,
    "description": "A meia-guarda é onde a maioria das lutas trava. Aqui você aprende a sair de baixo com raspagem, não com força.",
    "modules": [
      {
        "title": "A base da meia-guarda",
        "lessons": [
          {
            "title": "O gancho que sustenta tudo",
            "durationSec": 680,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Pegada no tornozelo e no colarinho",
            "durationSec": 725,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Raspagem do gancho: o tempo certo",
            "durationSec": 802,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": 9
          },
          {
            "title": "Levantando com a cabeça de fora",
            "durationSec": 880,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Raspagem contra quem senta no calcanhar",
            "durationSec": 778,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Quando ele afunda o quadril",
            "durationSec": 795,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Meia-guarda profunda",
        "lessons": [
          {
            "title": "Entrando na meia profunda sem levar pressão",
            "durationSec": 910,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "A raspagem que derruba pelo lado cego",
            "durationSec": 824,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Waiter sweep: o giro por baixo",
            "durationSec": 868,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Saindo pelas costas da meia profunda",
            "durationSec": 756,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Meia-guarda com lapela",
            "durationSec": 832,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Encadeando as três raspagens",
            "durationSec": 770,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "fundamentos-guarda-fechada",
    "title": "Fundamentos da Guarda Fechada",
    "category": "GUARD",
    "level": "BEGINNER",
    "published": true,
    "description": "O professor recomenda começar por aqui quem tá na faixa azul. Base, postura e as raspagens que resolvem a maior parte das situações — na ordem que ele ensina no tatame.",
    "modules": [
      {
        "title": "Postura e pegadas",
        "lessons": [
          {
            "title": "A guarda fechada começa nos pés",
            "durationSec": 615,
            "status": "PUBLISHED",
            "description": "Antes de qualquer pegada: onde os seus pés se cruzam e por que isso decide se a guarda abre ou não.",
            "daysAgo": null
          },
          {
            "title": "Pegadas: colarinho, manga e punho",
            "durationSec": 750,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Quebrando a postura dele",
            "durationSec": 785,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Como não deixar ele abrir sua guarda",
            "durationSec": 708,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Recuperando a guarda quando ele levanta",
            "durationSec": 742,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "O quadril manda, não o braço",
            "durationSec": 640,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Raspagens essenciais",
        "lessons": [
          {
            "title": "Raspagem de tesoura sem perder a pegada",
            "durationSec": 775,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Flower sweep: o braço e a perna juntos",
            "durationSec": 798,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Raspagem de quadril quando ele fica de pé",
            "durationSec": 842,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Hip bump: subindo pelo cotovelo",
            "durationSec": 690,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Raspagem contra quem abre a base",
            "durationSec": 764,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Escolhendo a raspagem pela reação dele",
            "durationSec": 806,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Finalizações da guarda fechada",
        "lessons": [
          {
            "title": "Armlock: o detalhe do ângulo",
            "durationSec": 740,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Triângulo a partir da pegada de manga",
            "durationSec": 815,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Kimura sem abrir a guarda",
            "durationSec": 768,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Omoplata: entrando pelo lado fraco",
            "durationSec": 850,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Estrangulamento de lapela cruzada",
            "durationSec": 832,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Ligando armlock, triângulo e omoplata",
            "durationSec": 785,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Guarda fechada no combate real",
        "lessons": [
          {
            "title": "Guarda fechada contra quem passa por cima",
            "durationSec": 790,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "O que fazer quando ele te levanta",
            "durationSec": 746,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Guarda fechada contra o oponente maior",
            "durationSec": 824,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Segurando o ritmo da luta",
            "durationSec": 718,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Erros que todo faixa branca comete aqui",
            "durationSec": 755,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Revisão: a guarda fechada completa",
            "durationSec": 762,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "ataques-costas",
    "title": "Ataques às Costas",
    "category": "CONTROL",
    "level": "INTERMEDIATE",
    "published": true,
    "description": "Chegar nas costas é fácil. Ficar lá é o que separa faixa azul de faixa marrom. Essa trilha é sobre controle antes de finalização.",
    "modules": [
      {
        "title": "Chegando nas costas",
        "lessons": [
          {
            "title": "De onde as costas realmente aparecem",
            "durationSec": 675,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "O gancho e o cinto: controle antes do ataque",
            "durationSec": 810,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Pegando as costas da tartaruga",
            "durationSec": 768,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Costas a partir da meia-guarda",
            "durationSec": 845,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Costas depois da passagem",
            "durationSec": 742,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Controle e manutenção",
        "lessons": [
          {
            "title": "Seat belt: a pegada que não solta",
            "durationSec": 760,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Mantendo os ganchos quando ele gira",
            "durationSec": 835,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Quando ele tenta escapar pelo lado",
            "durationSec": 738,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Body triangle: travando de vez",
            "durationSec": 870,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Recuperando as costas que você perdeu",
            "durationSec": 782,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Finalizações",
        "lessons": [
          {
            "title": "Mata-leão: a mão que ninguém defende",
            "durationSec": 860,
            "status": "PUBLISHED",
            "description": "A entrada da mão por baixo do queixo, no tempo em que ele está preocupado com o gancho. Detalhe fino, resultado grande.",
            "daysAgo": 2
          },
          {
            "title": "Estrangulamento de lapela nas costas",
            "durationSec": 790,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Armlock quando ele defende o pescoço",
            "durationSec": 755,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Crucifixo a partir da tartaruga",
            "durationSec": 828,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Encadeando mata-leão e lapela",
            "durationSec": 772,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Revisão: o sistema das costas",
            "durationSec": 650,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "de-la-riva",
    "title": "Guarda De La Riva",
    "category": "GUARD",
    "level": "ADVANCED",
    "published": true,
    "description": "A guarda que te deixa atacar as costas do chão. Exige detalhe fino de gancho e pegada — vá com calma nos primeiros módulos.",
    "modules": [
      {
        "title": "Entrando na De La Riva",
        "lessons": [
          {
            "title": "O gancho de la riva: onde ele trava",
            "durationSec": 730,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Pegada no tornozelo, na manga e na lapela",
            "durationSec": 805,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Entrando da guarda aberta",
            "durationSec": 720,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "De La Riva contra quem fica de pé",
            "durationSec": 760,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Não deixando ele tirar o gancho",
            "durationSec": 715,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "De La Riva quando ele ajoelha",
            "durationSec": 680,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Raspagens e costas",
        "lessons": [
          {
            "title": "Raspagem clássica da De La Riva",
            "durationSec": 735,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Berimbolo: o giro até as costas",
            "durationSec": 870,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Kiss of the dragon",
            "durationSec": 800,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Single leg a partir da De La Riva",
            "durationSec": 705,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Reverse De La Riva: o outro lado",
            "durationSec": 770,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Quando ele passa por cima do gancho",
            "durationSec": 665,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Ligando as raspagens da De La Riva",
            "durationSec": 700,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "quedas",
    "title": "Quedas para o Jiu Jitsu",
    "category": "TAKEDOWNS",
    "level": "BEGINNER",
    "published": true,
    "description": "Queda de jiu jitsu não é queda de judô. Pegada, base e as três quedas que funcionam de kimono com regra de jiu jitsu.",
    "modules": [
      {
        "title": "Pegadas e base",
        "lessons": [
          {
            "title": "A pega decide a queda",
            "durationSec": 860,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Base: onde fica seu peso em pé",
            "durationSec": 905,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Rompendo a pegada dele",
            "durationSec": 825,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Controle de punho e de manga",
            "durationSec": 878,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Andando no tatame sem se entregar",
            "durationSec": 792,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "O primeiro contato: quem pega primeiro",
            "durationSec": 720,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Quedas de alavanca",
        "lessons": [
          {
            "title": "Osoto gari com pegada de gola",
            "durationSec": 975,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Ippon seoi nage no jiu jitsu",
            "durationSec": 1040,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Uchi mata: o detalhe do quadril",
            "durationSec": 1008,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Tai otoshi contra quem resiste",
            "durationSec": 935,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Kouchi gari: a queda que ninguém vê",
            "durationSec": 772,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Ligando duas quedas na mesma pegada",
            "durationSec": 850,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Caindo por cima e já passando",
            "durationSec": 820,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Quedas de perna",
        "lessons": [
          {
            "title": "Double leg: entrada e finalização",
            "durationSec": 990,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Single leg na parede",
            "durationSec": 955,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Defendendo a queda sem sentar",
            "durationSec": 1030,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Puxando pra guarda quando a queda falha",
            "durationSec": 860,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Revisão: seu jogo em pé",
            "durationSec": 998,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "finalizacoes-cem-quilos",
    "title": "Finalizações do Cem Quilos",
    "category": "SUBMISSIONS",
    "level": "ADVANCED",
    "published": true,
    "description": "O cem quilos é a posição mais desconfortável do jiu jitsu pra quem está embaixo. Aqui é como transformar esse desconforto em finalização.",
    "modules": [
      {
        "title": "Controle do cem quilos",
        "lessons": [
          {
            "title": "O cem quilos que não deixa respirar",
            "durationSec": 730,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Pegada de cabeça e de braço",
            "durationSec": 695,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Trocando de lado sem perder o controle",
            "durationSec": 800,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Quando ele empurra o quadril",
            "durationSec": 725,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Subindo pra montada de lá",
            "durationSec": 770,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Finalizações",
        "lessons": [
          {
            "title": "Kimura do cem quilos",
            "durationSec": 765,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Armlock com a cabeça presa",
            "durationSec": 718,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Estrangulamento de papel cortado",
            "durationSec": 790,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Baseball choke a partir do cem quilos",
            "durationSec": 740,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Americana quando ele defende a kimura",
            "durationSec": 675,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Encadeando as finalizações",
            "durationSec": 692,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "defesas-montada",
    "title": "Defesas da Montada",
    "category": "ESCAPES",
    "level": "BEGINNER",
    "published": true,
    "description": "Todo mundo quer aprender a finalizar. Mas quem não sabe sair da montada não chega lá. Comece por aqui se você trava embaixo.",
    "modules": [
      {
        "title": "Não morrer embaixo",
        "lessons": [
          {
            "title": "A montada dói menos do que parece",
            "durationSec": 700,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Cotovelos dentro: a regra número um",
            "durationSec": 735,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Defendendo o estrangulamento primeiro",
            "durationSec": 785,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Criando espaço com o quadril",
            "durationSec": 768,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Quando ele sobe a montada alta",
            "durationSec": 810,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Respirando embaixo da pressão",
            "durationSec": 702,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Saindo da montada",
        "lessons": [
          {
            "title": "Elbow escape: o joelho que atravessa",
            "durationSec": 850,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Ponte e rola no tempo certo",
            "durationSec": 815,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Saindo pela meia-guarda",
            "durationSec": 860,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Escapando da montada alta",
            "durationSec": 775,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Recuperando a guarda fechada",
            "durationSec": 828,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Defesa de armlock e volta pra guarda",
            "durationSec": 790,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Encadeando ponte e elbow escape",
            "durationSec": 842,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  },
  {
    "slug": "berimbolo-do-zero",
    "title": "Berimbolo do Zero",
    "category": "GUARD",
    "level": "ADVANCED",
    "published": false,
    "description": "Trilha nova, ainda montando. A ideia é destravar o berimbolo pra quem nunca conseguiu fazer o giro completo.",
    "modules": [
      {
        "title": "Entendendo o berimbolo",
        "lessons": [
          {
            "title": "O que é o berimbolo, sem mistério",
            "durationSec": 750,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "A pegada no cinto e no tornozelo",
            "durationSec": 795,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "O giro: para onde a cabeça vai",
            "durationSec": 845,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Chegando na posição de costas",
            "durationSec": 760,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          }
        ]
      },
      {
        "title": "Do berimbolo pras costas",
        "lessons": [
          {
            "title": "Terminando o berimbolo nas costas",
            "durationSec": 800,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Leg drag quando o berimbolo falha",
            "durationSec": 775,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Berimbolo contra quem senta",
            "durationSec": 735,
            "status": "PUBLISHED",
            "description": null,
            "daysAgo": null
          },
          {
            "title": "Revisão: berimbolo do zero",
            "durationSec": 780,
            "status": "DRAFT",
            "description": null,
            "daysAgo": null
          }
        ]
      }
    ]
  }
]

/** Lessons the instructor recorded but has not slotted into a track yet. */
export const ORPHAN_LESSONS: SeedOrphanLesson[] = [
  {
    "title": "Single leg contra quem senta na guarda",
    "durationSec": 587,
    "status": "DRAFT",
    "description": "Rascunho. Gravei rápido depois do treino, preciso revisar o áudio antes de publicar.",
    "hoursAgo": 20
  },
  {
    "title": "Entrada no berimbolo sem perder o gancho",
    "durationSec": 1265,
    "status": "PUBLISHED",
    "description": "Aula solta, gravada no treino de sábado. Ainda vou encaixar na trilha da De La Riva.",
    "hoursAgo": 20
  }
]
