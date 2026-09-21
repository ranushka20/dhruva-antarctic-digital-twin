/**
 * src/engine/coupling.ts — Re-exports from the shared contract.
 * The coupling engine is implemented in src/shared/contracts.ts.
 * This file provides a clean import path for page code.
 */
export {
  computeHDD,
  computeHeatLoss,
  computeWindChill,
  computeEnergyDemand,
  computeFuelBurn,
  computeAutonomy,
  computeLSOD,
  computeMarginDays,
  computeRisk,
  runCausalTrace,
  DEFAULT_ENGINE_CONFIG,
  type EngineConfig,
  type CausalTraceInput,
  type CausalTraceStep,
} from '@/shared/contracts';
