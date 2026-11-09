# MPP FPS — FPS

Um jogo de tiro em primeira pessoa (FPS) 3D, feito em um único arquivo HTML. Escolha um modo, enfrente bots, colete equipamentos e tente sobreviver.

## Como jogar

1. Abra `index.html` em um navegador moderno.
2. Escolha um modo nos cards do menu.
3. Clique em **ENTRAR NA PARTIDA**. O jogo pode solicitar tela cheia e acesso ao mouse.
4. Sobreviva e elimine todos os bots.

Não é necessário instalar dependências ou iniciar um servidor.

## Modos de jogo

| Modo | Bots | Equipamento do jogador |
|---|---:|---|
| Normal! | 18 | Começa com pistola; arsenal completo disponível no mapa |
| Na mira! | 25 | Sniper, sem troca de arma |
| Metralhando! | 15 | Metralhadoras e fuzis automáticos |
| Peiba! | 14 | Escopetas com alcance ampliado e dano reduzido à distância |
| Afiado! | 10 | Faca, sem troca de arma |
| Hardcore | 20 | Inimigos mais fortes, cenário escuro e escolha da arma inicial |
| Pistoleiros | 18 | Pistola, revólver, Glock e pistola .38 |
| Treinar é bom! | Configurável | Seis treinos de tiro, alvos e bots |
| Bazooca! | 15 | Só a bazuca, com foguetes explosivos |
| Em equipe! | 20 por equipe | Escolha vermelho ou azul; eliminação ou partida de 5 minutos |

No modo **Treinar é bom!**, escolha entre:

| Treino | Configuração |
|---|---|
| Snipando | AWM com mira, alvos a longa distância e 0 bots |
| Metralhando alvos | Alvos em movimento e 0 bots |
| Normal | Alvos, todas as armas e 5 bots de faca |
| Faca no alvo | Alvos e 10 bots de faca parados e passivos |
| Pistoleirando | Alvos em movimento e 10 bots de faca |
| PEIBAAA! | Todas as escopetas, alvos parados e em movimento e 10 bots de pistola |

As armas novas são o revólver, pistola .38, Glock, AWM e bazuca. A mira da AWM revela bots atrás das paredes, e seus disparos atravessam paredes.

Nos modos existentes, os bots continuam usando M4A1. No modo Pistoleiros, os bots usam apenas as armas de pistola do modo.

No modo Hardcore, escolha qualquer arma da lista antes de iniciar. As outras armas aparecem espalhadas pelo mapa. As escopetas incluem a Escopeta, M1014, Calibre 12 e Dois Canos.

No modo **Bazooca!**, você começa com a bazuca e munição limitada; os foguetes causam dano explosivo em área. No modo **Em equipe!**, escolha o time vermelho ou azul e o tipo de partida: eliminação total ou 5 minutos. Cada lado tem 20 bots, todas as armas ficam espalhadas pelo mapa e os aliados não atacam uns aos outros. Um bot do time adversário é o jogador CPU: ele tem 120 de vida, 100 de colete e até quatro espaços de armas; se o inventário estiver cheio, ele troca uma arma para pegar outra. Ele procura armas, coletes e kits médicos, e usa a AWM ou o sniper em combates de longa distância. Quando o CPU pega um item, ele continua no mapa e também fica disponível para o jogador. Os bots aliados seguem o líder quando não estão combatendo; a opção **Meu time segue minhas decisões** vem ativada para que seu time siga você. Na partida de 5 minutos, jogadores e bots reaparecem sem limite; vence o time com mais eliminações (empate se igualar). Ao terminar a partida, o resumo mostra eliminações, mortes, precisão e K/D do jogador.

## Controles

| Tecla / ação | Função |
|---|---|
| `W` `A` `S` `D` | Mover |
| Mouse | Mirar |
| Botão esquerdo / clique | Atirar ou atacar com a faca |
| Botão direito | Mirar e aproximar a visão |
| `E` | Coletar armas, kits médicos ou coletes |
| `R` | Recarregar |
| `1`–`4` / roda do mouse | Trocar arma do inventário |
| `Shift` | Correr |
| `Esc` | Pausar ou continuar |
| `F` | Alternar tela cheia |
| `L` | Ligar ou desligar a lanterna |

## Recursos

- Mapa 3D com bots, obstáculos e minimapa.
- Armas e itens de recuperação espalhados pelo mapa.
- Inventário de armas e munição.
- Sniper com mira telescópica.
- Indicadores de dano, sons de combate e animações de eliminação.
- Menus e paletas do cenário diferentes para cada modo.
- Modo Hardcore noturno: a lanterna ilumina o caminho à frente; `L` alterna a luz sem cobrir a visão central.
- Partida em tela cheia quando permitida pelo navegador.

