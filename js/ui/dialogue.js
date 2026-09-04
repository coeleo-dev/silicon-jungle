/**
 * dialogue.js — Interface Visual de Diálogo com Efeito Máquina de Escrever
 * Integrado ao AudioService.
 */
import { audioService } from '../core/AudioService.js?v=20260821';

let dialogueBoxEl = null;
let speakerNameEl = null;
let speakerRoleEl = null;
let dialogueTextEl = null;
let promptAdvanceEl = null;

let isDialogueActive = false;
let currentLines = [];
let currentLineIndex = 0;
let currentText = '';
let targetText = '';
let charIndex = 0;
let typewriterTimer = null;
let isTyping = false;
let onDialogueComplete = null;

export function initDialogueUI() {
  dialogueBoxEl = document.getElementById('dialogue-overlay');
  speakerNameEl = document.getElementById('dialogue-speaker-name');
  speakerRoleEl = document.getElementById('dialogue-speaker-role');
  dialogueTextEl = document.getElementById('dialogue-text');
  promptAdvanceEl = document.getElementById('dialogue-advance-prompt');

  window.addEventListener('keydown', (e) => {
    if (!isDialogueActive) return;
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
      e.stopPropagation();
      advanceDialogue();
    }
  }, true);

  if (dialogueBoxEl) {
    dialogueBoxEl.addEventListener('click', (e) => {
      if (!isDialogueActive) return;
      e.stopPropagation();
      advanceDialogue();
    });
  }
}

export function startDialogue(speakerName, speakerRole, lines, onComplete = null) {
  if (!dialogueBoxEl) initDialogueUI();

  isDialogueActive = true;
  currentLines = Array.isArray(lines) ? lines : [lines];
  currentLineIndex = 0;
  onDialogueComplete = onComplete;

  if (speakerNameEl) speakerNameEl.textContent = speakerName.toUpperCase();
  if (speakerRoleEl) speakerRoleEl.textContent = speakerRole.toUpperCase();

  if (dialogueBoxEl) {
    dialogueBoxEl.classList.add('visible');
  }

  audioService.play('playTransistorTalk');
  displayCurrentLine();
}

function displayCurrentLine() {
  if (currentLineIndex >= currentLines.length) {
    closeDialogue();
    return;
  }

  targetText = currentLines[currentLineIndex];
  currentText = '';
  charIndex = 0;
  isTyping = true;

  if (dialogueTextEl) dialogueTextEl.textContent = '';
      if (promptAdvanceEl) promptAdvanceEl.textContent = '... TYPING ...';

  if (typewriterTimer) clearInterval(typewriterTimer);

  typewriterTimer = setInterval(() => {
    if (charIndex < targetText.length) {
      const char = targetText[charIndex];
      currentText += char;
      charIndex++;
      if (dialogueTextEl) dialogueTextEl.textContent = currentText;

      if (charIndex % 2 === 0 && char !== ' ') {
        audioService.play('playTypewriterBeep');
      }
    } else {
      clearInterval(typewriterTimer);
      isTyping = false;
      if (promptAdvanceEl) {
        promptAdvanceEl.textContent = currentLineIndex < currentLines.length - 1 
          ? '[E / SPACE / CLICK] CONTINUE ▶' 
          : '[E / SPACE / CLICK] DONE ✔';
      }
    }
  }, 22);
}

export function advanceDialogue() {
  if (isTyping) {
    clearInterval(typewriterTimer);
    if (dialogueTextEl) dialogueTextEl.textContent = targetText;
    isTyping = false;
    if (promptAdvanceEl) {
      promptAdvanceEl.textContent = currentLineIndex < currentLines.length - 1 
        ? '[E / SPACE / CLICK] CONTINUE ▶' 
        : '[E / SPACE / CLICK] DONE ✔';
    }
    return;
  }

  currentLineIndex++;
  if (currentLineIndex < currentLines.length) {
    audioService.play('playTransistorTalk');
    displayCurrentLine();
  } else {
    closeDialogue();
  }
}

let lastDialogueCloseTime = 0;

export function getLastDialogueCloseTime() {
  return lastDialogueCloseTime;
}

export function closeDialogue() {
  isDialogueActive = false;
  lastDialogueCloseTime = Date.now();
  if (typewriterTimer) clearInterval(typewriterTimer);

  if (dialogueBoxEl) {
    dialogueBoxEl.classList.remove('visible');
  }

  if (typeof onDialogueComplete === 'function') {
    const cb = onDialogueComplete;
    onDialogueComplete = null;
    cb();
  }
}

export function isDialogueOpen() {
  return isDialogueActive;
}
