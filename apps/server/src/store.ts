import { RoomSnapshot, PublicRoomSummary } from '@ipl-auction/shared';

export interface IRoomStore {
  getRoom(code: string): Promise<RoomSnapshot | null>;
  saveRoom(room: RoomSnapshot): Promise<void>;
  deleteRoom(code: string): Promise<void>;
  listPublicRooms(): Promise<PublicRoomSummary[]>;
  getAllRooms(): Promise<RoomSnapshot[]>;
}

/**
 * In-Memory room state store with clean async interface ready for Redis swap.
 */
export class InMemoryRoomStore implements IRoomStore {
  private rooms: Map<string, RoomSnapshot> = new Map();

  async getRoom(code: string): Promise<RoomSnapshot | null> {
    const room = this.rooms.get(code.toUpperCase());
    return room ? JSON.parse(JSON.stringify(room)) : null;
  }

  async saveRoom(room: RoomSnapshot): Promise<void> {
    room.lastActivity = new Date().toISOString();
    this.rooms.set(room.code.toUpperCase(), JSON.parse(JSON.stringify(room)));
  }

  async deleteRoom(code: string): Promise<void> {
    this.rooms.delete(code.toUpperCase());
  }

  async listPublicRooms(): Promise<PublicRoomSummary[]> {
    const publicRooms: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (room.settings.isPublic && room.status !== 'COMPLETED') {
        const host = room.players.find((p) => p.isHost);
        publicRooms.push({
          code: room.code,
          hostName: host ? host.name : 'Host',
          mode: room.settings.auctionMode,
          playerCount: room.players.length,
          maxPlayers: 10,
          status: room.status,
          createdAt: room.createdAt,
        });
      }
    }
    return publicRooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getAllRooms(): Promise<RoomSnapshot[]> {
    return Array.from(this.rooms.values());
  }
}

export const roomStore = new InMemoryRoomStore();
