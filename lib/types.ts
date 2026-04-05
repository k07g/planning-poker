export interface Player {
  id: string
  name: string
  vote: string | null
  isHost: boolean
}

export interface Room {
  id: string
  players: Player[]
  story: string
  phase: 'voting' | 'revealed'
}

export const CARD_VALUES = ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕']
