import * as migration_20260918_094355 from './20260918_094355';
import * as migration_20260918_102126 from './20260918_102126';
import * as migration_20260920_092548_drop_mcp_plugin_tables from './20260920_092548_drop_mcp_plugin_tables';

export const migrations = [
  {
    up: migration_20260918_094355.up,
    down: migration_20260918_094355.down,
    name: '20260918_094355',
  },
  {
    up: migration_20260918_102126.up,
    down: migration_20260918_102126.down,
    name: '20260918_102126',
  },
  {
    up: migration_20260920_092548_drop_mcp_plugin_tables.up,
    down: migration_20260920_092548_drop_mcp_plugin_tables.down,
    name: '20260920_092548_drop_mcp_plugin_tables'
  },
];
