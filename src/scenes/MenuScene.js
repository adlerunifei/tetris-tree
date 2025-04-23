export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.add.text(280, 100, 'TETRIS TREE', {
      fontSize: '48px',
      fill: '#ff9800'
    });

    const playButton = this.add.text(340, 250, '▶️ PLAY', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#4caf50',
      padding: { x: 20, y: 10 }
    }).setInteractive();

    playButton.on('pointerdown', () => {
      this.scene.start('AvlScene');
    });
  }
}