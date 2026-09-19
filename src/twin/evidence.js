/* =========================================================
   EVIDENCE CLASSIFICATION

   Every fact this twin displays carries a class, because the project's
   stated differentiator is knowing the difference between what NCPOR
   publishes, what is documented but not streamed, and what we made up.

   The scheme is the dossier's own (SIH-26060-evidence-dossier.md §1):
========================================================= */

export const EVIDENCE = {
  A: {
    id: "A",
    label: "Verified",
    description: "Real and publicly accessible. Cited and reproducible.",
    tone: "success",
  },
  AEXT: {
    id: "A-ext",
    label: "Industry standard",
    description:
      "A real, citable public figure that is not Bharati-specific — an OEM, ISO or other-station standard. Never Bharati's own measured value.",
    tone: "info",
  },
  B: {
    id: "B",
    label: "Not connected",
    description:
      "Real and documented, but no public feed exists. This is an integration boundary, not a reading.",
    tone: "muted",
  },
  C: {
    id: "C",
    label: "Unconfirmed",
    description: "Existence confirmed or plausible; details not public.",
    tone: "muted",
  },
  D: {
    id: "D",
    label: "Derived",
    description: "Inferred or modelled from verified anchors. Not measured.",
    tone: "warning",
  },
  S: {
    id: "S",
    label: "Simulated",
    description: "Synthetic demo value. Carries no claim about the station.",
    tone: "warning",
  },
};

/**
 * Build a displayable fact.
 * `cls` is mandatory — a field cannot be added without declaring provenance.
 */
export function fact(label, value, cls, source, note) {
  return { label, value, cls, source, note };
}

/** A documented capability with no public feed behind it. */
export function boundary(label, source, note) {
  return { label, value: null, cls: "B", source, note };
}
