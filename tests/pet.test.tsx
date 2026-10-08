import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

function engine(on: On) {
  mock.clock(on)
  mock.store(on)
  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
}

test('/pet commands answer', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  const petted = await $.command.run({ command: 'pet', args: '' } as never)
  expect(petted.text).toContain('You pet')
  const renamed = await $.command.run({ command: 'pet', args: 'name Luna' } as never)
  expect(renamed.text).toContain('Luna')
  const stats = await $.command.run({ command: 'pet', args: 'stats' } as never)
  expect(stats.text).toContain('Luna the')
})

test('/pet comment speaks about the work', async ($, on) => {
  engine(on)
  on('model.fork', async () => ({ value: { isAnswered: true, text: 'Nice fix — but test it.', usage: {} } }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  const said = await $.command.run({ command: 'pet', args: 'comment' } as never)
  expect(said.text).toContain('Nice fix, but test it.')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`/pet big draws the huge pet in the sidebar (${surface})`, async ($, on) => {
    engine(on)
    on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
    await $.session.start({ cwd: '/tmp', surface } as never)
    await $.command.run({ command: 'pet', args: 'big' } as never)
    const ui = await $.ui.mount({
      plugin: 'pet',
      surface,
      component: 'Pane',
      requestId: 'pet',
      props: { title: 'Pet', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 60 } } as never,
    })
    expect(await ui.find({ text: /happy/ })).toBeTruthy()
  })
}

test('/pet play, and Flingo stays a flamingo', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  const played = await $.command.run({ command: 'pet', args: 'play' } as never)
  expect(played.text).toContain('You play with')
  const dragon = await $.command.run({ command: 'pet', args: 'animal dragon' } as never)
  expect(dragon.text).toContain('is a flamingo')
  const petted = await $.command.run({ command: 'pet', args: 'pet' } as never)
  expect(petted.text).toContain('You pet')
})

test('fun commands', async ($, on) => {
  engine(on)
  on('model.fork', async () => ({ value: { isAnswered: true, text: 'You will ship it on Friday.', usage: {} } }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  expect((await $.command.run({ command: 'pet', args: 'help' } as never)).text).toContain('/pet roast')
  expect((await $.command.run({ command: 'pet', args: 'fortune' } as never)).text).toContain('You will ship')
  expect((await $.command.run({ command: 'pet', args: 'wear party' } as never)).text).toContain('a party hat')
  expect((await $.command.run({ command: 'pet', args: 'trick' } as never)).text).toContain('!')
})

test('comments live while working', async ($, on) => {
  engine(on)
  let forks = 0
  on('model.fork', async () => {
    forks += 1
    return { value: { isAnswered: true, text: 'And it goes for the edit!', usage: {} } } as never
  })
  on('tool.call', async () => ({ result: {} }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  for (let i = 0; i < 4; i++) {
    await $.tool.call({ tool: 'Read', input: { file_path: '/tmp/x' } } as never)
  }
  expect(forks).toBeGreaterThan(0)
})

test('new lines are typed out letter by letter', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  await $.command.run({ command: 'pet', args: 'big' } as never)
  await $.command.run({ command: 'pet', args: 'name Flingo' } as never)
  const ui = await $.ui.mount({
      plugin: 'pet',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'pet',
      props: { title: 'Pet', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 60 } } as never,
    })
  await clock.advance(35 * 3)
  expect(await ui.find({ text: /Flingo now!/ })).toBeFalsy()
  await clock.advance(35 * 40)
  expect(await ui.find({ text: /Flingo now!/ })).toBeTruthy()
})

test('says the opening line of the reply when a turn ends', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  await $.command.run({ command: 'pet', args: 'big' } as never)
  await $.turn.complete({ answer: '**Done.** The bubble now speaks for me — nice.', durationMs: 1, isAborted: false, turnId: 't' } as never)
  const ui = await $.ui.mount({
    plugin: 'pet',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'pet',
    props: { title: 'Pet', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 60 } } as never,
  })
  await clock.advance(35 * 20)
  expect(await ui.find({ text: /Done\./ })).toBeTruthy()
})

test('/pet say and /flingo chat back', async ($, on) => {
  engine(on)
  const prompts: string[] = []
  on('model.fork', async (_$, e) => {
    prompts.push((e as { prompt: string }).prompt)
    return { value: { isAnswered: true, text: 'Darling, always.', usage: {} } } as never
  })
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  const said = await $.command.run({ command: 'pet', args: 'say er du klar?' } as never)
  expect(said.text).toContain('Darling, always.')
  expect(prompts[0]).toContain('er du klar?')
  const free = await $.command.run({ command: 'flingo', args: 'hvordan går det' } as never)
  expect(free.text).toContain('Darling, always.')
  const fed = await $.command.run({ command: 'flingo', args: 'stats' } as never)
  expect(fed.text).toContain('Happiness')
})

