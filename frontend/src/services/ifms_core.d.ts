export function initIFMS(): void;
export var DB: any;
export function goto(route: string): void;
export function toast(message: string, kind?: string, timeoutMs?: number): void;
export function modal(config: { title: string; body: string; size?: string; footer?: string }): void;
export function closeModal(): void;
export function closeAllModals(): void;
