import { nanoid } from 'nanoid';
import { Room, Player, Scenario, AVAILABLE_SCENARIOS, Item } from '../types';
import fs from 'fs';
import path from 'path';

export class RoomManager {
  private rooms: Map<string, Room>;
  private playerRooms: Map<string, string>;
  private readonly storageFile: string;

  constructor() {
    this.storageFile = path.join(process.cwd(), 'rooms.json');
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.loadRooms();
  }

  private loadRooms(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const rooms = JSON.parse(data);
        this.rooms = new Map(Object.entries(rooms));
        
        // Rebuild playerRooms map
        this.rooms.forEach((room, code) => {
          room.players.forEach(player => {
            this.playerRooms.set(player.id, code);
          });
        });
        
        console.log('Loaded rooms from storage:', Array.from(this.rooms.keys()));
      }
    } catch (error) {
      console.error('Error loading rooms from storage:', error);
    }
  }

  private saveRooms(): void {
    try {
      const roomsObject = Object.fromEntries(this.rooms);
      fs.writeFileSync(this.storageFile, JSON.stringify(roomsObject, null, 2));
    } catch (error) {
      console.error('Error saving rooms to storage:', error);
    }
  }

  // Add this method to expose rooms for debugging
  getRooms(): Map<string, Room> {
    return this.rooms;
  }

  private filterItemsForPlayers(items: Item[], playerCount: number): Item[] {
    // Cada jogador precisa de 5 itens
    const totalItemsNeeded = playerCount * 5;
    console.log('Total items needed:', totalItemsNeeded);
    
    // Separar itens por categoria
    const idealItems = items.filter(item => item.category === 'ideal');
    const possibleItems = items.filter(item => item.category === 'possible');
    const absurdItems = items.filter(item => item.category === 'absurd');
    
    console.log('Available items per category:', {
      ideal: idealItems.length,
      possible: possibleItems.length,
      absurd: absurdItems.length
    });

    // Garantir números exatos para cada categoria
    const idealCount = Math.round(totalItemsNeeded * 0.3);     // 30% ideais
    const possibleCount = Math.round(totalItemsNeeded * 0.4);  // 40% possíveis
    const absurdCount = totalItemsNeeded - idealCount - possibleCount; // Restante para absurdos
    
    console.log('Items per category:', {
      ideal: idealCount,
      possible: possibleCount,
      absurd: absurdCount,
      total: idealCount + possibleCount + absurdCount
    });

    // Função para pegar itens aleatórios
    const getRandomItems = (array: Item[], count: number): Item[] => {
      const shuffled = [...array].sort(() => Math.random() - 0.5);
      // Se precisamos de mais itens do que temos disponíveis, repetimos alguns
      if (count > array.length) {
        const result = [...shuffled];
        let duplicateCounter = 1;
        while (result.length < count) {
          const itemToDuplicate = shuffled[result.length % shuffled.length];
          const newId = `${itemToDuplicate.id}-${duplicateCounter}`;
          // Verifica se o ID já existe
          if (!result.some(item => item.id === newId)) {
            result.push({
              ...itemToDuplicate,
              id: newId
            });
            duplicateCounter++;
          }
        }
        return result;
      }
      return shuffled.slice(0, count);
    };
    
    // Pegar itens aleatórios de cada categoria
    const selectedIdeal = getRandomItems(idealItems, idealCount);
    const selectedPossible = getRandomItems(possibleItems, possibleCount);
    const selectedAbsurd = getRandomItems(absurdItems, absurdCount);
    
    // Combinar e embaralhar todos os itens selecionados
    const finalItems = [...selectedIdeal, ...selectedPossible, ...selectedAbsurd]
      .sort(() => Math.random() - 0.5);
    
    console.log('Final items count:', finalItems.length);
    
    return finalItems;
  }

  async createRoom(hostId: string, playerName: string, scenarioId: string, maxPlayers: number): Promise<Room> {
    if (maxPlayers < 3 || maxPlayers > 15) {
      throw new Error('Number of players must be between 3 and 15');
    }

    const scenario = AVAILABLE_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error('Invalid scenario');
    }

    // Criar uma cópia profunda do cenário para evitar referências compartilhadas
    const scenarioCopy = {
      ...scenario,
      items: scenario.items.map(item => ({ ...item })),
      situations: scenario.situations.map(situation => ({ ...situation }))
    };

    // Criar uma cópia do cenário com todos os itens disponíveis inicialmente
    const adjustedScenario = {
      ...scenarioCopy,
      items: scenarioCopy.items
    };

    const code = nanoid(6).toUpperCase();
    const host: Player = {
      id: hostId,
      name: playerName,
      selectedItems: [],
      isHost: true,
      isReady: false,
      usedItems: []
    };
    
    const room: Room = {
      id: nanoid(),
      code,
      status: 'waiting',
      hostId,
      players: [host],
      maxPlayers,
      scenario: adjustedScenario,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rooms.set(code, room);
    this.playerRooms.set(hostId, code);
    this.saveRooms();
    return room;
  }

  async joinRoom(roomCode: string, playerId: string, playerName: string): Promise<Room> {
    console.log(`Attempting to join room ${roomCode} with player ${playerName} (ID: ${playerId})`);
    console.log('Available rooms:', Array.from(this.rooms.keys()));
    
    const normalizedCode = roomCode.toUpperCase();
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      console.error(`Room ${normalizedCode} not found. Available rooms:`, Array.from(this.rooms.keys()));
      throw new Error('Room not found');
    }

    console.log('Current room state:', room);

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Verifica se o jogador já está na sala
    const existingPlayer = room.players.find(p => p.name === playerName);
    if (existingPlayer) {
      console.log(`Player ${playerName} already exists in room, updating ID from ${existingPlayer.id} to ${playerId}`);
      // Atualiza o ID do jogador existente
      existingPlayer.id = playerId;
      
      // Se o jogador era o host, atualiza o hostId também
      if (room.hostId === existingPlayer.id) {
        room.hostId = playerId;
      }
      
      room.updatedAt = new Date();
      this.playerRooms.set(playerId, normalizedCode);
      this.rooms.set(normalizedCode, room);
      this.saveRooms();
      
      console.log('Updated room state:', room);
      return room;
    }

    console.log(`Adding new player ${playerName} to room`);
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      selectedItems: [],
      isHost: false,
      isReady: false,
      usedItems: []
    };

    room.players.push(newPlayer);
    room.updatedAt = new Date();
    this.playerRooms.set(playerId, normalizedCode);
    this.rooms.set(normalizedCode, room);
    this.saveRooms();

    console.log('Final room state:', room);
    return room;
  }

  async selectItem(roomCode: string, playerId: string, itemId: string): Promise<Room> {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.selectedItems.length >= 5) {
      throw new Error('Player already has maximum items');
    }

    // Verificar se o item existe no cenário
    const itemExists = room.scenario.items.some(item => item.id === itemId);
    if (!itemExists) {
      throw new Error('Item not found in scenario');
    }

    // Verificar se o item já foi selecionado por outro jogador
    const isItemTaken = room.players.some(p => 
      p.selectedItems.includes(itemId)
    );

    if (isItemTaken) {
      throw new Error('Item already taken');
    }

    player.selectedItems.push(itemId);
    room.updatedAt = new Date();
    this.rooms.set(roomCode, room);

    return room;
  }

  handleDisconnect(playerId: string): void {
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Verifica se o jogador está usando um ID temporário
    if (playerId.startsWith('temp-')) {
      return; // Ignora desconexões de IDs temporários
    }

    // Aguarda 5 segundos antes de remover o jogador
    setTimeout(() => {
      const currentRoom = this.rooms.get(roomCode);
      if (!currentRoom) return;

      // Verifica se o jogador ainda existe com esse ID
      const playerStillExists = currentRoom.players.some(p => p.id === playerId);
      if (!playerStillExists) return; // Jogador já reconectou com novo ID

      // Remove o jogador da sala
      currentRoom.players = currentRoom.players.filter(p => p.id !== playerId);
      currentRoom.updatedAt = new Date();

      // Se não houver mais jogadores, remove a sala
      if (currentRoom.players.length === 0) {
        this.rooms.delete(roomCode);
      } else {
        // Se o host saiu, promove o próximo jogador a host
        if (currentRoom.hostId === playerId) {
          currentRoom.hostId = currentRoom.players[0].id;
          currentRoom.players[0].isHost = true;
        }
        this.rooms.set(roomCode, currentRoom);
      }

      this.playerRooms.delete(playerId);
      this.saveRooms();
    }, 5000); // 5 segundos de delay
  }

  getRoom(roomCode: string): Room | undefined {
    const normalizedCode = roomCode.toUpperCase();
    return this.rooms.get(normalizedCode);
  }

  getAvailableScenarios(): typeof AVAILABLE_SCENARIOS {
    return AVAILABLE_SCENARIOS;
  }

  async startDraft(roomCode: string): Promise<Room> {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new Error('Room is not in waiting state');
    }

    if (!room.players.every(p => p.isReady)) {
      throw new Error('All players must be ready to start');
    }

    // Filtrar itens baseado no número atual de jogadores
    const filteredItems = this.filterItemsForPlayers(room.scenario.items, room.players.length);
    room.scenario.items = filteredItems;

    // Randomize player order for draft
    const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);
    room.players = shuffledPlayers;

    // Set initial player turn
    room.currentPlayerTurn = room.players[0].id;
    room.status = 'drafting';
    room.updatedAt = new Date();

    this.rooms.set(roomCode, room);
    this.saveRooms();
    return room;
  }

  async selectItemInDraft(roomCode: string, playerId: string, itemId: string): Promise<Room> {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'drafting') {
      throw new Error('Room is not in drafting state');
    }

    if (room.currentPlayerTurn !== playerId) {
      throw new Error('Not your turn');
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Verificar se o jogador já tem 5 itens
    if (player.selectedItems.length >= 5) {
      throw new Error('Player already has maximum items');
    }

    // Verificar se o item existe no cenário
    const itemExists = room.scenario.items.some(item => item.id === itemId);
    if (!itemExists) {
      throw new Error('Item not found in scenario');
    }

    // Verificar se o item já foi selecionado por outro jogador
    const isItemTaken = room.players.some(p => p.selectedItems.includes(itemId));
    if (isItemTaken) {
      throw new Error('Item already taken');
    }

    // Adicionar item ao jogador
    player.selectedItems.push(itemId);

    // Verificar se o draft terminou (todos os jogadores têm exatamente 5 itens)
    const allPlayersHaveMaxItems = room.players.every(p => p.selectedItems.length === 5);
    console.log('Draft status:', {
      currentPlayer: player.name,
      selectedItem: itemId,
      itemsCount: player.selectedItems.length,
      allPlayersHaveMaxItems
    });

    if (allPlayersHaveMaxItems) {
      console.log('Draft completed, transitioning to situations phase');
      // Iniciar a fase de situações
      room.status = 'situations';
      room.currentPlayerTurn = undefined;
      // Definir a primeira situação
      if (room.scenario.situations && room.scenario.situations.length > 0) {
        room.currentSituation = room.scenario.situations[0];
        console.log('First situation set:', room.currentSituation);
      } else {
        console.error('No situations available in scenario');
        throw new Error('No situations available in scenario');
      }
    } else {
      // Passar para o próximo jogador que ainda não tem 5 itens
      const currentPlayerIndex = room.players.findIndex(p => p.id === playerId);
      let nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
      let nextPlayer = room.players[nextPlayerIndex];

      // Procurar o próximo jogador que ainda não tem 5 itens
      while (nextPlayer.selectedItems.length >= 5 && nextPlayerIndex !== currentPlayerIndex) {
        nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
        nextPlayer = room.players[nextPlayerIndex];
      }

      room.currentPlayerTurn = nextPlayer.id;
      console.log('Next turn:', {
        previousPlayer: player.name,
        nextPlayer: nextPlayer.name,
        nextPlayerItems: nextPlayer.selectedItems.length
      });
    }

    room.updatedAt = new Date();
    this.rooms.set(roomCode, room);
    this.saveRooms();
    return room;
  }

  async selectItemForSituation(roomCode: string, playerId: string, itemId: string): Promise<Room> {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'situations') {
      throw new Error('Room is not in situations phase');
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Verifica se o item pertence ao jogador
    if (!player.selectedItems.includes(itemId)) {
      throw new Error('Item not owned by player');
    }

    // Verifica se o item já foi usado em situações anteriores
    if (player.usedItems.includes(itemId)) {
      throw new Error('Item already used in a previous situation');
    }

    // Atualiza a escolha do jogador
    player.currentItemChoice = itemId;
    room.updatedAt = new Date();

    // Verifica se todos os jogadores fizeram suas escolhas
    const allPlayersChose = room.players.every(p => p.currentItemChoice);
    if (allPlayersChose) {
      // Adiciona os itens escolhidos à lista de itens usados
      room.players.forEach(p => {
        if (p.currentItemChoice) {
          p.usedItems.push(p.currentItemChoice);
        }
      });

      // Inicia a fase de votação
      room.status = 'voting';
      room.votes = {}; // Inicializa o objeto votes
      room.players.forEach(p => {
        p.votesReceived = 0;
      });
    }

    this.rooms.set(roomCode, room);
    return room;
  }

  async voteForPlayer(roomCode: string, voterId: string, votedPlayerId: string): Promise<Room> {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'voting') {
      throw new Error('Room is not in voting phase');
    }

    // Verifica se o jogador votado existe
    const votedPlayer = room.players.find(p => p.id === votedPlayerId);
    if (!votedPlayer) {
      throw new Error('Voted player not found');
    }

    // Inicializa o objeto votes se não existir
    if (!room.votes) {
      room.votes = {};
    }

    // Remove voto anterior se existir
    const previousVote = room.votes[voterId];
    if (previousVote) {
      const previousVotedPlayer = room.players.find(p => p.id === previousVote);
      if (previousVotedPlayer && previousVotedPlayer.votesReceived) {
        previousVotedPlayer.votesReceived--;
      }
    }

    // Registra o novo voto
    room.votes[voterId] = votedPlayerId;
    if (!votedPlayer.votesReceived) {
      votedPlayer.votesReceived = 0;
    }
    votedPlayer.votesReceived++;

    // Verifica se todos votaram
    const allPlayersVoted = room.players.every(p => room.votes && room.votes[p.id]);
    if (allPlayersVoted) {
      // Armazena os votos acumulados antes de limpar
      const accumulatedVotes = room.players.map(p => ({
        id: p.id,
        votes: p.votesReceived || 0
      }));

      // Se for a última situação, finaliza o jogo
      const currentSituationIndex = room.scenario.situations.findIndex(s => s.id === room.currentSituation?.id);
      if (currentSituationIndex === room.scenario.situations.length - 1) {
        room.status = 'finished';
      } else {
        // Move para a próxima situação
        room.currentSituation = room.scenario.situations[currentSituationIndex + 1];
        room.status = 'situations';
        // Limpa os votos da situação atual
        room.votes = {};
        room.players.forEach(p => {
          p.currentItemChoice = undefined;
          // Restaura os votos acumulados
          const accumulated = accumulatedVotes.find(av => av.id === p.id);
          if (accumulated) {
            p.votesReceived = accumulated.votes;
          }
        });
      }
    }

    room.updatedAt = new Date();
    this.rooms.set(roomCode, room);
    return room;
  }
} 