test('a long reply is cut to whole sentences that fit the bubble', async ($, on) => {
  engine(on)
  const long =
    'Skat, du lod mig tegne ni dyr og slog otte fra. Panelbredden har du ændret oftere end du genstarter sessioner. ' +
    'Og semikolonerne? Dem taler vi ikke om. Aldrig. Heller ikke i morgen, darling, for jeg har en reputation at passe på.'
  on('model.fork', async () => ({ value: { isAnswered: true, text: long, usage: {} } }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  const said = (await $.command.run({ command: 'pet', args: 'roast' } as never)).text ?? ''
  const line = said.replace(/^[^:]+: /, '')
  expect(long.startsWith(line)).toBe(true)
  expect(line.endsWith('.')).toBe(true)
  expect(line.length).toBeLessThan(long.length)
  // 7 rows of 23 cells, the typing cursor included.
  const words = `${line}▌`.split(' ')
  let rows = 1
  let row = ''
  for (const w of words) {
    const next = row ? `${row} ${w}` : w
    if (next.length <= 23) row = next
    else {
      rows += 1
      row = w
    }
  }
  expect(rows).toBeLessThan(8)
})

const HUNGRY_FLINGO = {
  name: 'Flingo', species: 'flamingo', bornAt: 0, lastFedAt: 0, happiness: 50, pets: 0, turns: 0,
}

function hungryEngine(on: On, extra: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: 20 * 60 * 60 * 1000 } as never)
  mock.store(on, { pet: { ...HUNGRY_FLINGO, ...extra } })
  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  return clock
}

const PANE_PROPS = { title: 'Pet', isFocused: false, bodyColumns: 27, placement: 'dock', scroll: { offset: 0, bodyRows: 60 } }

test('a mess follows a meal, and /flingo clean removes it', async ($, on) => {
  const clock = hungryEngine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  await $.command.run({ command: 'flingo', args: 'big' } as never)
  expect((await $.command.run({ command: 'flingo', args: 'feed' } as never)).text).toContain('You fed')
  const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'Pane', requestId: 'pet', props: PANE_PROPS as never })
  expect(await ui.find({ text: /\(___\)/ })).toBeFalsy()
  await clock.advance(6 * 60 * 1000)
  expect(await ui.find({ text: /\(___\)/ })).toBeTruthy()
  expect((await $.command.run({ command: 'flingo', args: 'clean' } as never)).text).toContain('cleaned up')
  expect(await ui.find({ text: /\(___\)/ })).toBeFalsy()
})

test('/flingo needs off: no hunger, no mess', async ($, on) => {
  const clock = hungryEngine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  await $.command.run({ command: 'flingo', args: 'big' } as never)
  expect((await $.command.run({ command: 'flingo', args: 'needs off' } as never)).text).toContain('no longer')
  expect((await $.command.run({ command: 'flingo', args: 'feed' } as never)).text).toContain("isn't hungry")
  const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'Pane', requestId: 'pet', props: PANE_PROPS as never })
  await clock.advance(6 * 60 * 1000)
  expect(await ui.find({ text: /\(___\)/ })).toBeFalsy()
  expect(await ui.find({ text: /hungry/ })).toBeFalsy()
})

test('a hungry Flingo guilt-trips you on its own', async ($, on) => {
  const clock = hungryEngine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  await $.command.run({ command: 'flingo', args: 'big' } as never)
  const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'Pane', requestId: 'pet', props: PANE_PROPS as never })
  // The hello line has gone by 15 s; what shows then is the guilt trip.
  await clock.advance(15 * 1000)
  expect(await ui.find({ text: /\/flingo/ })).toBeTruthy()
})

test('a gifted buddy plays at Flingo\'s feet, then meets its fate', async ($, on) => {
  const clock = hungryEngine(on, { lastFedAt: 20 * 60 * 60 * 1000 })
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  await $.command.run({ command: 'flingo', args: 'big' } as never)
  expect((await $.command.run({ command: 'flingo', args: 'gift fish' } as never)).text).toContain('a fish called')
  const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'Pane', requestId: 'pet', props: PANE_PROPS as never })
  expect(await ui.find({ text: /><[>)]/ })).toBeTruthy()
  expect((await $.command.run({ command: 'flingo', args: 'gift snail' } as never)).text).toContain('already has')
  await clock.advance(31 * 60 * 1000)
  expect(await ui.find({ text: /><[>)]/ })).toBeFalsy()
  expect((await $.command.run({ command: 'flingo', args: 'stats' } as never)).text).toContain('Buddies lost: 1')
})

test('typo roasts come sometimes, and never when switched off', { timeoutMs: 90000 } as never, async ($, on) => {
  const clock = hungryEngine(on, { lastFedAt: 20 * 60 * 60 * 1000 })
  let checks = 0
  on('model.complete', async () => {
    checks += 1
    return { value: { isAnswered: true, text: '"Teh"? Darling, the keyboard is right there.', usage: {} } } as never
  })
  on('prompt.submit', async (_$, e) => ({ text: (e as { text: string }).text }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
  for (let i = 0; i < 14; i++) {
    await $.prompt.submit({ text: 'fix teh login bug please', wait: false } as never)
    await clock.advance(11 * 60 * 1000)
  }
  expect(checks).toBeGreaterThan(0)
  expect(checks).toBeLessThan(14)
  await $.command.run({ command: 'flingo', args: 'spelling off' } as never)
  const before = checks
  for (let i = 0; i < 4; i++) {
    await $.prompt.submit({ text: 'fix teh login bug please', wait: false } as never)
    await clock.advance(11 * 60 * 1000)
  }
  expect(checks).toBe(before)
})