Os efeitos sonoros começam após uma interação do jogador, de acordo com as regras de áudio do navegador. Se o navegador não permitir capturar o mouse, ainda é possível mirar movendo o cursor sobre o jogo.

---

# MPP FPS — FPS (English)

A 3D first-person shooter (FPS) built as a single HTML file. Choose a game mode, fight bots, collect equipment, and try to survive.

## How to play

1. Open `index.html` in a modern browser.
2. Choose a mode from the menu cards.
3. Click **ENTRAR NA PARTIDA** (Start Match). The game may request fullscreen and mouse access.
4. Survive and eliminate all bots.

No dependencies or server setup are required.

## Game modes

| Mode | Bots | Player loadout |
|---|---:|---|
| Normal! | 18 | Starts with a pistol; full arsenal available on the map |
| Na mira! (Deadly Aim!) | 25 | Sniper rifle; weapon switching is disabled |
| Metralhando! (Spray and Pray!) | 15 | Machine guns and automatic rifles |
| Peiba! (Shotgun Showdown!) | 14 | Shotguns with extended range and reduced damage at a distance |
| Afiado! (Sharp!) | 10 | Knife; weapon switching is disabled |
| Hardcore | 20 | Tougher enemies, a dark map, and player-selected starting weapon |
| Bazooca! | 15 | Bazooka only, with explosive rockets |
| Em equipe! | 20 per team | Choose red or blue; elimination or 5-minute match |

Bots in the original modes use an M4A1.

In Hardcore mode, choose any weapon from the list before starting. The other weapons are placed around the map. Shotguns include the Escopeta, M1014, Calibre 12, and Dois Canos (double-barrel).

**Pistoleiros** restricts the match to the pistol, revolver, Glock, and .38 pistol. **Treinar é bom!** offers six practice presets:

| Practice | Setup |
|---|---|
| Snipando | Scoped AWM, long-range targets, and 0 bots |
| Metralhando alvos | Moving targets and 0 bots |
| Normal | Targets, every weapon, and 5 knife bots |
| Faca no alvo | Targets and 10 stationary, passive knife bots |
| Pistoleirando | Moving targets and 10 knife bots |
| PEIBAAA! | All shotguns, static and moving targets, and 10 pistol bots |

New weapons are the revolver, .38 pistol, Glock, AWM, and bazooka. The AWM scope reveals bots behind walls, and its shots penetrate walls. Existing modes keep their M4A1 bots; Pistoleiros uses only its pistol weapons for bots.

In **Bazooca!**, you start with the bazooka and limited ammunition; rockets deal area damage. In **Em equipe!**, choose the red or blue side and match type: elimination or 5 minutes. Each side has 20 bots, every weapon is scattered around the map, and teammates do not attack one another. One opposing bot is the CPU player: it has 120 health, 100 armor, and up to four weapon slots, replacing a weapon when its inventory is full. It searches for weapons, armor, and medical kits, and uses the AWM or sniper for long-range fights. Items picked up by the CPU stay on the map and remain available to the player. Teammates follow their leader when not engaged in combat; **My team follows my decisions** is enabled by default so your team follows you. In the 5-minute match, players and bots respawn without limit; the side with the most eliminations wins (ties are draws). The end-of-match summary shows the player's eliminations, deaths, accuracy, and K/D.

## Controls

| Key / action | Function |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse | Aim |
| Left mouse button / click | Fire or attack with the knife |
| Right mouse button | Aim and zoom |
| `E` | Collect weapons, medkits, or armor |
| `R` | Reload |
| `1`–`4` / mouse wheel | Switch inventory weapon |
| `Shift` | Sprint |
| `Esc` | Pause or resume |
| `F` | Toggle fullscreen |
| `L` | Toggle the flashlight |

## Features

- 3D map with bots, obstacles, and a minimap.
- Weapons and recovery items placed around the map.
- Weapon and ammunition inventory.
- Sniper scope.
- Damage indicators, combat sounds, and elimination animations.
- Distinct themed menus and in-game color palettes for every game mode.
- A dark Hardcore mode where the flashlight lights the path ahead; press `L` to toggle it without covering the center of the view.
- Fullscreen play when supported by the browser.

Sound effects begin after player interaction, in accordance with browser audio policies. If the browser does not allow mouse capture, you can still aim by moving the cursor over the game.