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
  expect((await $.command.run({ command: 'pet', args: 'wear crown' } as never)).text).toContain('crown')
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
