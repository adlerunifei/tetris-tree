// Estrutura base para o jogo Tetris Tree com Phaser.js
// Inclui menu com botões e uma cena inicial para AVL Tree

import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene';
import AvlScene from './scenes/AvlScene';

// Definição da cor de fundo por dificuldade
const dificuldade = 'facil'; // poderá ser 'facil', 'medio', 'dificil'
const coresPorDificuldade = {
  facil: '#c8e6c9',    // verde claro
  medio: '#ffe082',    // amarelo claro
  dificil: '#ffcdd2'   // vermelho claro
};

const config = {
  type: Phaser.AUTO,
  width: 1000,
  height: 700,
  backgroundColor: coresPorDificuldade[dificuldade],
  scene: [MenuScene, AvlScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

new Phaser.Game(config);
