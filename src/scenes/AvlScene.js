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
    this.usedNumbers = new Set(); // Para controlar números já usados
  }

  preload() {
    // Carregar os sons
    this.load.audio('collect', 'src/sounds/collect.wav');
    this.load.audio('error', 'src/sounds/error.wav');
  }

  create() {
    // Criar os sons
    this.collectSound = this.sound.add('collect');
    this.errorSound = this.sound.add('error');

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
    
    // Gerar número único
    let value;
    do {
      value = Phaser.Math.Between(10, 99);
    } while (this.usedNumbers.has(value));
    
    this.usedNumbers.add(value);
    
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
    
    // Validação da inserção
    let isValidInsertion = true;
    if (node.value !== null) {
      if (side === 'left' && value >= node.value) {
        isValidInsertion = false;
      } else if (side === 'right' && value <= node.value) {
        isValidInsertion = false;
      }
    }

    if (!isValidInsertion) {
      this.errorSound.play();
      
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

    this.collectSound.play();

    if (node.value === null || side === 'self') {
      node.value = value;
    } else {
      const newX = side === 'left' ? node.x - this.getHorizontalSpacing(1) : node.x + this.getHorizontalSpacing(1);
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

    // Verificar balanceamento após inserção
    this.checkAndRotate();
  }

  async checkAndRotate() {
    const [imbalancedNode, rotation] = this.checkTreeBalance(this.root);
    
    if (rotation) {
      this.rotationNeeded = rotation;
      this.rotationNode = imbalancedNode;
      
      // Aguardar a conclusão da rotação atual
      await new Promise(resolve => {
        this.promptRotation(rotation, imbalancedNode.value, resolve);
      });
      
      // Após a rotação estar completa, verificar novamente
      this.time.delayedCall(2200, () => {
        this.checkAndRotate();
      });
    } else {
      // Se não há mais rotações necessárias, continuar o jogo
      this.redrawTree();
      this.dropRandomNumber();
    }
  }

  promptRotation(rotation, nodeValue, resolveCallback) {
    const alertGroup = this.add.group();

    const overlay = this.add.rectangle(0, 0, 1000, 700, 0x000000, 0.5)
      .setOrigin(0)
      .setDepth(100);
    alertGroup.add(overlay);

    const borderWidth = 4;
    const boxWidth = 500;
    const boxHeight = 160;
    
    const border = this.add.rectangle(400, 300, boxWidth + borderWidth, boxHeight + borderWidth, 0x2c3e50)
      .setOrigin(0.5)
      .setDepth(101);
    alertGroup.add(border);
    
    const box = this.add.rectangle(400, 300, boxWidth, boxHeight, 0x34495e)
      .setOrigin(0.5)
      .setDepth(102);
    box.setInteractive();
    alertGroup.add(box);

    const text = this.add.text(400, 270, 
      `O nó ${nodeValue} está desbalanceado.\nRotação ${rotation} necessária.`, {
      fontSize: '24px',
      fill: '#ecf0f1',
      align: 'center'
    })
    .setOrigin(0.5)
    .setDepth(103);
    alertGroup.add(text);

    const okBtn = this.add.container(400, 340).setDepth(103);
    const btnBg = this.add.rectangle(0, 0, 100, 40, 0x27ae60)
      .setInteractive()
      .on('pointerover', () => btnBg.setFillStyle(0x2ecc71))
      .on('pointerout', () => btnBg.setFillStyle(0x27ae60));
    
    const btnText = this.add.text(0, 0, 'OK', {
      fontSize: '20px',
      fill: '#fff'
    }).setOrigin(0.5);

    okBtn.add([btnBg, btnText]);
    alertGroup.add(okBtn);

    btnBg.on('pointerdown', () => {
      alertGroup.destroy(true);
      this.enableRotationButtons(rotation);
      
      // Aguardar a conclusão da rotação antes de resolver a promessa
      const checkRotationComplete = () => {
        if (!this.rotationNeeded) {
          resolveCallback();
        } else {
          this.time.delayedCall(100, checkRotationComplete);
        }
      };
      
      this.time.delayedCall(100, checkRotationComplete);
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
      this.tweens.killTweensOf(btn);
      
      if (label === correct) {
        btn.setAlpha(1);
        this.tweens.add({
          targets: btn,
          alpha: 0.3,
          duration: 400,
          yoyo: true,
          repeat: -1
        });
      } else {
        btn.setAlpha(0.5);
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

    const levelSpacing = 100; // Espaçamento vertical entre níveis
    const currentLevel = this.getNodeLevel(node);
    const horizontalSpacing = this.getHorizontalSpacing(currentLevel);

    // Desenha o nó atual
    if (node.value !== null) {
      this.nodes.push(this.add.circle(node.x, node.y, 25, 0x4caf50));
      this.nodes.push(this.add.text(node.x - 10, node.y - 10, node.value, {
        fontSize: '20px',
        fill: '#fff'
      }));
    }

    // Botão '+' para nó raiz vazio
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

    // Desenha conexões e subárvores
    if (node.left) {
      node.left.x = node.x - horizontalSpacing;
      node.left.y = node.y + levelSpacing;
      this.lines.push(this.add.line(0, 0, node.x, node.y, node.left.x, node.left.y, 0xffffff).setOrigin(0, 0));
      this.drawTree(node.left);
    }

    if (node.right) {
      node.right.x = node.x + horizontalSpacing;
      node.right.y = node.y + levelSpacing;
      this.lines.push(this.add.line(0, 0, node.x, node.y, node.right.x, node.right.y, 0xffffff).setOrigin(0, 0));
      this.drawTree(node.right);
    }

    // Adiciona botões '+' para nós não vazios
    if (node.value !== null) {
      const nextLevelSpacing = this.getHorizontalSpacing(currentLevel + 1);
      
      if (!node.left) {
        const leftX = node.x - nextLevelSpacing;
        const leftY = node.y + levelSpacing;
        const plusL = this.add.text(leftX - 15, leftY - 15, '+', {
          fontSize: '28px',
          fill: '#fff',
          backgroundColor: '#2196f3',
          padding: { x: 8, y: 4 }
        }).setInteractive();
        plusL.on('pointerdown', () => this.insertAt(node, 'left'));
        this.plusButtons.push(plusL);
      }
      
      if (!node.right) {
        const rightX = node.x + nextLevelSpacing;
        const rightY = node.y + levelSpacing;
        const plusR = this.add.text(rightX - 15, rightY - 15, '+', {
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

  // Novo método para calcular o nível de um nó
  getNodeLevel(node) {
    let level = 1;
    let current = this.root;
    while (current && current !== node) {
      if (node.value < current.value) {
        current = current.left;
      } else {
        current = current.right;
      }
      level++;
    }
    return level;
  }

  // Ajuste no cálculo do espaçamento horizontal
  getHorizontalSpacing(level) {
    const baseSpacing = 200; // Aumentado de 160 para 200
    const reductionFactor = 0.6; // Aumentado de 0.5 para 0.6 para redução mais gradual
    return Math.max(60, baseSpacing * Math.pow(reductionFactor, level - 1));
  }

  performRotation(type) {
    if (!this.rotationNode || !this.rotationNeeded) return;
    
    Object.values(this.rotationButtons).forEach(btn => {
      btn.setAlpha(0.5);
      this.tweens.killTweensOf(btn);
    });

    const node = this.rotationNode;
    let newRoot;
    
    console.log('Iniciando rotação:', type);
    console.log('Estado inicial:', {
      nodeValue: node.value,
      nodeX: node.x,
      nodeY: node.y,
      rightChild: node.right ? node.right.value : null,
      leftChild: node.left ? node.left.value : null
    });
    
    const getNewNodePosition = (baseNode, isLeft, level) => {
      const spacing = this.getHorizontalSpacing(level);
      const newPos = {
        x: baseNode.x + (isLeft ? -spacing : spacing),
        y: baseNode.y + 100
      };
      console.log('Calculando nova posição:', {
        baseNodeValue: baseNode.value,
        isLeft,
        level,
        spacing,
        newX: newPos.x,
        newY: newPos.y
      });
      return newPos;
    };

    const animateNode = (node, targetX, targetY) => {
      return new Promise((resolve) => {
        if (!node) {
          console.log('Tentativa de animar nó nulo');
          resolve();
          return;
        }
        
        console.log('Iniciando animação:', {
          nodeValue: node.value,
          fromX: node.x,
          fromY: node.y,
          toX: targetX,
          toY: targetY
        });
        
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
        
        console.log('Elementos encontrados para animação:', {
          nodeValue: node.value,
          count: nodeElements.length,
          elements: nodeElements.map(e => e.type)
        });
        
        if (nodeElements.length === 0) {
          console.warn('Nenhum elemento visual encontrado para o nó:', node.value);
          resolve();
          return;
        }

        this.tweens.add({
          targets: nodeElements,
          x: targetX,
          y: targetY,
          duration: 2000,
          ease: 'Power2',
          onComplete: () => {
            node.x = targetX;
            node.y = targetY;
            console.log('Animação completa:', {
              nodeValue: node.value,
              finalX: node.x,
              finalY: node.y
            });
            resolve();
          }
        });
      });
    };

    const updatePositions = async () => {
      try {
        switch (type) {
          case 'RR': {
            console.log('Iniciando rotação RR');
            const A = node;
            const B = node.right;
            
            if (!B) {
              console.error('Rotação RR impossível: nó direito não existe');
              return;
            }
            
            console.log('Estado antes da rotação:', {
              A: { value: A.value, x: A.x, y: A.y },
              B: { value: B.value, x: B.x, y: B.y },
              BLeft: B.left ? { value: B.left.value, x: B.left.x, y: B.left.y } : null
            });
            
            // 1. Salvar posição original de A
            const originalX = A.x;
            const originalY = A.y;
            
            // 2. Realizar a rotação estrutural
            const BLeft = B.left;
            A.right = BLeft;
            B.left = A;
            
            // 3. Calcular novas posições
            // B vai para a posição original de A
            B.x = originalX;
            B.y = originalY;
            
            // A vai para a esquerda de B
            const newAPos = getNewNodePosition(B, true, 1);
            A.x = newAPos.x;
            A.y = newAPos.y;
            
            // Se B tinha um filho esquerdo, ele vai para a direita de A
            if (BLeft) {
                const newBLeftPos = getNewNodePosition(A, false, 2);
                BLeft.x = newBLeftPos.x;
                BLeft.y = newBLeftPos.y;
            }
            
            // 4. Animar as mudanças
            console.log('Iniciando animações');
            
            // Primeiro mover B para a posição da raiz
            await animateNode(B, B.x, B.y);
            
            // Depois mover A e o antigo filho esquerdo de B (se existir)
            await Promise.all([
                animateNode(A, A.x, A.y),
                BLeft ? animateNode(BLeft, BLeft.x, BLeft.y) : Promise.resolve()
            ]);
            
            console.log('Estado final após rotação:', {
                newRoot: B.value,
                leftChild: A.value,
                rightChild: B.right ? B.right.value : null
            });
            
            newRoot = B;
            break;
          }
          case 'LL': {
            console.log('Executando rotação LL');
            const B = node.left;
            if (!B) return;
            
            const BRight = B.right;
            node.left = BRight;
            B.right = node;
            
            const oldNodeX = node.x;
            const oldNodeY = node.y;
            
            B.x = oldNodeX;
            B.y = oldNodeY;
            
            const newNodePos = getNewNodePosition(B, false, 1);
            node.x = newNodePos.x;
            node.y = newNodePos.y;
            
            if (BRight) {
              const BRightPos = getNewNodePosition(node, true, 2);
              BRight.x = BRightPos.x;
              BRight.y = BRightPos.y;
            }
            
            await animateNode(B, B.x, B.y);
            await animateNode(node, node.x, node.y);
            if (BRight) {
              await animateNode(BRight, BRight.x, BRight.y);
            }
            
            newRoot = B;
            break;
          }
          
          case 'RL': {
            console.log('Executando rotação RL');
            const B = node.right;
            if (!B || !B.left) return;
            
            const C = B.left;
            const CLeft = C.left;
            const CRight = C.right;
            
            node.right = CLeft;
            B.left = CRight;
            C.left = node;
            C.right = B;
            
            const oldNodeX = node.x;
            const oldNodeY = node.y;
            
            C.x = oldNodeX;
            C.y = oldNodeY;
            
            const leftPos = getNewNodePosition(C, true, 1);
            const rightPos = getNewNodePosition(C, false, 1);
            
            node.x = leftPos.x;
            node.y = leftPos.y;
            B.x = rightPos.x;
            B.y = rightPos.y;
            
            if (CLeft) {
              const CLeftPos = getNewNodePosition(node, false, 2);
              CLeft.x = CLeftPos.x;
              CLeft.y = CLeftPos.y;
            }
            if (CRight) {
              const CRightPos = getNewNodePosition(B, true, 2);
              CRight.x = CRightPos.x;
              CRight.y = CRightPos.y;
            }
            
            await animateNode(C, C.x, C.y);
            await Promise.all([
              animateNode(node, node.x, node.y),
              animateNode(B, B.x, B.y)
            ]);
            if (CLeft) await animateNode(CLeft, CLeft.x, CLeft.y);
            if (CRight) await animateNode(CRight, CRight.x, CRight.y);
            
            newRoot = C;
            break;
          }
          
          case 'LR': {
            console.log('Executando rotação LR');
            const B = node.left;
            if (!B || !B.right) return;
            
            const C = B.right;
            const CLeft = C.left;
            const CRight = C.right;
            
            B.right = CLeft;
            node.left = CRight;
            C.left = B;
            C.right = node;
            
            const oldNodeX = node.x;
            const oldNodeY = node.y;
            
            C.x = oldNodeX;
            C.y = oldNodeY;
            
            const leftPos = getNewNodePosition(C, true, 1);
            const rightPos = getNewNodePosition(C, false, 1);
            
            B.x = leftPos.x;
            B.y = leftPos.y;
            node.x = rightPos.x;
            node.y = rightPos.y;
            
            if (CLeft) {
              const BRightPos = getNewNodePosition(B, false, 2);
              CLeft.x = BRightPos.x;
              CLeft.y = BRightPos.y;
            }
            if (CRight) {
              const ALeftPos = getNewNodePosition(node, true, 2);
              CRight.x = ALeftPos.x;
              CRight.y = ALeftPos.y;
            }
            
            await animateNode(C, C.x, C.y);
            await Promise.all([
              animateNode(B, B.x, B.y),
              animateNode(node, node.x, node.y)
            ]);
            if (CLeft) await animateNode(CLeft, CLeft.x, CLeft.y);
            if (CRight) await animateNode(CRight, CRight.x, CRight.y);
            
            newRoot = C;
            break;
          }
        }
        
        if (node === this.root) {
          console.log('Atualizando raiz da árvore:', {
            oldRoot: node.value,
            newRoot: newRoot.value
          });
          this.root = newRoot;
        }
        
        this.rotationNeeded = null;
        this.rotationNode = null;
        
        this.time.delayedCall(2100, () => {
          console.log('Iniciando redesenho final da árvore');
          this.redrawTree();
          this.dropRandomNumber();
        });
      } catch (error) {
        console.error('Erro durante rotação:', error);
        console.error('Stack:', error.stack);
        this.rotationNeeded = null;
        this.rotationNode = null;
        this.redrawTree();
      }
    };

    updatePositions();
  }

  checkTreeBalance(node) {
    if (!node) return [null, null];
    const rotation = detectRotation(node);
    if (rotation) return [node, rotation];
    const leftCheck = this.checkTreeBalance(node.left);
    if (leftCheck[1]) return leftCheck;
    return this.checkTreeBalance(node.right);
  }
}
