export type Species = 'cat' | 'dog' | 'bunny' | 'duck' | 'owl' | 'dragon' | 'blob' | 'ghost' | 'axolotl' | 'flamingo'
export type Mood = 'idle' | 'happy' | 'busy' | 'worried' | 'sleepy' | 'eating' | 'love'
export type Outfit = 'crown' | 'tophat' | 'party' | 'bow' | 'shades'
export type Pet = {
  name: string
  species: Species
  bornAt: number
  lastFedAt: number
  happiness: number
  pets: number
  turns: number
  outfit?: Outfit
}

declare module 'claude-code' {
  interface PluginState {
    pet: {
      pet: Pet | null
      mood: Mood
      say: string | null
      frame: number
      isHidden: boolean
      isQuiet: boolean
      comment: string | null
      typed: number
    }
  }
}
