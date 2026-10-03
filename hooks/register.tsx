import { atom, read, update } from 'claude-code'
import type { CommandRunInput, CommandRunResult, EngineInterface, Register } from 'claude-code'

import type { Mood, Outfit, Pet, Species } from '../types'

const pet = atom({ plugin: 'pet', key: 'pet' } as const, null)
const mood = atom({ plugin: 'pet', key: 'mood' } as const, 'idle')
const say = atom({ plugin: 'pet', key: 'say' } as const, null)
const frame = atom({ plugin: 'pet', key: 'frame' } as const, 0)
const isHidden = atom({ plugin: 'pet', key: 'isHidden' } as const, false)
const typed = atom({ plugin: 'pet', key: 'typed' } as const, 0)
const lastComment = atom({ plugin: 'pet', key: 'comment' } as const, null)
const isQuiet = atom({ plugin: 'pet', key: 'isQuiet' } as const, false)

const STORE_KEY = 'pet'
const BIG_KEY = 'pet.isBig'
const PANE = 'pet'
const BUBBLE_LINES = 7
const PANE_BACKGROUND = '#101014'
const PANE_COLUMNS = 27 // the big sprites are 25 wide, plus a little air
const SPRITE_INDENT = ''
const HOUR = 60 * 60 * 1000
const SLEEPY_AFTER = 10 * 60 * 1000
const COMMENT_SHOWS_FOR = 25 * 1000
// New lines are typed out like an old adventure game.
const TYPE_MS = 35
// Animation: one tick every TICK_MS drives blinks, and flaps, head bobs and hops while it talks.
const TICK_MS = 300
// Chattiness: live model comments mid-turn, free quips on tools, idle small talk.
const LIVE_EVERY_TOOLS = 4
const LIVE_EVERY_MS = 40 * 1000
const QUIP_EVERY_MS = 12 * 1000
const QUIP_SHOWS_FOR = 5 * 1000
const CHATTER_EVERY_MS = 4 * 60 * 1000

const SPECIES: Species[] = ['cat', 'dog', 'bunny', 'duck', 'owl', 'dragon', 'blob', 'ghost', 'axolotl', 'flamingo']

// Each sprite: two frames, three rows. {e} is replaced by the eyes for the mood.
const SPRITES: Record<Species, [string[], string[]]> = {
  cat: [
    [' /\\_/\\ ', '( {e} )', ' > ^ < '],
    [' /\\_/\\ ', '( {e} )', ' >   <~'],
  ],
  duck: [
    ['  __   ', '<({e})_ ', '  \\___)'],
    ['  __   ', '<({e})_ ', ' ~\\___)'],
  ],
  blob: [
    ['  .--. ', ' ( {e})', '  `--` '],
    ['  .--. ', ' ({e} )', ' `----`'],
  ],
  ghost: [
    ['  .-.  ', ' ({e}) ', ' |/\\/| '],
    ['  .-.  ', ' ({e}) ', ' |\\/\\| '],
  ],
  dog: [
    [' /^ ^\\ ', '/ {e} \\', 'V\\ Y /V'],
    [' /^ ^\\ ', '/ {e} \\', 'V\\ Y /V~'],
  ],
  bunny: [
    [' (\\_/) ', ' ({e}) ', ' (")(")'],
    [' (\\(/) ', ' ({e}) ', ' (")(")'],
  ],
  owl: [
    [' {o,o} ', ' ({e}) ', ' -"-"- '],
    [' {o,o} ', ' ({e}) ', ' -"-"- '],
  ],
  dragon: [
    ['  /\\_  ', ' ({e})> ', ' /|_|\\~'],
    ['  /\\_  ', ' ({e})>~', ' /|_|\\ '],
  ],
  flamingo: [
    ['  __   ', ' ({e})>', '  \\|/  '],
    ['  __   ', ' ({e})>', '   |   '],
  ],
  axolotl: [
    ['\\\\ __ //', ' ({e}) ', '  (__)~'],
    ['// __ \\\\', ' ({e}) ', ' ~(__) '],
  ],
}


