import { MockDataStore } from '../mock-data-store';
import {
  RoomType,
  RoomStatus,
  ServiceRequestType,
  ServiceRequestPriority,
  ServiceRequestStatus,
  MaintenancePriority,
  MaintenanceStatus,
  ChargeType,
} from '../../../types/salesforce';

describe('MockDataStore', () => {
  let store: MockDataStore;

  beforeEach(() => {
    store = new MockDataStore();
  });

  describe('Room operations', () => {
    it('should return seeded rooms', async () => {
      const rooms = await store.getRooms();
      expect(rooms.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter rooms by status', async () => {
      const rooms = await store.getRooms({ status: RoomStatus.VACANT });
      expect(rooms.every((r) => r.status === RoomStatus.VACANT)).toBe(true);
    });

    it('should filter rooms by floor', async () => {
      const rooms = await store.getRooms({ floor: 1 });
      expect(rooms.every((r) => r.floor === 1)).toBe(true);
    });

    it('should get a room by id', async () => {
      const rooms = await store.getRooms();
      const room = await store.getRoom(rooms[0].id);
      expect(room).toEqual(rooms[0]);
    });

    it('should create a new room', async () => {
      const newRoom = await store.createRoom({
        room_number: '999',
        floor: 9,
        type: RoomType.SUITE,
        status: RoomStatus.VACANT,
      });

      expect(newRoom.id).toBeDefined();
      expect(newRoom.room_number).toBe('999');
      expect(newRoom.floor).toBe(9);
    });

    it('should update a room', async () => {
      const rooms = await store.getRooms();
      const updated = await store.updateRoom(rooms[0].id, {
        status: RoomStatus.MAINTENANCE,
      });

      expect(updated?.status).toBe(RoomStatus.MAINTENANCE);
    });
  });

  describe('Service Request operations', () => {
    it('should return seeded service requests', async () => {
      const requests = await store.getServiceRequests();
      expect(requests.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter service requests by guest_id', async () => {
      const requests = await store.getServiceRequests({ guest_id: 'guest-1' });
      expect(requests.every((r) => r.guest_id === 'guest-1')).toBe(true);
    });

    it('should create a new service request', async () => {
      const newRequest = await store.createServiceRequest({
        guest_id: 'guest-3',
        room_number: '102',
        type: ServiceRequestType.MAINTENANCE,
        priority: ServiceRequestPriority.HIGH,
        description: 'Test request',
      });

      expect(newRequest.id).toBeDefined();
      expect(newRequest.status).toBe(ServiceRequestStatus.PENDING);
    });

    it('should update a service request', async () => {
      const requests = await store.getServiceRequests();
      const updated = await store.updateServiceRequest(requests[0].id, {
        status: ServiceRequestStatus.COMPLETED,
      });

      expect(updated?.status).toBe(ServiceRequestStatus.COMPLETED);
    });
  });

  describe('Maintenance Task operations', () => {
    it('should return seeded maintenance tasks', async () => {
      const tasks = await store.getMaintenanceTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter maintenance tasks by status', async () => {
      const tasks = await store.getMaintenanceTasks({ status: MaintenanceStatus.PENDING });
      expect(tasks.every((t) => t.status === MaintenanceStatus.PENDING)).toBe(true);
    });

    it('should create a new maintenance task', async () => {
      const newTask = await store.createMaintenanceTask({
        room_id: 'room-1',
        title: 'Test task',
        description: 'Test description',
        priority: MaintenancePriority.LOW,
        created_by: 'manager-1',
      });

      expect(newTask.id).toBeDefined();
      expect(newTask.status).toBe(MaintenanceStatus.PENDING);
    });

    it('should update a maintenance task', async () => {
      const tasks = await store.getMaintenanceTasks();
      const updated = await store.updateMaintenanceTask(tasks[0].id, {
        status: MaintenanceStatus.COMPLETED,
      });

      expect(updated?.status).toBe(MaintenanceStatus.COMPLETED);
    });
  });

  describe('Charge operations', () => {
    it('should return seeded charges', async () => {
      const charges = await store.getCharges();
      expect(charges.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter charges by guest_id', async () => {
      const charges = await store.getCharges({ guest_id: 'guest-1' });
      expect(charges.every((c) => c.guest_id === 'guest-1')).toBe(true);
    });

    it('should filter charges by paid status', async () => {
      const charges = await store.getCharges({ paid: false });
      expect(charges.every((c) => c.paid === false)).toBe(true);
    });

    it('should create a new charge', async () => {
      const newCharge = await store.createCharge({
        guest_id: 'guest-3',
        type: ChargeType.FOOD,
        description: 'Test charge',
        amount: 50.0,
        date: new Date().toISOString(),
      });

      expect(newCharge.id).toBeDefined();
      expect(newCharge.paid).toBe(false);
    });

    it('should update a charge', async () => {
      const charges = await store.getCharges();
      const updated = await store.updateCharge(charges[0].id, {
        paid: true,
      });

      expect(updated?.paid).toBe(true);
    });
  });

  describe('Simulated delays', () => {
    it('should simulate network latency', async () => {
      const start = Date.now();
      await store.getRooms();
      const duration = Date.now() - start;

      // Should take at least 100ms (minimum delay)
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Reset functionality', () => {
    it('should reset data to initial state', async () => {
      // Create a new room
      await store.createRoom({
        room_number: '999',
        floor: 9,
        type: RoomType.SUITE,
        status: RoomStatus.VACANT,
      });

      let rooms = await store.getRooms();
      expect(rooms.length).toBeGreaterThan(5);

      // Reset
      await store.reset();

      rooms = await store.getRooms();
      expect(rooms.length).toBe(5);
    });
  });
});
