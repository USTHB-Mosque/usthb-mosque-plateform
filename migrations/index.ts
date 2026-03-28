import * as migration_20260328_233632_book_favorites from './20260328_233632_book_favorites';

export const migrations = [
  {
    up: migration_20260328_233632_book_favorites.up,
    down: migration_20260328_233632_book_favorites.down,
    name: '20260328_233632_book_favorites'
  },
];
