/**
 * Tests for Salesforce Client - Room Operations
 * Tests room CRUD operations, caching, and mock mode
 */

import MockAdapter from 'axios-mock-adapter';
import { SalesforceClient } from '../salesforce-client';
import { WorkatoSalesforceConfig } from '../config';
import { WorkatoSalesforceError } from '../errors';
import { Room, RoomType, RoomStatus, RoomCreate, RoomUpdate } from '../../../types/salesforce';

describe('SalesforceClient - Room Operations', () => {
  let client: SalesforceClient;
  let mockAdapter: MockAdapter;
  let config: WorkatoSalesforceConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'https://test.workato.com',
      apiToken: 'test-token',
      timeout: 5000,
      retryAttempts: 3,
      mockMode: false,
      cacheEnabled: true,
    };
    
    client = new SalesforceClient(config);
    
    // Access the private httpClient for mocking
    const httpClient = (client as any).httpClient;
    mockAdapter = new MockAdapter(httpClient);
  });

  afterEach(() => {
    mockAdapter.reset();
    client.clearCache();
  });

  describe('searchRooms', () => {
    const mockRooms: Room[] = [
      {
        id: 'room-1',
        room_number: '101',
        floor: 1,
        type: RoomType.STANDARD,
        status: RoomStatus.VACANT,
        current_guest_id: null,
        assigned_manager_id: 'manager-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'room-2',
        room_number: '102',
        floor: 1,
        type: RoomType.DELUXE,
        status: RoomStatus.OCCUPIED,
        current_guest_id: 'guest-1',
        assigned_manager_id: 'manager-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should search rooms successfully', async () => {
      mockAdapter.onGet('/search-rooms').reply(200, mockRooms);

      const result = await client.searchRooms({});

      expect(result).toEqual(mockRooms);
      expect(result).toHaveLength(2);
    });

    it('should search rooms with criteria', async () => {
      const criteria = { status: RoomStatus.VACANT, floor: 1 };
      mockAdapter.onGet('/search-rooms').reply(200, [mockRooms[0]]);

      const result = await client.searchRooms(criteria);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(RoomStatus.VACANT);
    });

    it('should cache search results for 60 seconds', async () => {
      mockAdapter.onGet('/search-rooms').reply(200, mockRooms);

      // First call - should hit API
      const result1 = await client.searchRooms({});
      expect(result1).toEqual(mockRooms);

      // Second call - should use cache
      mockAdapter.reset();
      const result2 = await client.searchRooms({});
      expect(result2).toEqual(mockRooms);

      // Verify no additional API call was made
      expect(mockAdapter.history.get.length).toBe(0);
    });

    it('should not use cache when caching is disabled', async () => {
      const noCacheConfig = { ...config, cacheEnabled: false };
      const noCacheClient = new SalesforceClient(noCacheConfig);
      const noCacheHttpClient = (noCacheClient as any).httpClient;
      const noCacheMockAdapter = new MockAdapter(noCacheHttpClient);

      noCacheMockAdapter.onGet('/search-rooms').reply(200, mockRooms);

      // First call
      await noCacheClient.searchRooms({});
      
      // Second call - should hit API again
      await noCacheClient.searchRooms({});

      // Verify two API calls were made
      expect(noCacheMockAdapter.history.get.length).toBe(2);

      noCacheMockAdapter.reset();
    });

    it('should retry on 500 error', async () => {
      mockAdapter
        .onGet('/search-rooms')
        .replyOnce(500)
        .onGet('/search-rooms')
        .reply(200, mockRooms);

      const result = await client.searchRooms({});

      expect(result).toEqual(mockRooms);
    });

    it('should throw error on 404', async () => {
      mockAdapter.onGet('/search-rooms').reply(404);

      await expect(client.searchRooms({})).rejects.toThrow(WorkatoSalesforceError);
    });
  });

  describe('getRoom', () => {
    const mockRoom: Room = {
      id: 'room-1',
      room_number: '101',
      floor: 1,
      type: RoomType.STANDARD,
      status: RoomStatus.VACANT,
      current_guest_id: null,
      assigned_manager_id: 'manager-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should get room by ID successfully', async () => {
      mockAdapter.onGet('/get-room/room-1').reply(200, mockRoom);

      const result = await client.getRoom('room-1');

      expect(result).toEqual(mockRoom);
      expect(result.id).toBe('room-1');
    });

    it('should cache room details for 300 seconds', async () => {
      mockAdapter.onGet('/get-room/room-1').reply(200, mockRoom);

      // First call - should hit API
      const result1 = await client.getRoom('room-1');
      expect(result1).toEqual(mockRoom);

      // Second call - should use cache
      mockAdapter.reset();
      const result2 = await client.getRoom('room-1');
      expect(result2).toEqual(mockRoom);

      // Verify no additional API call was made
      expect(mockAdapter.history.get.length).toBe(0);
    });

    it('should throw error when room not found', async () => {
      mockAdapter.onGet('/get-room/nonexistent').reply(404);

      await expect(client.getRoom('nonexistent')).rejects.toThrow(WorkatoSalesforceError);
      
      try {
        await client.getRoom('nonexistent');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.retryable).toBe(false);
      }
    });

    it('should retry on 503 error', async () => {
      mockAdapter
        .onGet('/get-room/room-1')
        .replyOnce(503)
        .onGet('/get-room/room-1')
        .reply(200, mockRoom);

      const result = await client.getRoom('room-1');

      expect(result).toEqual(mockRoom);
    });
  });

  describe('createRoom', () => {
    const roomData: RoomCreate = {
      room_number: '103',
      floor: 1,
      type: RoomType.STANDARD,
      status: RoomStatus.VACANT,
      assigned_manager_id: 'manager-1',
    };

    const createdRoom: Room = {
      id: 'room-3',
      room_number: roomData.room_number,
      floor: roomData.floor,
      type: roomData.type,
      status: roomData.status,
      assigned_manager_id: roomData.assigned_manager_id || null,
      current_guest_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should create room successfully', async () => {
      mockAdapter.onPost('/create-room', roomData).reply(201, createdRoom);

      const result = await client.createRoom(roomData);

      expect(result).toEqual(createdRoom);
      expect(result.id).toBe('room-3');
      expect(result.room_number).toBe('103');
    });

    it('should invalidate search cache after creating room', async () => {
      // First, populate the cache with a search
      const mockRooms: Room[] = [createdRoom];
      mockAdapter.onGet('/search-rooms').reply(200, mockRooms);
      await client.searchRooms({});

      // Create a new room
      mockAdapter.onPost('/create-room').reply(201, createdRoom);
      await client.createRoom(roomData);

      // Search again - should hit API because cache was invalidated
      mockAdapter.reset();
      mockAdapter.onGet('/search-rooms').reply(200, [...mockRooms, createdRoom]);
      await client.searchRooms({});

      // Verify API was called again
      expect(mockAdapter.history.get.length).toBe(1);
    });

    it('should throw error on validation failure', async () => {
      mockAdapter.onPost('/create-room').reply(400, { message: 'Invalid room data' });

      await expect(client.createRoom(roomData)).rejects.toThrow(WorkatoSalesforceError);
      
      try {
        await client.createRoom(roomData);
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.retryable).toBe(false);
      }
    });
  });

  describe('updateRoom', () => {
    const updateData: RoomUpdate = {
      status: RoomStatus.OCCUPIED,
      current_guest_id: 'guest-1',
    };

    const updatedRoom: Room = {
      id: 'room-1',
      room_number: '101',
      floor: 1,
      type: RoomType.STANDARD,
      status: RoomStatus.OCCUPIED,
      current_guest_id: 'guest-1',
      assigned_manager_id: 'manager-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    it('should update room successfully', async () => {
      mockAdapter.onPut('/update-room/room-1', updateData).reply(200, updatedRoom);

      const result = await client.updateRoom('room-1', updateData);

      expect(result).toEqual(updatedRoom);
      expect(result.status).toBe(RoomStatus.OCCUPIED);
      expect(result.current_guest_id).toBe('guest-1');
    });

    it('should invalidate all room caches after update', async () => {
      // Populate both search and get caches
      const mockRoom: Room = { ...updatedRoom, status: RoomStatus.VACANT };
      mockAdapter.onGet('/search-rooms').reply(200, [mockRoom]);
      mockAdapter.onGet('/get-room/room-1').reply(200, mockRoom);
      
      await client.searchRooms({});
      await client.getRoom('room-1');

      // Update the room
      mockAdapter.onPut('/update-room/room-1').reply(200, updatedRoom);
      await client.updateRoom('room-1', updateData);

      // Both caches should be invalidated
      mockAdapter.reset();
      mockAdapter.onGet('/search-rooms').reply(200, [updatedRoom]);
      mockAdapter.onGet('/get-room/room-1').reply(200, updatedRoom);
      
      await client.searchRooms({});
      await client.getRoom('room-1');

      // Verify both API calls were made (cache was invalidated)
      expect(mockAdapter.history.get.length).toBe(2);
    });

    it('should throw error when room not found', async () => {
      mockAdapter.onPut('/update-room/nonexistent').reply(404);

      await expect(client.updateRoom('nonexistent', updateData)).rejects.toThrow(WorkatoSalesforceError);
    });
  });

  describe('Mock Mode', () => {
    let mockClient: SalesforceClient;

    beforeEach(() => {
      const mockConfig: WorkatoSalesforceConfig = {
        ...config,
        mockMode: true,
      };
      mockClient = new SalesforceClient(mockConfig);
    });

    it('should search rooms in mock mode', async () => {
      const rooms = await mockClient.searchRooms({});

      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);
      expect(rooms[0]).toHaveProperty('id');
      expect(rooms[0]).toHaveProperty('room_number');
      expect(rooms[0]).toHaveProperty('status');
    });

    it('should get room by ID in mock mode', async () => {
      // First get a room from search to get a valid ID
      const rooms = await mockClient.searchRooms({});
      const roomId = rooms[0].id;

      const room = await mockClient.getRoom(roomId);

      expect(room).toBeDefined();
      expect(room.id).toBe(roomId);
    });

    it('should create room in mock mode', async () => {
      const roomData: RoomCreate = {
        room_number: '999',
        floor: 9,
        type: RoomType.SUITE,
        status: RoomStatus.VACANT,
      };

      const room = await mockClient.createRoom(roomData);

      expect(room).toBeDefined();
      expect(room.id).toBeDefined();
      expect(room.room_number).toBe('999');
      expect(room.floor).toBe(9);
      expect(room.type).toBe(RoomType.SUITE);
    });

    it('should update room in mock mode', async () => {
      // Get a room first
      const rooms = await mockClient.searchRooms({});
      const roomId = rooms[0].id;

      const updateData: RoomUpdate = {
        status: RoomStatus.MAINTENANCE,
      };

      const updatedRoom = await mockClient.updateRoom(roomId, updateData);

      expect(updatedRoom).toBeDefined();
      expect(updatedRoom.id).toBe(roomId);
      expect(updatedRoom.status).toBe(RoomStatus.MAINTENANCE);
    });

    it('should throw error for non-existent room in mock mode', async () => {
      await expect(mockClient.getRoom('nonexistent-id')).rejects.toThrow(WorkatoSalesforceError);
    });

    it('should filter rooms by criteria in mock mode', async () => {
      const vacantRooms = await mockClient.searchRooms({ status: RoomStatus.VACANT });

      expect(Array.isArray(vacantRooms)).toBe(true);
      vacantRooms.forEach(room => {
        expect(room.status).toBe(RoomStatus.VACANT);
      });
    });
  });
});
