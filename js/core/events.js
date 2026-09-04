/**
 * Catálogo de nomes de eventos já usados no EventBus (A2).
 * Não inventar aliases — só constantes para os strings existentes.
 */
export const EVENTS = Object.freeze({
  ENTITY_DAMAGED: 'entity:damaged',
  ENTITY_KILLED: 'entity:killed',
  ITEM_COLLECTED: 'item:collected',
  COMBAT_ATTACKED: 'combat:attacked',
  COMBAT_MELEE: 'combat:melee',
  UI_BANNER: 'ui:banner',
  COMBAT_HIT: 'combat:hit',
  PLAYER_DAMAGED: 'player:damaged',
  AUDIO_PLAY: 'audio:play',
  BUILD_PLACED: 'build:placed',
  BUILD_REMOVED: 'build:removed'
});
