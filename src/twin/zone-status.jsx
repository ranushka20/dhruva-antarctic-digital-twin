import { ZoneStatusContext } from "./zone-status-context";

export function ZoneStatusProvider({ value, children }) {
  return (
    <ZoneStatusContext.Provider value={value ?? {}}>
      {children}
    </ZoneStatusContext.Provider>
  );
}
