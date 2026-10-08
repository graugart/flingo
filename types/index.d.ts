export type Species = 'cat' | 'dog' | 'bunny' | 'duck' | 'owl' | 'dragon' | 'blob' | 'ghost' | 'axolotl' | 'flamingo'
export type Mood = 'idle' | 'happy' | 'busy' | 'worried' | 'sleepy' | 'eating' | 'love'
export type Outfit = 'crown' | 'tophat' | 'party' | 'bow' | 'shades'
export type BuddyKind = 'shrimp' | 'snail' | 'fish' | 'worm' | 'frog'
export type Buddy = { kind: BuddyKind; name: string; since: number; fateAt: number }
export type Pet = {
  name: string
  species: Species
  bornAt: number
  lastFedAt: number
  happiness: number
  pets: number
  turns: number
  outfit?: Outfit
  // Messes waiting for /flingo clean, and when the next one is due after a meal.
  poops?: number
  poopAt?: number
  // /flingo needs off: no hunger and no messes, for people who don't want a tamagotchi.
  isLowMaintenance?: boolean
  // A tiny pet of Flingo's own, from /flingo gift. It never lasts.
  buddy?: Buddy
  buddiesLost?: number
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
