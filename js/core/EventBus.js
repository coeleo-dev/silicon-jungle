/**
 * EventBus — Barramento de Eventos Central (Pub/Sub)
 * Desacopla a comunicação entre módulos do jogo.
 */
export class EventBus {
  #listeners = new Map();

  /**
   * Inscreve um ouvinte para um evento específico
   * @param {string} event Nome do evento
   * @param {Function} callback Função executada quando o evento é disparado
   * @returns {Function} Função de cancelamento de inscrição (unsubscribe)
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      console.warn(`[EventBus] Callback para o evento "${event}" deve ser uma função.`);
      return () => {};
    }

    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }

    const set = this.#listeners.get(event);
    set.add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Remove a inscrição de um ouvinte
   * @param {string} event Nome do evento
   * @param {Function} callback Função inscrita anteriormente
   */
  off(event, callback) {
    const set = this.#listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.#listeners.delete(event);
      }
    }
  }

  /**
   * Inscreve um ouvinte que será executado apenas uma única vez
   * @param {string} event Nome do evento
   * @param {Function} callback Função executada uma única vez
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      callback(payload);
    });
  }

  /**
   * Emite um evento para todos os ouvintes inscritos
   * @param {string} event Nome do evento
   * @param {*} payload Dados enviados aos ouvintes
   */
  emit(event, payload) {
    const set = this.#listeners.get(event);
    if (!set || set.size === 0) return;

    // Criar cópia defensiva para permitir mutações seguras durante a iteração
    const callbacks = Array.from(set);
    for (let i = 0; i < callbacks.length; i++) {
      try {
        callbacks[i](payload);
      } catch (err) {
        console.error(`[EventBus] Erro ao executar ouvinte para o evento "${event}":`, err);
      }
    }
  }

  /**
   * Remove todos os ouvintes de todos os eventos
   */
  clear() {
    this.#listeners.clear();
  }
}

export const eventBus = new EventBus();
