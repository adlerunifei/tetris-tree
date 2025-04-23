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
    this.score = 0;
    this.rotationNeeded = null;
    this.rotationNode = null;
  }

  create() {
    this.nodes = [];
    this.lines = [];
    this.plusButtons = [];

    this.root = new TreeNode(null, 400, 100);
    this.drawTree(this.root);

    this.dropRandomNumber();

    this.scoreText = this.add.text(820, 40, '0', { fontSize: '24px', fill: '#00ff00' });

    this.rotationButtons = this.createRotationButtons();

    const backButton = this.add.text(820, 550, '🔙 Voltar', {
      fontSize: '18px',
      backgroundColor: '#2196f3',
      padding: { x: 10, y: 5 },
      fill: '#fff'
    }).setInteractive();

    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  dropRandomNumber() {
    if (this.fallingNumber) return;
    const value = Phaser.Math.Between(10, 99);
    this.fallingNumber = this.add.text(390, 0, value, {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#f44336',
      padding: { x: 8, y: 5 }
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

    let isValidInsertion = true;
    if (node.value !== null) {
      if (side === 'left' && value >= node.value) {
        isValidInsertion = false;
      } else if (side === 'right' && value <= node.value) {
        isValidInsertion = false;
      }
    }

    if (!isValidInsertion) {
      this.tweens.add({
        targets: this.fallingNumber,
        x: 390,
        y: 100,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          const pointsText = this.add.text(400, 300, '-10', {
            fontSize: '32px',
            fill: '#ff0000',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
          }).setOrigin(0.5);

          this.score -= 10;
          this.scoreText.setText(this.score);

          this.time.delayedCall(2000, () => {
            pointsText.destroy();
          });
        }
      });
      return;
    }

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

    const pointsText = this.add.text(400, 300, '+10', {
      fontSize: '32px',
      fill: '#00ff00',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    this.score += 10;
    this.scoreText.setText(this.score);

    this.time.delayedCall(2000, () => {
      pointsText.destroy();
    });

    const [imbalancedNode, rotation] = this.checkTreeBalance(this.root);
    if (rotation) {
      this.rotationNeeded = rotation;
      this.rotationNode = imbalancedNode;
      this.promptRotation(rotation, imbalancedNode.value);
    }

    this.redrawTree();
    if (!rotation) {
      this.dropRandomNumber();
    }
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
    const text = this.add.text(400, 280, `O nó ${nodeValue} está desbalanceado. Rotação ${rotation} necessária.`,
      { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);
    const okBtn = this.add.text(400, 320, 'OK', {
      fontSize: '20px',
      fill: '#fff',
      backgroundColor: '#4caf50',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    okBtn.on('pointerdown', () => {
      [box, text, okBtn].forEach(e => e.destroy());
      this.enableRotationButtons(rotation);
    });
  }

  createRotationButtons() {
    const buttons = {};
    const labels = ['LL', 'LR', 'RL', 'RR'];
    labels.forEach((label, i) => {
      const btn = this.add.text(820, 100 + i * 50, label, {
        fontSize: '20px',
        fill: '#fff',
        backgroundColor: '#333',
        padding: { x: 10, y: 5 }
      }).setInteractive().setAlpha(0.5);

      btn.on('pointerdown', () => {
        if (!this.rotationNeeded) return;
        if (label === this.rotationNeeded) {
          this.performRotation(label);
          this.score += 10;
        } else {
          this.score -= 20;
        }
        this.scoreText.setText(this.score);
        Object.values(buttons).forEach(b => b.setAlpha(0.5));
      });

      buttons[label] = btn;
    });
    return buttons;
  }

  enableRotationButtons(correct) {
    Object.entries(this.rotationButtons).forEach(([label, btn]) => {
      btn.setAlpha(1);
      if (label === correct) {
        this.tweens.add({
          targets: btn,
          alpha: 0.3,
          duration: 400,
          yoyo: true,
          repeat: -1
        });
      }
    });
  }

  redrawTree() {
    console.log('Iniciando redesenho da árvore');
    if (this.nodes) {
      console.log('Removendo', this.nodes.length, 'nós');
      this.nodes.forEach(n => n.destroy());
    }
    if (this.lines) {
      console.log('Removendo', this.lines.length, 'linhas');
      this.lines.forEach(l => l.destroy());
    }
    if (this.plusButtons) {
      console.log('Removendo', this.plusButtons.length, 'botões');
      this.plusButtons.forEach(b => b.destroy());
    }
    
    this.nodes = [];
    this.lines = [];
    this.plusButtons = [];
    
    console.log('Desenhando nova árvore a partir da raiz:', this.root);
    this.drawTree(this.root);
  }

  drawTree(node) {
    if (!node) return;

    if (node.value !== null) {
      this.nodes.push(this.add.circle(node.x, node.y, 25, 0x4caf50));
      this.nodes.push(this.add.text(node.x - 10, node.y - 10, node.value, {
        fontSize: '20px',
        fill: '#fff'
      }));
    }

    if (node.value === null) {
      const plusRoot = this.add.text(node.x - 15, node.y - 15, '+', {
        fontSize: '28px',
        fill: '#fff',
        backgroundColor: '#2196f3',
        padding: { x: 8, y: 4 }
      }).setInteractive();
      plusRoot.on('pointerdown', () => this.insertAt(node, 'self'));
      this.plusButtons.push(plusRoot);
    }

    if (node.left) {
      this.lines.push(this.add.line(0, 0, node.x, node.y, node.left.x, node.left.y, 0xffffff).setOrigin(0, 0));
      this.drawTree(node.left);
    }

    if (node.right) {
      this.lines.push(this.add.line(0, 0, node.x, node.y, node.right.x, node.right.y, 0xffffff).setOrigin(0, 0));
      this.drawTree(node.right);
    }

    if (node.value !== null) {
      if (!node.left) {
        const plusL = this.add.text(node.x - 60, node.y + 60, '+', {
          fontSize: '28px',
          fill: '#fff',
          backgroundColor: '#2196f3',
          padding: { x: 8, y: 4 }
        }).setInteractive();
        plusL.on('pointerdown', () => this.insertAt(node, 'left'));
        this.plusButtons.push(plusL);
      }
      if (!node.right) {
        const plusR = this.add.text(node.x + 40, node.y + 60, '+', {
          fontSize: '28px',
          fill: '#fff',
          backgroundColor: '#2196f3',
          padding: { x: 8, y: 4 }
        }).setInteractive();
        plusR.on('pointerdown', () => this.insertAt(node, 'right'));
        this.plusButtons.push(plusR);
      }
    }
  }

  performRotation(type) {
    if (!this.rotationNode || !this.rotationNeeded) return;
    
    const node = this.rotationNode;
    let newRoot;
    
    console.log('Iniciando rotação:', type);
    console.log('Nó atual:', node.value);
    console.log('Estado atual da árvore:', this.root);
    
    const animateNode = (node, targetX, targetY) => {
      return new Promise((resolve) => {
        console.log('Animando nó:', node.value, 'para posição:', targetX, targetY);
        
        const nodeElements = [];
        this.nodes.forEach(n => {
          if (n.type === 'Text' && n.text === node.value.toString()) {
            nodeElements.push(n);
          } else if (n.type === 'Arc' && 
                    Math.abs(n.x - node.x) < 1 && 
                    Math.abs(n.y - node.y) < 1) {
            nodeElements.push(n);
          }
        });
        
        console.log('Elementos encontrados para animação:', nodeElements.length);
        
        if (nodeElements.length === 0) {
          console.warn('Nenhum elemento visual encontrado para o nó:', node.value);
          resolve();
          return;
        }

        this.tweens.add({
          targets: nodeElements,
          x: targetX,
          y: targetY,
          duration: 3000,
          ease: 'Power2',
          onComplete: () => {
            console.log('Animação completa para nó:', node.value);
            resolve();
          }
        });
      });
    };

    const updatePositions = async () => {
      switch (type) {
        case 'LL': {
          console.log('Executando rotação LL');
          const B = node.left;
          console.log('Nó B (filho esquerdo):', B.value);
          
          const BRight = B.right;
          node.left = BRight;
          B.right = node;
          
          const nodeOrigX = node.x;
          const nodeOrigY = node.y;
          
          B.x = nodeOrigX;
          B.y = nodeOrigY;
          node.x = nodeOrigX + 120;
          node.y = nodeOrigY + 100;
          
          if (BRight) {
            BRight.x = node.x - 60;
            BRight.y = node.y + 100;
          }
          
          try {
            await animateNode(B, B.x, B.y);
            await animateNode(node, node.x, node.y);
            
            if (BRight) {
              await animateNode(BRight, BRight.x, BRight.y);
            }
            
            newRoot = B;
            
            if (node.right) {
              node.right.x = node.x + 60;
              node.right.y = node.y + 100;
              await animateNode(node.right, node.right.x, node.right.y);
            }
            
            if (B.left) {
              B.left.x = B.x - 60;
              B.left.y = B.y + 100;
              await animateNode(B.left, B.left.x, B.left.y);
            }
          } catch (error) {
            console.error('Erro durante animação LL:', error);
          }
          break;
        }
        case 'RR': {
          console.log('Executando rotação RR');
          const B = node.right;
          console.log('Nó B (filho direito):', B.value);
          
          const BLeft = B.left;
          node.right = BLeft;
          B.left = node;
          
          const nodeOrigX = node.x;
          const nodeOrigY = node.y;
          
          B.x = nodeOrigX;
          B.y = nodeOrigY;
          node.x = nodeOrigX - 120;
          node.y = nodeOrigY + 100;
          
          try {
            if (BLeft) {
              await animateNode(BLeft, node.x + 120, node.y);
            }
            await animateNode(node, node.x, node.y);
            await animateNode(B, B.x, B.y);
            
            newRoot = B;
          } catch (error) {
            console.error('Erro durante animação RR:', error);
          }
          break;
        }
        case 'LR': {
          console.log('Executando rotação LR');
          const B = node.left;
          const C = B.right;
          console.log('Nó B (filho esquerdo):', B.value);
          console.log('Nó C (filho direito de B):', C.value);
          
          const CLeft = C.left;
          const CRight = C.right;
          
          B.right = CLeft;
          node.left = CRight;
          C.left = B;
          C.right = node;
          
          const nodeOrigX = node.x;
          const nodeOrigY = node.y;
          
          C.x = nodeOrigX;
          C.y = nodeOrigY;
          B.x = nodeOrigX - 120;
          B.y = nodeOrigY + 100;
          node.x = nodeOrigX + 120;
          node.y = nodeOrigY + 100;
          
          try {
            if (CLeft) await animateNode(CLeft, B.x + 60, B.y);
            if (CRight) await animateNode(CRight, node.x - 60, node.y);
            await animateNode(B, B.x, B.y);
            await animateNode(node, node.x, node.y);
            await animateNode(C, C.x, C.y);
            
            newRoot = C;
          } catch (error) {
            console.error('Erro durante animação LR:', error);
          }
          break;
        }
        case 'RL': {
          console.log('Executando rotação RL');
          const B = node.right;
          const C = B.left;
          console.log('Nó B (filho direito):', B.value);
          console.log('Nó C (filho esquerdo de B):', C.value);
          
          const CLeft = C.left;
          const CRight = C.right;
          
          node.right = CLeft;
          B.left = CRight;
          C.left = node;
          C.right = B;
          
          const nodeOrigX = node.x;
          const nodeOrigY = node.y;
          
          C.x = nodeOrigX;
          C.y = nodeOrigY;
          node.x = nodeOrigX - 120;
          node.y = nodeOrigY + 100;
          B.x = nodeOrigX + 120;
          B.y = nodeOrigY + 100;
          
          if (CLeft) {
            CLeft.x = node.x + 60;
            CLeft.y = node.y + 100;
          }
          if (CRight) {
            CRight.x = B.x - 60;
            CRight.y = B.y + 100;
          }
          
          try {
            await animateNode(C, C.x, C.y);
            
            await Promise.all([
              animateNode(node, node.x, node.y),
              animateNode(B, B.x, B.y)
            ]);
            
            if (CLeft) {
              await animateNode(CLeft, CLeft.x, CLeft.y);
            }
            if (CRight) {
              await animateNode(CRight, CRight.x, CRight.y);
            }
            
            newRoot = C;
            
            if (node.left) {
              node.left.x = node.x - 60;
              node.left.y = node.y + 100;
              await animateNode(node.left, node.left.x, node.left.y);
            }
            if (B.right) {
              B.right.x = B.x + 60;
              B.right.y = B.y + 100;
              await animateNode(B.right, B.right.x, B.right.y);
            }
          } catch (error) {
            console.error('Erro durante animação RL:', error);
          }
          break;
        }
      }
      
      if (node === this.root) {
        console.log('Atualizando raiz da árvore para:', newRoot.value);
        this.root = newRoot;
      }
      
      this.rotationNeeded = null;
      this.rotationNode = null;
      
      this.time.delayedCall(3100, () => {
        console.log('Redesenhando árvore após rotação');
        this.redrawTree();
        this.dropRandomNumber();
      });
    };

    updatePositions();
  }
}