// Big sprites for the sidebar. L and R are the eyes, M the mouth.
const BIG: Record<Species, string[]> = {
  cat: [
    String.raw`     /\           /\     `,
    String.raw`    /  \_________/  \    `,
    String.raw`   /                 \   `,
    String.raw`  |     L       R     |  `,
    String.raw`  |  ==     M     ==  |  `,
    String.raw`  |  ==           ==  |  `,
    String.raw`   \                 /   `,
    String.raw`    '._____________.'    `,
    String.raw`     /             \     `,
    String.raw`    /   |       |   \    `,
    String.raw`   (    |       |    )~~ `,
    String.raw`    \___|_______|___/  ) `,
    String.raw`       (__)   (__)   ~~  `,
  ],
  duck: [
    String.raw`          ______         `,
    String.raw`        /        \        `,
    String.raw`       |   L    R |       `,
    String.raw`       |        M_|_____  `,
    String.raw`       |        ________> `,
    String.raw`        \       /         `,
    String.raw`   ______\     /______    `,
    String.raw`  /                   \   `,
    String.raw` |    \__________/     |  `,
    String.raw` |                     |  `,
    String.raw`  \___________________/   `,
    String.raw`         |     |          `,
    String.raw`       __|_   _|__        `,
  ],
  blob: [
    String.raw`        .--------.       `,
    String.raw`     .'            '.     `,
    String.raw`    /                \    `,
    String.raw`   /    L        R    \   `,
    String.raw`  |                    |  `,
    String.raw`  |         M          |  `,
    String.raw`  |                    |  `,
    String.raw`  |                    |  `,
    String.raw`   \                  /   `,
    String.raw`    '.              .'    `,
    String.raw`  ~~~~'------------'~~~~  `,
  ],
  dog: [
    String.raw`    __               __  `,
    String.raw`   /  \_____________/  \ `,
    String.raw`  |   /             \   |`,
    String.raw`  |  |    L     R    |  |`,
    String.raw`   \_|               |_/ `,
    String.raw`     |      ___      |   `,
    String.raw`     |     ( M )     |   `,
    String.raw`      \     \_/     /    `,
    String.raw`       '._________.'     `,
    String.raw`       /           \   /|`,
    String.raw`      |  |       |  |_/ /`,
    String.raw`       \_|_______|_/   / `,
    String.raw`        (__)   (__)      `,
  ],
  bunny: [
    String.raw`       (\         /)     `,
    String.raw`        \\       //      `,
    String.raw`         \\     //       `,
    String.raw`        .-'-----'-.      `,
    String.raw`       /           \     `,
    String.raw`      |   L     R   |    `,
    String.raw`      |      M      |    `,
    String.raw`      |    \_|_/    |    `,
    String.raw`       \           /     `,
    String.raw`      /'-.______.-'\     `,
    String.raw`     |   |      |   | () `,
    String.raw`      \_(")____(")_/     `,
  ],
  owl: [
    String.raw`     /\_____________/\   `,
    String.raw`    /                 \  `,
    String.raw`   |   .---.   .---.   | `,
    String.raw`   |  (  L  ) (  R  )  | `,
    String.raw`   |   '---' M '---'   | `,
    String.raw`   |        \/         | `,
    String.raw`    \   \/\/\/\/\/    /  `,
    String.raw`   /|   \/\/\/\/\/    |\ `,
    String.raw`  / |   \/\/\/\/\/    |\ `,
    String.raw`    \                 /  `,
    String.raw`     '-.___________.-'   `,
    String.raw`        ^^^     ^^^      `,
  ],
  dragon: [
    String.raw`      /\        /\       `,
    String.raw`     /  \______/  \      `,
    String.raw`    |              |  )  `,
    String.raw`    |   L      R   | ))  `,
    String.raw`    |       M      |___  `,
    String.raw`     \    ^^^^    /   >  `,
    String.raw`  /\  '.________.'        `,
    String.raw` /  \_/          \        `,
    String.raw`|    /  /\/\/\/\  \__     `,
    String.raw` \__|   \/\/\/\/   | \__  `,
    String.raw`     \____________/    \> `,
    String.raw`       (_)    (_)         `,
  ],
  flamingo: [
    String.raw`         .-----.         `,
    String.raw`        /       \        `,
    String.raw`       |  L   R  |___    `,
    String.raw`       |     M   ____)   `,
    String.raw`        \_______/   V    `,
    String.raw`           ))            `,
    String.raw`          ((             `,
    String.raw`           ))            `,
    String.raw`       .--''''--.        `,
    String.raw`     /  ~~~~~~~~  \      `,
    String.raw`    |  ~~~~~~~~~~  |==>  `,
    String.raw`     \.___    ___./      `,
    String.raw`          |  |           `,
    String.raw`          |  |   *sass*  `,
    String.raw`         _|  |_          `,
  ],
  ghost: [
    String.raw`        .-------.        `,
    String.raw`      /           \      `,
    String.raw`     /             \     `,
    String.raw`    |    L     R    |    `,
    String.raw`    |               |    `,
    String.raw`    |       M       |    `,
    String.raw`  --|               |--  `,
    String.raw`    |               |    `,
    String.raw`    |               |    `,
    String.raw`    |  /\   /\   /\ |    `,
    String.raw`    |_/  \_/  \_/  \|    `,
  ],
  axolotl: [
    String.raw` \\\                ///  `,
    String.raw`  \\\   .--------.  ///  `,
    String.raw`   \\\ /          \ ///  `,
    String.raw`      |   L    R   |     `,
    String.raw`      |            |     `,
    String.raw`      |     M      |     `,
    String.raw`       \__________/      `,
    String.raw`      /            \     `,
    String.raw`     (   ~~~~~~~~   )~~~ `,
    String.raw`      \____________/   ~ `,
    String.raw`       ||        ||      `,
  ],
}

