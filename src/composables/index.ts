// Barrel for cross-cutting custom hooks (composables). Entity data hooks
// (useDbStudents etc.) live with their CRUD in api/ by design (colocation).
export { useLocalStorage } from "./useLocalStorage";
export { useIsMobile } from "./useIsMobile";
