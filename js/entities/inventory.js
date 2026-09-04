/**
 * inventory.js — Gerenciador de Inventário, Slots de Armas e Recursos
 * Desacoplado via WeaponSystem e AudioService.
 */
import { CONFIG } from '../config/constants.js?v=20260821';
import { audioService } from '../core/AudioService.js?v=20260821';
import { weaponSystem } from '../weapons/WeaponSystem.js?v=20260825';
import { updateWeaponHUD } from '../ui/hud.js?v=20260912';

export class InventoryManager {
  constructor() {
    this.unlockedWeapons = [
      CONFIG.WEAPONS.KNIFE.ID,
      CONFIG.WEAPONS.FLASHLIGHT.ID,
      CONFIG.WEAPONS.PLASMA_PISTOL.ID
    ];

    this.currentSlot = 3;
    this.currentWeaponId = CONFIG.WEAPONS.PLASMA_PISTOL.ID;

    this.resources = {
      energyCells: 1,
      copperWires: 0,
      thermalPastes: 0,
      clockCrystals: 0,
      pureSilicon: 0,
      silverCompound: 0,
      lithiumCells: 0,
      electrolyte: 0,
      tiCuAlloy: 0,
      pcbFloor: 0,
      pcbWall: 0,
      pcbDoor: 0,
      pcbStair: 0,
      pcbCrate: 0,
      pcbBench: 0
    };
  }

  init() {
    this.equipSlot(this.currentSlot, false);
  }

  getWeaponBySlot(slot) {
    if (slot === 1) return CONFIG.WEAPONS.KNIFE;
    if (slot === 2) return CONFIG.WEAPONS.FLASHLIGHT;
    if (slot === 3) return CONFIG.WEAPONS.PLASMA_PISTOL;
    if (slot === 4) return CONFIG.WEAPONS.ARC_SHOTGUN;
    if (slot === 5) return CONFIG.WEAPONS.BUS_RIFLE;
    return null;
  }

  equipSlot(slotNumber, playSound = true) {
    const weaponConfig = this.getWeaponBySlot(slotNumber);
    if (!weaponConfig) return;

    if (!this.unlockedWeapons.includes(weaponConfig.ID)) return;

    this.currentSlot = slotNumber;
    this.currentWeaponId = weaponConfig.ID;

    weaponSystem.switchWeaponModel(weaponConfig.ID);
    if (playSound) audioService.weaponSwitch();

    updateWeaponHUD(weaponConfig, this.unlockedWeapons, weaponSystem.isFlashlightOn());
  }

  cycleWeapon(direction) {
    let nextSlot = this.currentSlot + direction;
    if (nextSlot > 5) nextSlot = 1;
    if (nextSlot < 1) nextSlot = 5;

    while (!this.getWeaponBySlot(nextSlot) || !this.unlockedWeapons.includes(this.getWeaponBySlot(nextSlot).ID)) {
      nextSlot += direction;
      if (nextSlot > 5) nextSlot = 1;
      if (nextSlot < 1) nextSlot = 5;
      if (nextSlot === this.currentSlot) break;
    }

    this.equipSlot(nextSlot);
  }

  toggleFlashlight() {
    const active = weaponSystem.toggleFlashlight();
    audioService.flashlightClick();
    const currentWeaponConfig = this.getWeaponBySlot(this.currentSlot);
    updateWeaponHUD(currentWeaponConfig, this.unlockedWeapons, active);
    return active;
  }

  unlockWeapon(weaponId) {
    if (!this.unlockedWeapons.includes(weaponId)) {
      this.unlockedWeapons.push(weaponId);
      const currentWeaponConfig = this.getWeaponBySlot(this.currentSlot);
      updateWeaponHUD(currentWeaponConfig, this.unlockedWeapons, weaponSystem.isFlashlightOn());
    }
  }

  getResource(type) {
    return this.resources[type] !== undefined ? this.resources[type] : 0;
  }

  addResource(type, amount) {
    if (this.resources[type] === undefined) this.resources[type] = 0;
    this.resources[type] += amount;
  }

  consumeResource(type, amount) {
    if (this.resources[type] !== undefined && this.resources[type] >= amount) {
      this.resources[type] -= amount;
      return true;
    }
    return false;
  }

  getAllResources() {
    return { ...this.resources };
  }
}

export const inventory = new InventoryManager();