// Word-wraps into exactly `lines` rows, so the bubble never changes height.
function bubbleRows(text: string, width: number, lines: number): string[] {
  const rows: string[] = []
  let row = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = row ? `${row} ${word}` : word
    if (next.length <= width) {
      row = next
      continue
    }
    if (row) rows.push(row)
    row = word.slice(0, width)
  }
  if (row) rows.push(row)
  if (rows.length > lines) {
    rows.length = lines
    rows[lines - 1] = `${rows[lines - 1]!.slice(0, width - 3)}...`
  }
  while (rows.length < lines) rows.push('')
  return rows
}

const OUTFITS: Record<Outfit, [string, string]> = {
  crown: ['          .:*~*:.        ', String.raw`         |\/\/\/|        `],
  tophat: ['           ____          ', '         _|____|_        '],
  party: ['             *           ', String.raw`            /_\          `],
  bow: ['                         ', '          >(@)<          '],
  shades: ['                         ', '                         '],
}
const OUTFIT_NAMES = Object.keys(OUTFITS) as Outfit[]

// Flapped wing rows for the birds and the dragon, by row index into BIG.
const WINGS: Partial<Record<Species, Record<number, string>>> = {
  flamingo: {
    9: String.raw`  \\ /  ~~~~~~~~  \ //   `,
    10: String.raw`   \|  ~~~~~~~~~~  |/=>  `,
  },
  duck: {
    6: String.raw`\\ ______\     /______ //`,
    7: String.raw`  /                   \  `,
  },
  owl: {
    7: String.raw`  \\|   \/\/\/\/\/    |//`,
    8: String.raw`    |   \/\/\/\/\/    |  `,
  },
  dragon: {
    6: String.raw` \/\/ '.________.' /\/\  `,
    7: String.raw`  \/\_/          \_/\/   `,
  },
}

// How many rows from the top of each big sprite are its head; a head bob shifts them.
const HEAD_ROWS: Record<Species, number> = {
  cat: 8, dog: 9, bunny: 9, duck: 6, owl: 6, dragon: 6, blob: 11, ghost: 6, axolotl: 7, flamingo: 5,
}

type Pose = { eyes: string; isFlapping: boolean; isHopping: boolean; bob: -1 | 0 | 1 }

// What the pet does on this tick. Pure, so every surface draws the same frame.
function pose(species: Species, m: Mood, tick: number, isTalking: boolean): Pose {
  const [still, alt] = EYES[m]
  const isBlinking = tick % 23 === 0 || tick % 37 === 0
  let eyes = isTalking && tick % 2 === 1 ? alt : still
  if (isBlinking && m !== 'sleepy') eyes = `-${eyes.slice(1, -1)}-`
  // Only moves while it talks, so motion means: read me. At rest it just blinks.
  const isFlapping = isTalking && species in WINGS && tick % 4 < 2
  const isHopping = isTalking && tick % 2 === 0
  // While talking the head bobs side to side: left, middle, right, middle.
  const bob: -1 | 0 | 1 = !isTalking ? 0 : tick % 4 === 1 ? -1 : tick % 4 === 3 ? 1 : 0
  return { eyes, isFlapping, isHopping, bob }
}

function shift(row: string, by: -1 | 0 | 1): string {
  if (by === 1) return ` ${row.slice(0, -1)}`
  if (by === -1) return `${row.slice(1)} `
  return row
}

// The sprite with outfit, wings and head bob applied. A hop is drawn by the pane:
// the sprite moves up into the bubble's pointer row.
function animatedSprite(p: Pet, at: Pose): string[] {
  const wings = at.isFlapping ? WINGS[p.species] : undefined
  const body = bigSprite(p.species, at.eyes, p.outfit).map((row, i) => wings?.[i] ?? row)
  const hat = p.outfit ? OUTFITS[p.outfit] : []
  const head = hat.length + HEAD_ROWS[p.species]
  return [...hat, ...body].map((row, i) => (i < head ? shift(row, at.bob) : row))
}

function bigSprite(species: Species, eyes: string, outfit?: Outfit): string[] {
  let [l = 'o', m = '.', r = 'o'] = [...eyes]
  if (outfit === 'shades') [l, r] = ['■', '■']
  return BIG[species].map(row => row.replace('L', l).replace('R', r).replace('M', m))
}

