import { createContext, useContext } from "react";

/**
 * Zone status, supplied by the station-state model.
 *
 * A context rather than a prop drill: status has to reach every room and
 * exterior asset, five levels down through floors that otherwise have no
 * interest in it.
 *
 * The default is an empty map, which resolves every zone to "unknown".
 * That is the correct default for this station — most zones have no feed
 * and no model behind them, and a twin that showed them all green would be
 * making exactly the claim this project refuses to make.
 */
export const ZoneStatusContext = createContext({});

export function useZoneStatus(zone) {
  const map = useContext(ZoneStatusContext);
  return map[zone] ?? "unknown";
}
