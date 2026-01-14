import {
  Room,
  RoomType,
  RoomStatus,
  RoomSearchCriteria,
  ServiceRequest,
  ServiceRequestType,
  ServiceRequestPriority,
  ServiceRequestStatus,
  ServiceRequestCreate,
  ServiceRequestSearch,
  ServiceRequestUpdate,
  MaintenanceTask,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTaskCreate,
  MaintenanceTaskSearch,
  MaintenanceTaskUpdate,
  Charge,
  ChargeType,
  ChargeCreate,
  ChargeSearch,
  ChargeUpdate,
} from '../../types/salesforce';

/**
 * Mock data store for development and testing
 * Provides in-memory storage with simulated network latency
 */
export class MockDataStore {
  private rooms: Map<string, Room> = new Map();
  private serviceRequests: Map<string, ServiceRequest> = new Map();
  private maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private charges: Map<string, Charge> = new Map();
  private idCounter = 1;

  constructor() {
    this.seedData();
  }

  /**
   * Seed the store with realistic test data
   */
  private seedData(): void {
    // Seed 22 rooms (matching database seed data)
    const rooms: Omit<Room, 'id' | 'created_at' | 'updated_at'>[] = [];
    
    // Floor 1: Rooms 100-110
    for (let num = 100; num <= 110; num++) {
      const type = num <= 106 ? RoomType.STANDARD : num <= 109 ? RoomType.DELUXE : RoomType.SUITE;
      const guestIndex = num - 100;
      let status: RoomStatus;
      let currentGuestId: string | null;
      
      if (guestIndex < 5) {
        status = RoomStatus.OCCUPIED;
        currentGuestId = `guest-${guestIndex + 1}`;
      } else if (num === 106) {
        status = RoomStatus.CLEANING;
        currentGuestId = null;
      } else if (num === 107) {
        status = RoomStatus.MAINTENANCE;
        currentGuestId = null;
      } else {
        status = RoomStatus.VACANT;
        currentGuestId = null;
      }
      
      rooms.push({
        room_number: num.toString(),
        floor: 1,
        type,
        status,
        current_guest_id: currentGuestId,
        assigned_manager_id: 'manager-1',
      });
    }
    
    // Floor 2: Rooms 200-210
    for (let num = 200; num <= 210; num++) {
      const type = num <= 206 ? RoomType.STANDARD : num <= 209 ? RoomType.DELUXE : RoomType.SUITE;
      const guestIndex = (num - 200) + 5;
      let status: RoomStatus;
      let currentGuestId: string | null;
      
      if (guestIndex >= 5 && guestIndex < 10) {
        status = RoomStatus.OCCUPIED;
        currentGuestId = `guest-${guestIndex + 1}`;
      } else if (num === 206) {
        status = RoomStatus.CLEANING;
        currentGuestId = null;
      } else if (num === 207) {
        status = RoomStatus.MAINTENANCE;
        currentGuestId = null;
      } else {
        status = RoomStatus.VACANT;
        currentGuestId = null;
      }
      
      rooms.push({
        room_number: num.toString(),
        floor: 2,
        type,
        status,
        current_guest_id: currentGuestId,
        assigned_manager_id: num <= 205 ? 'manager-1' : 'manager-2',
      });
    }

    rooms.forEach((room) => {
      const id = `room-${this.idCounter++}`;
      this.rooms.set(id, {
        id,
        ...room,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    // Seed 3 service requests
    const serviceRequests: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        guest_id: 'guest-1',
        room_number: '101',
        type: ServiceRequestType.HOUSEKEEPING,
        priority: ServiceRequestPriority.MEDIUM,
        description: 'Need fresh towels and toiletries',
        status: ServiceRequestStatus.PENDING,
        salesforce_ticket_id: 'SF-001',
      },
      {
        guest_id: 'guest-2',
        room_number: '201',
        type: ServiceRequestType.ROOM_SERVICE,
        priority: ServiceRequestPriority.HIGH,
        description: 'Breakfast order for 2 people',
        status: ServiceRequestStatus.IN_PROGRESS,
        salesforce_ticket_id: 'SF-002',
      },
      {
        guest_id: 'guest-1',
        room_number: '101',
        type: ServiceRequestType.CONCIERGE,
        priority: ServiceRequestPriority.LOW,
        description: 'Restaurant recommendations for tonight',
        status: ServiceRequestStatus.COMPLETED,
        salesforce_ticket_id: 'SF-003',
      },
    ];

    serviceRequests.forEach((sr) => {
      const id = `service-${this.idCounter++}`;
      this.serviceRequests.set(id, {
        id,
        ...sr,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    // Seed 2 maintenance tasks
    const maintenanceTasks: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        room_id: 'room-5',
        title: 'Fix air conditioning unit',
        description: 'AC not cooling properly, needs inspection',
        priority: MaintenancePriority.URGENT,
        status: MaintenanceStatus.IN_PROGRESS,
        assigned_to: 'maintenance-staff-1',
        created_by: 'manager-2',
      },
      {
        room_id: 'room-4',
        title: 'Replace bathroom fixtures',
        description: 'Leaky faucet in bathroom sink',
        priority: MaintenancePriority.MEDIUM,
        status: MaintenanceStatus.PENDING,
        assigned_to: null,
        created_by: 'manager-2',
      },
    ];

    maintenanceTasks.forEach((mt) => {
      const id = `maintenance-${this.idCounter++}`;
      this.maintenanceTasks.set(id, {
        id,
        ...mt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    // Seed 4 charges
    const charges: Omit<Charge, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        guest_id: 'guest-1',
        type: ChargeType.ROOM,
        description: 'Room 101 - 3 nights',
        amount: 450.0,
        date: new Date().toISOString(),
        paid: false,
      },
      {
        guest_id: 'guest-1',
        type: ChargeType.FOOD,
        description: 'Room service - Dinner',
        amount: 65.5,
        date: new Date().toISOString(),
        paid: false,
      },
      {
        guest_id: 'guest-2',
        type: ChargeType.ROOM,
        description: 'Room 201 - 2 nights',
        amount: 380.0,
        date: new Date().toISOString(),
        paid: true,
      },
      {
        guest_id: 'guest-2',
        type: ChargeType.SERVICE,
        description: 'Spa treatment',
        amount: 120.0,
        date: new Date().toISOString(),
        paid: false,
      },
    ];

    charges.forEach((charge) => {
      const id = `charge-${this.idCounter++}`;
      this.charges.set(id, {
        id,
        ...charge,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  }

  /**
   * Simulate network latency with random delay
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 400) + 100; // 100-500ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Room operations
  async getRooms(criteria: RoomSearchCriteria = {}): Promise<Room[]> {
    await this.simulateDelay();

    let rooms = Array.from(this.rooms.values());

    if (criteria.status) {
      rooms = rooms.filter((r) => r.status === criteria.status);
    }
    if (criteria.floor !== undefined) {
      rooms = rooms.filter((r) => r.floor === criteria.floor);
    }
    if (criteria.type) {
      rooms = rooms.filter((r) => r.type === criteria.type);
    }
    if (criteria.assigned_manager_id) {
      rooms = rooms.filter((r) => r.assigned_manager_id === criteria.assigned_manager_id);
    }
    if (criteria.current_guest_id) {
      rooms = rooms.filter((r) => r.current_guest_id === criteria.current_guest_id);
    }

    return rooms;
  }

  // Service Request operations
  async getServiceRequests(criteria: ServiceRequestSearch = {}): Promise<ServiceRequest[]> {
    await this.simulateDelay();

    let requests = Array.from(this.serviceRequests.values());

    if (criteria.guest_id) {
      requests = requests.filter((r) => r.guest_id === criteria.guest_id);
    }
    if (criteria.room_number) {
      requests = requests.filter((r) => r.room_number === criteria.room_number);
    }
    if (criteria.status) {
      requests = requests.filter((r) => r.status === criteria.status);
    }
    if (criteria.type) {
      requests = requests.filter((r) => r.type === criteria.type);
    }

    return requests;
  }

  async getServiceRequest(id: string): Promise<ServiceRequest | null> {
    await this.simulateDelay();
    return this.serviceRequests.get(id) || null;
  }

  async createServiceRequest(data: ServiceRequestCreate): Promise<ServiceRequest> {
    await this.simulateDelay();

    const id = `service-${this.idCounter++}`;
    // Generate guest_id from email for mock purposes
    const guest_id = `guest-${Buffer.from(data.guest_email).toString('base64').substring(0, 10)}`;
    
    const serviceRequest: ServiceRequest = {
      id,
      guest_id,
      room_number: data.room_number,
      type: data.type,
      priority: data.priority,
      description: data.description,
      status: ServiceRequestStatus.PENDING,
      salesforce_ticket_id: `SF-${this.idCounter}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.serviceRequests.set(id, serviceRequest);
    return serviceRequest;
  }

  async updateServiceRequest(id: string, data: ServiceRequestUpdate): Promise<ServiceRequest | null> {
    await this.simulateDelay();

    const request = this.serviceRequests.get(id);
    if (!request) {
      return null;
    }

    const updatedRequest: ServiceRequest = {
      ...request,
      ...data,
      updated_at: new Date().toISOString(),
    };

    this.serviceRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Maintenance Task operations
  async getMaintenanceTasks(criteria: MaintenanceTaskSearch = {}): Promise<MaintenanceTask[]> {
    await this.simulateDelay();

    let tasks = Array.from(this.maintenanceTasks.values());

    if (criteria.room_id) {
      tasks = tasks.filter((t) => t.room_id === criteria.room_id);
    }
    if (criteria.status) {
      tasks = tasks.filter((t) => t.status === criteria.status);
    }
    if (criteria.assigned_to) {
      tasks = tasks.filter((t) => t.assigned_to === criteria.assigned_to);
    }
    if (criteria.priority) {
      tasks = tasks.filter((t) => t.priority === criteria.priority);
    }

    return tasks;
  }

  async getMaintenanceTask(id: string): Promise<MaintenanceTask | null> {
    await this.simulateDelay();
    return this.maintenanceTasks.get(id) || null;
  }

  async createMaintenanceTask(data: MaintenanceTaskCreate): Promise<MaintenanceTask> {
    await this.simulateDelay();

    const id = `maintenance-${this.idCounter++}`;
    const task: MaintenanceTask = {
      id,
      ...data,
      status: MaintenanceStatus.PENDING,
      assigned_to: data.assigned_to || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.maintenanceTasks.set(id, task);
    return task;
  }

  async updateMaintenanceTask(id: string, data: MaintenanceTaskUpdate): Promise<MaintenanceTask | null> {
    await this.simulateDelay();

    const task = this.maintenanceTasks.get(id);
    if (!task) {
      return null;
    }

    const updatedTask: MaintenanceTask = {
      ...task,
      ...data,
      updated_at: new Date().toISOString(),
    };

    this.maintenanceTasks.set(id, updatedTask);
    return updatedTask;
  }

  // Charge operations
  async getCharges(criteria: ChargeSearch = {}): Promise<Charge[]> {
    await this.simulateDelay();

    let charges = Array.from(this.charges.values());

    if (criteria.guest_id) {
      charges = charges.filter((c) => c.guest_id === criteria.guest_id);
    }
    if (criteria.type) {
      charges = charges.filter((c) => c.type === criteria.type);
    }
    if (criteria.paid !== undefined) {
      charges = charges.filter((c) => c.paid === criteria.paid);
    }
    if (criteria.date_from) {
      charges = charges.filter((c) => new Date(c.date) >= new Date(criteria.date_from!));
    }
    if (criteria.date_to) {
      charges = charges.filter((c) => new Date(c.date) <= new Date(criteria.date_to!));
    }

    return charges;
  }

  async getCharge(id: string): Promise<Charge | null> {
    await this.simulateDelay();
    return this.charges.get(id) || null;
  }

  async createCharge(data: ChargeCreate): Promise<Charge> {
    await this.simulateDelay();

    const id = `charge-${this.idCounter++}`;
    const charge: Charge = {
      id,
      ...data,
      paid: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.charges.set(id, charge);
    return charge;
  }

  async updateCharge(id: string, data: ChargeUpdate): Promise<Charge | null> {
    await this.simulateDelay();

    const charge = this.charges.get(id);
    if (!charge) {
      return null;
    }

    const updatedCharge: Charge = {
      ...charge,
      ...data,
      updated_at: new Date().toISOString(),
    };

    this.charges.set(id, updatedCharge);
    return updatedCharge;
  }

  /**
   * Clear all data and reseed
   */
  async reset(): Promise<void> {
    this.rooms.clear();
    this.serviceRequests.clear();
    this.maintenanceTasks.clear();
    this.charges.clear();
    this.idCounter = 1;
    this.seedData();
  }
}
