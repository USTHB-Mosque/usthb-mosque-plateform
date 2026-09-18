import * as migration_20260918_094355 from './20260918_094355';
import * as migration_20260918_102126 from './20260918_102126';

export const migrations = [
  {
    up: migration_20260918_094355.up,
    down: migration_20260918_094355.down,
    name: '20260918_094355',
  },
  {
    up: migration_20260918_102126.up,
    down: migration_20260918_102126.down,
    name: '20260918_102126'
  },
];
