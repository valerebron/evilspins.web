// The player package owns the card model; re-export it so app code has one source of truth.
export type { CardData, RankType as Rank, Suit } from 'evilspins-player'
