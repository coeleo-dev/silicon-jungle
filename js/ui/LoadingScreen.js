/**
 * LoadingScreen.js — Controlador da Tela de Carregamento Cibernética
 * Gerencia o feedback visual do carregamento de recursos e transição suave para o jogo.
 */

export class LoadingScreen {
  static #loaderEl = null;
  static #fillEl = null;
  static #statusEl = null;
  static #percentEl = null;

  static init() {
    this.#loaderEl = document.getElementById('app-loader');
    this.#fillEl = document.getElementById('loader-progress-fill');
    this.#statusEl = document.getElementById('loader-status-msg');
    this.#percentEl = document.getElementById('loader-percent-text');
  }

  /**
   * Atualiza a barra de progresso e o status textual
   * @param {number} percent Porcentagem de 0 a 100
   * @param {string} message Texto de status do carregamento
   */
  static updateProgress(percent, message) {
    if (!this.#loaderEl) this.init();

    const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));

    if (this.#fillEl) {
      this.#fillEl.style.width = `${clampedPercent}%`;
    }
    if (this.#percentEl) {
      this.#percentEl.textContent = `${clampedPercent}%`;
    }
    if (this.#statusEl && message) {
      this.#statusEl.textContent = message;
    }
  }

  /**
   * Finaliza o carregamento com fade-out suave
   */
  static finish() {
    if (!this.#loaderEl) this.init();

    this.updateProgress(100, '⚡ SYSTEM READY // CIRCUIT ENTRY UNLOCKED');

    setTimeout(() => {
      if (this.#loaderEl) {
        this.#loaderEl.style.opacity = '0';
        this.#loaderEl.style.pointerEvents = 'none';
        setTimeout(() => {
          this.#loaderEl.style.display = 'none';
        }, 500);
      }
    }, 350);
  }
}