const PLAY: Record<Species, string[]> = {
  cat: ['*pounces on the cursor*', '*bats at a yarn ball*', '*chases a laser dot*'],
  dog: ['*fetches the stick!*', '*zoomies!*', '*brings you a slipper*'],
  bunny: ['*binky!*', '*hops in circles*', '*digs a tiny hole*'],
  duck: ['*splashes around*', '*quack quack!*', '*waddles in a circle*'],
  owl: ['*spins its head*', '*hoots a riddle*', '*catches a moth*'],
  dragon: ['*tiny fire puff!*', '*hoards your semicolons*', '*flaps proudly*'],
  blob: ['*wobbles happily*', '*bounces off the walls*', '*splits in two and back*'],
  ghost: ['*boo!*', '*plays hide and seek*', '*floats through the prompt*'],
  axolotl: ['*swims loops*', '*wiggles its gills*', '*blows bubbles*'],
  flamingo: ['*stands on one leg, judging you*', '*struts. obviously.*', '*hair flip, but feathers*'],
}

const PERSONALITY: Partial<Record<Species, string>> = {
  flamingo:
    'You are a SASSY flamingo: fabulous, dramatic, a little shady, rolls its eyes at sloppy work ' +
    'but secretly proud of the person. Think reality-TV judge energy. ',
}

const QUIPS: Record<string, string[]> = {
  Edit: ['ooh, surgery', 'snip snip', 'careful with that line', 'editing, love it'],
  Write: ['a whole new file!', 'fresh code smell', 'writing it from scratch, bold'],
  Bash: ['to the terminal!', 'running things...', 'press all the buttons', 'shell time'],
  Read: ['reading, reading...', 'studying hard', 'so many lines'],
  Grep: ['sniffing around the code', 'where is it...', 'on the hunt'],
  Glob: ['looking for files', 'sniff sniff'],
  WebFetch: ['off to the internet', 'fetching!'],
  WebSearch: ['googling, basically', 'researching...'],
  Agent: ['sending in a helper', 'calling backup!'],
}
const FLAMINGO_QUIPS = ['mm-hm. go on.', 'bold choice, darling', 'I have notes', 'serving code realness', 'not the semicolons again']

const CHATTER = [
  'still here, still cute', 'what are we building next?', 'I could use a snack...', 'is it break time?',
  'you are doing great, btw', 'I counted your tabs. too many.', 'remember to drink water', 'psst. /pet play?',
]

const EYES: Record<Mood, [string, string]> = {
  idle: ['o.o', '-.-'],
  happy: ['^.^', '^o^'],
  busy: ['o_o', 'O_O'],
  worried: ['o.O', 'O.o'],
  sleepy: ['-.-', 'u.u'],
  eating: ['^~^', '^o^'],
  love: ['♥.♥', '♥o♥'],
}

const COLORS: Record<Species, string> = {
  cat: 'yellow',
  duck: 'yellowBright',
  blob: 'cyan',
  ghost: 'white',
  axolotl: 'magenta',
  dog: 'yellow',
  bunny: 'white',
  owl: 'yellow',
  dragon: 'green',
  flamingo: 'magentaBright',
}

function pick<T>(list: readonly T[]): T {
  const n = new Uint32Array(1)
  crypto.getRandomValues(n)
  return list[n[0]! % list.length]!
}

const ALIASES: Record<string, Species> = {
  rabbit: 'bunny', bunny: 'bunny', puppy: 'dog', kitty: 'cat', kitten: 'cat',
  hund: 'dog', kat: 'cat', kanin: 'bunny', and: 'duck', ugle: 'owl', drage: 'dragon', spogelse: 'ghost',
}

