/** Injected time source so command tests never depend on wall-clock time. */
export interface Clock {
  now(): Date;
}
