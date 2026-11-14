// The player package owns the Card model; re-export it so app code has one source of truth.
export type { CardType as Card, RankType as Rank, Suit } from 'evilspins-player'