function an(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`
}

const TRICKS = ['rolls over', 'plays dead (dramatically)', 'balances a semicolon on its nose', 'does a backflip',
  'spins three times', 'high-fives the cursor', 'moonwalks across the status line']

const HELP = [
  '/pet              pet it',
  '/pet feed         a full meal',
  '/pet treat        a little snack',
  '/pet play         play together',
  '/pet trick        it shows off',
  '/pet roast        roasts your work',
  '/pet hype         hypes you up',
  '/pet fortune      a fortune cookie',
  '/pet say <msg>    chat with it (or just /flingo <msg>)',
  '/pet comment      a comment on your work now',
  '/pet sleep|wake   nap time',
  '/pet wear <item>  crown, tophat, party, bow, shades, none',
  '/pet animal <a>   cat, dog, bunny, duck, owl, dragon, blob, ghost, axolotl, flamingo',
  '/pet name <name>  rename it',
  '/pet big|small    sidebar or status line',
  '/pet quiet|chatty comments off or on',
  '/pet hide|show    away or back',
  '/pet stats        how it is doing',
].join('\n')

// Always listed at the bottom of the sidebar, two per row to fit its width.
const PANE_COMMANDS = [
  'say <msg>  feed',
  'treat      play',
  'trick      roast',
  'hype       fortune',
  'comment    sleep',
  'wake       stats',
  'wear <item>',
  'animal <animal>',
  'name <name>',
  'small      quiet',
  'chatty     hide',
  'pet        help',
]

// The first sentence of a reply, without markdown, short enough for the bubble.
function openingLine(answer: string): string | null {
  const plain = answer
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>|]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return null
  const sentence = plain.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? plain
  return sentence.length > 160 ? `${sentence.slice(0, 157)}...` : sentence
}

function hunger(p: Pet, now: number): number {
  return Math.min(100, Math.round(((now - p.lastFedAt) / HOUR) * 5))
}

function bar(value: number): string {
  const full = Math.round(value / 20)
  return '■'.repeat(full) + '□'.repeat(5 - full)
}

let lastActivityAt = 0
let moodTimer: { cancel: () => void } | null = null
let sayTimer: { cancel: () => void } | null = null
let errorsThisTurn = 0
let toolsThisTurn = 0
let lastLiveAt = 0
let lastQuipAt = 0
let lastChatterAt = 0
let isCommenting = false
let lastStatus = ''
// While the big sidebar pet is open, the small one stays out of the status line.
let isBigOpen = false

// The pet lives in the status line: face, name and what it last said.
async function openBig($: EngineInterface, p: Pet) {
  const opened = await $.ui.open({ id: PANE, title: p.name, columns: PANE_COLUMNS })
  isBigOpen = opened.isPlaced
  await drawStatus($)
}

async function drawStatus($: EngineInterface) {
  const p = await read($, pet)
  if (!p) return
  if (isBigOpen) {
    if (lastStatus) $.ui.status(undefined)
    lastStatus = ''
    return
  }
  const m = await read($, mood)
  const said = await read($, say)
  const bubble = said ? said.slice(0, await read($, typed)) : null
  const isTalking = said !== null && bubble !== null && bubble.length < said.length
  const { eyes } = pose(p.species, m, await read($, frame), isTalking)
  const text = `(${eyes}) ${p.name}${bubble ? `: ${bubble}` : ''}`
  if (text === lastStatus) return
  lastStatus = text
  $.ui.status(text)
}

const ASK = {
  comment:
    'ROAST the person in ONE line (max 18 words) about the work in this conversation, mostly the latest turn: ' +
    'their requests, their code, their habits. Specific to what actually happened, affectionate, funny, never cruel. ',
  roast:
    'ROAST the work in this conversation in ONE line (max 20 words): affectionate, specific, funny, never mean about the person. ',
  hype:
    'HYPE the person up in ONE line (max 20 words) about something specific they got done in this conversation. Over the top. ',
  fortune:
    'Write ONE fortune cookie (max 16 words) for the person, a playful prophecy loosely based on this conversation. Start with "You will". ',
  chat:
    'The person is chatting with you directly through your little creature face. Answer them in character, ' +
    'warm and witty with a little roast, max 40 words, using what you know from this conversation when it helps. ',
  live:
    'The work is still in progress right now. In ONE line (max 14 words), say in first person what you are doing ' +
    'this very moment, with a playful roast of the person or their code. Specific, affectionate, never cruel. ',
} as const

type Ask = keyof typeof ASK

function commentPrompt(p: Pet, ask: Ask, message = ''): string {
  return (
    // The pet is Claude Code's face: it speaks as the assistant doing the work, not as an onlooker.
    `You are the assistant in this conversation, and ${p.name}, a tiny ${p.species}, is your face: ` +
    'the person sees you as this little creature while you work together. Speak as yourself, in first person. ' +
    (PERSONALITY[p.species] ?? '') +
    ASK[ask] +
    (ask === 'chat' ? `\n\nThe person says to you: ${message}\n\n` : '') +
    'Write in the language the person writes in. No em dashes, no emoji, no quotes, no preamble. ' +
    'Reply with the comment only.'
  )
}

// A message from the person, answered in the pet's voice with the conversation as context.
async function chat($: EngineInterface, p: Pet, message: string): Promise<CommandRunResult> {
  // Wait briefly for a live comment that is still being written.
  for (let i = 0; i < 20 && isCommenting; i++) await $.clock.sleep(500)
  await feel($, 'happy', 6000)
  const text = await comment($, p, true, 'chat', message)
  return { text: text ? `${p.name}: ${text}` : `${p.name} didn't catch that. Try again?` }
}

async function comment($: EngineInterface, p: Pet, force = false, ask: Ask = 'comment', message = ''): Promise<string | null> {
  // One at a time: a turn that ends while the last comment is still being written is skipped.
  if (isCommenting) return null
  isCommenting = true
  try {
    const r = await $.model.fork({ prompt: commentPrompt(p, ask, message) })
    if (!r.isAnswered) return null
    const text = r.text.trim().replace(/^["“]|["”]$/g, '').replace(/\s*—\s*/g, ', ').slice(0, ask === 'chat' ? 400 : 160)
    if (!text) return null
    await update($, lastComment, () => text)
    await speak($, text, COMMENT_SHOWS_FOR)
    return text
  } catch {
    // Fired and forgotten from tool and turn hooks: a failed comment is just silence.
    return null
  } finally {
    isCommenting = false
  }
}

