// Single access point for libsodium. The wrapper attaches its API to the
// module object only after `ready` resolves, so everything must go through
// this live reference (never through import-time snapshots).
import * as sodiumNamespace from 'libsodium-wrappers-sumo';

type SodiumModule = typeof sodiumNamespace;

const live =
  ((sodiumNamespace as unknown as { default?: SodiumModule }).default ??
    (sodiumNamespace as unknown as SodiumModule)) as SodiumModule;

export function sodiumRef(): SodiumModule {
  return live;
}

export type { SodiumModule };
