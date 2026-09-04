/**
 * EnemyState — Classe Base Abstrata para o State Pattern de IA
 */
export class EnemyState {
  constructor(name) {
    this.name = name;
  }

  enter(enemy) {}
  update(enemy, delta, time, ctx) {}
  exit(enemy) {}
}