async function save($: EngineInterface, next: Pet) {
  await update($, pet, () => next)
  await $.store.set(STORE_KEY, next)
}

// Sets a mood for a while, then falls back to idle.
async function feel($: EngineInterface, m: Mood, ms = 4000) {
  await update($, mood, () => m)
  moodTimer?.cancel()
  moodTimer = $.clock.after(ms, () => {
    void update($, mood, () => 'idle')
  })
}

let typingTimer: { cancel: () => void } | null = null

async function speak($: EngineInterface, text: string, ms = 6000) {
  typingTimer?.cancel()
  await update($, typed, () => 0)
  await update($, say, () => text)
  typingTimer = $.clock.every(TYPE_MS, async () => {
    await update($, typed, t => t + 1)
    if ((await read($, typed)) >= text.length) typingTimer?.cancel()
    await drawStatus($)
  })
  sayTimer?.cancel()
  // The line stays its full time once it has been typed out.
  sayTimer = $.clock.after(ms + text.length * TYPE_MS, () => {
    void update($, say, () => null)
  })
}

// /pet and /flingo share every subcommand.
async function petCommand($: EngineInterface, e: CommandRunInput): Promise<CommandRunResult> {
  const p = await read($, pet)
  if (!p) return { text: 'No pet yet. Start a new session to hatch one.' }

  const now = await $.clock.now()
  lastActivityAt = now
  const [verb = '', ...rest] = e.args.trim().split(/\s+/)

  switch (verb.toLowerCase()) {
    case '':
    case 'pat':
    case 'pet': {
      await save($, { ...p, pets: p.pets + 1, happiness: Math.min(100, p.happiness + 8) })
      await feel($, 'love')
      await speak($, pick(['♥ ♥ ♥', '*purrs*', '*happy wiggle*', 'more pets pls']))
      return { text: `You pet ${p.name}. ♥` }
    }
    case 'feed': {
      const h = hunger(p, now)
      if (h < 10) {
        await speak($, "I'm full!")
        return { text: `${p.name} isn't hungry right now.` }
      }
      await save($, { ...p, lastFedAt: now, happiness: Math.min(100, p.happiness + 5) })
      await feel($, 'eating')
      await speak($, pick(['nom nom nom', '*munch*', 'yum!']))
      return { text: `You fed ${p.name}.` }
    }
    case 'name':
    case 'rename': {
      const name = rest.join(' ').slice(0, 20)
      if (!name) return { text: 'Usage: /pet name <name>' }
      await save($, { ...p, name })
      await feel($, 'happy')
      await speak($, `I'm ${name} now!`)
      return { text: `Your pet is now called ${name}.` }
    }
    case 'stats': {
      const days = Math.floor((now - p.bornAt) / (24 * HOUR))
      return {
        text:
          `${p.name} the ${p.species}, ${days} day${days === 1 ? '' : 's'} old\n` +
          `Happiness ${bar(p.happiness)}  Hunger ${bar(hunger(p, now))}\n` +
          `Petted ${p.pets} times, watched ${p.turns} turns`,
      }
    }
    case 'play': {
      const h = hunger(p, now)
      if (h > 80) {
        await feel($, 'worried')
        await speak($, 'Too hungry to play... /pet feed?')
        return { text: `${p.name} is too hungry to play.` }
      }
      // Playing burns energy: a bit hungrier, a lot happier.
      await save($, { ...p, lastFedAt: p.lastFedAt - HOUR / 2, happiness: Math.min(100, p.happiness + 12) })
      await feel($, 'happy', 6000)
      const game = pick(PLAY[p.species])
      await speak($, game)
      return { text: `You play with ${p.name}. ${game}` }
    }
    case 'animal':
    case 'species': {
      const asked = (rest[0] ?? '').toLowerCase()
      const want = (ALIASES[asked] ?? asked) as Species
      if (!SPECIES.includes(want)) {
        return { text: `Pick one: ${SPECIES.join(', ')}. ${p.name} is ${an(p.species)} now.` }
      }
      await save($, { ...p, species: want })
      await feel($, 'happy')
      await speak($, `*poof* I'm ${an(want)} now!`)
      return { text: `${p.name} is now ${an(want)}.` }
    }
    case 'help':
    case '?':
      return { text: HELP }
    case 'treat': {
      await save($, { ...p, lastFedAt: Math.min(now, p.lastFedAt + HOUR), happiness: Math.min(100, p.happiness + 3) })
      await feel($, 'eating')
      await speak($, pick(['*crunch*', 'a treat! for me?!', '*happy chomp*']))
      return { text: `${p.name} gobbles the treat.` }
    }
    case 'trick': {
      const trick = pick(TRICKS)
      await feel($, 'happy', 5000)
      await speak($, `*${trick}*`)
      return { text: `${p.name} ${trick}!` }
    }
    case 'roast':
    case 'hype':
    case 'fortune': {
      await feel($, verb === 'roast' ? 'busy' : 'happy', 6000)
      const text = await comment($, p, true, verb as Ask)
      return { text: text ? `${p.name}: ${text}` : `${p.name} is thinking... try again in a moment.` }
    }
    case 'sleep':
      moodTimer?.cancel()
      await update($, mood, () => 'sleepy')
      await update($, isQuiet, () => true)
      await speak($, 'Zzz...', 60 * 60 * 1000)
      return { text: `${p.name} curls up for a nap. /pet wake to wake it.` }
    case 'wake':
      await update($, isQuiet, () => false)
      await feel($, 'happy')
      await speak($, pick(['*yawns* I am awake!', 'what did I miss?', '*stretches*']))
      return { text: `${p.name} is awake.` }
    case 'wear':
    case 'outfit': {
      const item = (rest[0] ?? '').toLowerCase()
      if (item === 'none' || item === 'off') {
        await save($, { ...p, outfit: undefined })
        return { text: `${p.name} took it off.` }
      }
      if (!OUTFIT_NAMES.includes(item as Outfit)) return { text: `Pick one: ${OUTFIT_NAMES.join(', ')}, none.` }
      await save($, { ...p, outfit: item as Outfit })
      await feel($, 'love')
      await speak($, pick(['how do I look?', 'fabulous, right?', '*strikes a pose*']))
      return { text: `${p.name} is wearing the ${item}.` }
    }
    case 'comment':
    case 'talk': {
      const text = await comment($, p, true)
      return { text: text ? `${p.name}: ${text}` : `${p.name} has nothing to say yet.` }
    }
    case 'quiet':
      await update($, isQuiet, () => true)
      return { text: `${p.name} will keep its thoughts to itself. /pet chatty turns comments back on.` }
    case 'chatty':
      await update($, isQuiet, () => false)
      return { text: `${p.name} will comment on your work again.` }
    case 'big':
      await $.store.set(BIG_KEY, true)
      await update($, isHidden, () => false)
      await openBig($, p)
      await feel($, 'happy')
      return { text: `${p.name} is HUGE now. /pet small shrinks it again.` }
    case 'small':
      await $.store.set(BIG_KEY, false)
      isBigOpen = false
      await $.ui.close({ id: PANE })
      return { text: `${p.name} is back in the status line.` }
    case 'hide':
      await update($, isHidden, () => true)
      lastStatus = ''
      $.ui.status(undefined)
      await $.ui.close({ id: PANE })
      return { text: `${p.name} is napping out of sight. /pet show brings it back.` }
    case 'show':
      await update($, isHidden, () => false)
      await feel($, 'happy')
      return { text: `${p.name} is back!` }
    case 'say':
    case 'chat':
      if (!rest.length) return { text: 'Usage: /pet say <message>' }
      return chat($, p, rest.join(' '))
    default:
      return chat($, p, e.args.trim())
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    lastActivityAt = now
    let p = (await $.store.get(STORE_KEY)) as Pet | undefined

    if (!p) {
      p = {
        name: 'Flingo',
        species: 'flamingo',
        bornAt: now,
        lastFedAt: now,
        happiness: 70,
        pets: 0,
        turns: 0,
      }
      await $.store.set(STORE_KEY, p)
      await update($, pet, () => p!)
      await speak($, `*hatches* Hi! I'm ${p.name}.`)
    } else {
      await update($, pet, () => p!)
      const h = hunger(p, now)
      await speak($, h > 60 ? `${p.name} is hungry. Try /pet feed` : `${p.name} missed you!`)
    }

    await $.command.register({
      name: 'pet',
      description: 'Your pet. /pet help lists everything it can do',
      argumentHint: '[help|feed|play|treat|trick|roast|hype|fortune|wear|animal|big|small]',
      immediate: true,
    })
    await $.command.register({
      name: 'flingo',
      description: 'Talk to Flingo: /flingo <message>, or any /pet command',
      argumentHint: '[message|say|feed|play|roast|hype|help]',
      immediate: true,
    })

    // Opened unasked, the pane may wait undrawn on a narrow terminal; until it
    // is really shown the small pet stays in the status line.
    if ((await $.store.get(BIG_KEY)) === true) await openBig($, p)

    $.clock.every(TICK_MS, async () => {
      if (await read($, isHidden)) return
      await update($, frame, f => f + 1)
      const m = await read($, mood)
      const now = await $.clock.now()
      if (m === 'idle' && now - lastActivityAt > SLEEPY_AFTER) {
        await update($, mood, () => 'sleepy')
      }
      // Small talk while things are quiet (free: no model call).
      const isIdle = now - lastActivityAt > CHATTER_EVERY_MS && now - lastChatterAt > CHATTER_EVERY_MS
      if (isIdle && m !== 'sleepy' && !(await read($, isQuiet)) && !(await read($, say))) {
        lastChatterAt = now
        await speak($, pick(CHATTER), 8000)
      }
      await drawStatus($)
    })

    return next(e)
  })

  on('command.run', { command: 'pet' }, petCommand)
  on('command.run', { command: 'flingo' }, petCommand)

  on('prompt.submit', async ($, e, next) => {
    lastActivityAt = await $.clock.now()
    errorsThisTurn = 0
    toolsThisTurn = 0
    lastLiveAt = lastActivityAt
    moodTimer?.cancel()
    await update($, mood, () => 'busy')
    // A prompt the person entered may seat the pane at any width.
    const p = await read($, pet)
    if (p && !isBigOpen && (await $.store.get(BIG_KEY)) === true) await openBig($, p)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    toolsThisTurn += 1
    const ran = await next(e)
    if ('deny' in ran && ran.deny !== undefined) return ran
    if (ran.isError) {
      errorsThisTurn += 1
      await feel($, 'worried', 3000)
      await speak($, pick(['uh oh', 'oops!', 'hmm...', "that didn't work"]), 3000)
      return ran
    }
    if ((await read($, isQuiet)) || (await read($, isHidden))) return ran

    const now = await $.clock.now()
    const p = await read($, pet)
    const isLiveDue = toolsThisTurn % LIVE_EVERY_TOOLS === 0 || now - lastLiveAt > LIVE_EVERY_MS
    if (p && isLiveDue && !isCommenting) {
      lastLiveAt = now
      void comment($, p, true, 'live')
    } else if (p && now - lastQuipAt > QUIP_EVERY_MS && !isCommenting) {
      const lines = p.species === 'flamingo' && Math.random() < 0.5 ? FLAMINGO_QUIPS : QUIPS[e.tool]
      if (lines) {
        lastQuipAt = now
        await speak($, pick(lines), QUIP_SHOWS_FOR)
      }
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    lastActivityAt = await $.clock.now()
    const p = await read($, pet)
    if (p) {
      await save($, { ...p, turns: p.turns + 1, happiness: Math.min(100, p.happiness + 1) })
      const isStarving = hunger(p, lastActivityAt) > 75
      await feel($, isStarving || errorsThisTurn > 2 ? 'worried' : 'happy', 3000)
      // The pet is the assistant's face: at the end of a turn it says the reply's opening line.
      const quiet = (await read($, isQuiet)) || (await read($, isHidden))
      const line = e.isAborted ? null : openingLine(e.answer)
      if (!quiet && line) {
        await update($, lastComment, () => line)
        await speak($, line, COMMENT_SHOWS_FOR)
      } else if (!quiet) void comment($, p)
      else if (isStarving) await speak($, "I'm hungry... /pet feed?")
    }
    return next(e)
  })

  // Closing the sidebar by hand keeps it closed next session too.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      isBigOpen = false
      if (e.origin.kind === 'person') await $.store.set(BIG_KEY, false)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const p = await read($, pet)
    if (!p) return <Text dimColor>No pet yet.</Text>

    const m = await read($, mood)
    const tick = await read($, frame)
    const said = await read($, say)
    const shown = said ? said.slice(0, await read($, typed)) : null
    const isTyping = said !== null && shown !== null && shown.length < said.length
    const bubble = shown === null ? null : isTyping ? `${shown}▌` : shown
    const sticky = await read($, lastComment)
    const now = await $.clock.now()
    const at = pose(p.species, m, tick, isTyping)

    return (
      <Box flexDirection="column" flexGrow={1} width={e.props.bodyColumns} minHeight={e.props.scroll.bodyRows} backgroundColor={PANE_BACKGROUND}>
        <Box borderStyle="round" borderColor={COLORS[p.species]} paddingX={1} flexDirection="column">
          {bubbleRows(bubble ?? sticky ?? '...', Math.max(10, e.props.bodyColumns - 4), BUBBLE_LINES).map(row => (
            <Text dimColor={!bubble}>{row || ' '}</Text>
          ))}
        </Box>
        {!at.isHopping && <Text color={COLORS[p.species]}>{`${SPRITE_INDENT}        \\`}</Text>}
        {animatedSprite(p, at).map(row => (
          <Text color={COLORS[p.species]} bold>{`${SPRITE_INDENT}${row}`}</Text>
        ))}
        {at.isHopping && <Text> </Text>}
        <Text> </Text>
        <Text bold>{`  ${p.name} the ${p.species}`}</Text>
        <Text dimColor>{`  feeling ${m}`}</Text>
        <Text>{`  happy  ${bar(p.happiness)}`}</Text>
        <Text>{`  hungry ${bar(hunger(p, now))}`}</Text>
        <Text> </Text>
        <Text bold>{'  /pet ...'}</Text>
        {PANE_COMMANDS.map(row => (
          <Text dimColor>{`  ${row}`}</Text>
        ))}
      </Box>
    )
  })
}
