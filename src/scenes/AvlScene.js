import Phaser from 'phaser';

class TreeNode {
  constructor(value, x, y) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.x = x;
    this.y = y;
  }
}

function getHeight(node) {
  if (!node) return 0;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
}

function getBalanceFactor(node) {
  return getHeight(node.left) - getHeight(node.right);
}

function detectRotation(node) {
  const balance = getBalanceFactor(node);
  if (balance > 1) {
    return getBalanceFactor(node.left) >= 0 ? 'LL' : 'LR';
  } else if (balance < -1) {
    return getBalanceFactor(node.right) <= 0 ? 'RR' : 'RL';
  }
  return null;
}

export default class AvlScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AvlScene' });
    this.root = null;
    this.rotationNeeded = null;
    this.rotationNode = null;
    this.rotationButtons = {};
  }

  create() {
    this.nodes = [];
    this.root = new TreeNode(null, 400, 100);
    this.drawTree(this.root);
    this.dropRandomNumber();
    this.createRotationButtons();
  }

  dropRandomNumber() {
    if (this.fallingNumber) return;
    const value = Phaser.Math.Between(10, 99);
    this.fallingNumber = this.add.text(390, 0, value, {
      fontSize: '24px', fill: '#fff', backgroundColor: '#f44336', padding: { x: 8, y: 5 }
    });
    this.physics.add.existing(this.fallingNumber);
    this.fallingNumber.body.setVelocityY(100);
  }

  update() {
    if (this.fallingNumber && this.fallingNumber.y >= 100) {
      this.fallingNumber.body.setVelocityY(0);
    }
  }

  insertAt(node, side) {
    if (!this.fallingNumber) return;
    const value = parseInt(this.fallingNumber.text);
    const offset = 120;
    if (node.value === null || side === 'self') {
      node.value = value;
    } else {
      const newX = side === 'left' ? node.x - offset : node.x + offset;
      const newY = node.y + 100;
      const newNode = new TreeNode(value, newX, newY);
      if (side === 'left') node.left = newNode;
      else node.right = newNode;
    }
    this.fallingNumber.destroy();
    this.fallingNumber = null;
    const [imbalancedNode, rotation] = this.checkTreeBalance(this.root);
    if (rotation) {
      this.rotationNeeded = rotation;
      this.rotationNode = imbalancedNode;
      this.promptRotation(rotation, imbalancedNode.value);
    }
    this.redrawTree();
    this.dropRandomNumber();
  }

  checkTreeBalance(node) {
    if (!node) return [null, null];
    const rotation = detectRotation(node);
    if (rotation) return [node, rotation];
    const leftCheck = this.checkTreeBalance(node.left);
    if (leftCheck[1]) return leftCheck;
    return this.checkTreeBalance(node.right);
  }

  promptRotation(rotation, nodeValue) {
    const box = this.add.rectangle(400, 300, 500, 120, 0x333333).setOrigin(0.5);
    const text = this.add.text(400, 280, `Nó ${nodeValue} está desbalanceado. Rotação ${rotation} necessária.`, {
      fontSize: '18px', fill: '#fff'
    }).setOrigin(0.5);
    const okBtn = this.add.text(400, 320, 'OK', {
      fontSize: '20px', fill: '#fff', backgroundColor: '#4caf50', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    okBtn.on('pointerdown', () => {
      [box, text, okBtn].forEach(e => e.destroy());
      this.enableRotationButtons(rotation);
    });
  }

  createRotationButtons() {
    const labels = ['LL', 'LR', 'RL', 'RR'];
    labels.forEach((label, i) => {
      const btn = this.add.text(820, 100 + i * 50, label, {
        fontSize: '20px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 5 }
      }).setInteractive().setAlpha(0.5);

      btn.on('pointerdown', () => {
        if (!this.rotationNeeded) return;
        if (label === this.rotationNeeded) {
          this.animateRotation(this.rotationNode, label);
        }
        this.rotationNeeded = null;
      });

      this.rotationButtons[label] = btn;
    });
  }

  enableRotationButtons(correct) {
    Object.entries(this.rotationButtons).forEach(([label, btn]) => {
      btn.setAlpha(1);
      if (label === correct) {
        this.tweens.add({ targets: btn, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      }
    });
  }

  animateRotation(node, type) {
    const tweenNodes = [];
    if (type === 'LL') {
      const A = node;
      const B = A.left;
      A.left = B.right;
      B.right = A;
      this.root = B;
    }
    this.redrawTree();
  }

  redrawTree() {
    if (this.nodes) this.nodes.forEach(n => n.destroy());
    if (this.lines) this.lines.forEach(l => l.destroy());
    if (this.plusButtons) this.plusButtons.forEach(b => b.destroy());
    this.nodes = [];
    this.lines = [];
    this.plusButtons = [];
    this.drawTree(this.root);
  }

  drawTree(node) {
    if (!node) return;
    if (node.value !== null) {
      this.nodes.push(this.add.circle(node.x, node.y, 25, 0x4caf50));
      this.nodes.push(this.add.text(node.x - 10, node.y - 10, node.value, {
        fontSize: '20px', fill: '#fff'
      }));
    }
    if (node.value === null) {
      const plus = this.add.text(node.x - 15, node.y - 15, '+', {
        fontSize: '28px', fill: '#fff', backgroundColor: '#2196f3', padding: { x: 8, y: 4 }
      }).setInteractive();
      plus.on('pointerdown', () => this.insertAt(node, 'self'));
      this.plusButtons.push(plus);
    }
    if (node.left) {
      this.lines.push(this.add.line(0, 0, node.x, node.y, node.left.x, node.left.y, 0xffffff).setOrigin(0, 0));
      this.drawTree(node.left);
    }
    if (node.right) {
      this.lines.push(this.add.line(0, 0, node.x, node.y, node.right.x, node.right.y, 0xffffff).setOrigin(0, 0));
      this.drawTree(node.right);
    }
  }
}
