// src/lib/action-state.ts

/**
 * Estado compartido por toda Server Action usada con useActionState
 * (o invocada a mano e inspeccionada con "error" in result /
 * "success" in result — ambos patrones siguen funcionando igual).
 *
 * TSuccess tipa el payload de éxito cuando hace falta (ej. un
 * mensaje de confirmación); por defecto es `true` para acciones que
 * solo necesitan indicar que salió bien.
 *
 * Reemplaza a los 5 tipos que había repetidos con el mismo shape:
 * FormState (apartments), ActionState (profile), ActionResult
 * (work-sessions), BasicState y AuthActionState (auth).
 */
export type ActionState<TSuccess = true> =
  | { error: string; success?: never }
  | { success: TSuccess; error?: never }
  | null;
