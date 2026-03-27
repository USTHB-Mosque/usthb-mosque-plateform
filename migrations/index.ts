import * as migration_20260327_210021 from './20260327_210021';

export const migrations = [
  {
    up: migration_20260327_210021.up,
    down: migration_20260327_210021.down,
    name: '20260327_210021'
  },
];
