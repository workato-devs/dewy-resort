"use strict";
// Salesforce Integration Type Definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargeType = exports.MaintenanceStatus = exports.MaintenancePriority = exports.ServiceRequestStatus = exports.ServiceRequestPriority = exports.ServiceRequestType = exports.RoomStatus = exports.RoomType = void 0;
// ============================================================================
// Room Entity Types
// ============================================================================
var RoomType;
(function (RoomType) {
    RoomType["STANDARD"] = "standard";
    RoomType["DELUXE"] = "deluxe";
    RoomType["SUITE"] = "suite";
})(RoomType || (exports.RoomType = RoomType = {}));
var RoomStatus;
(function (RoomStatus) {
    RoomStatus["VACANT"] = "vacant";
    RoomStatus["OCCUPIED"] = "occupied";
    RoomStatus["CLEANING"] = "cleaning";
    RoomStatus["MAINTENANCE"] = "maintenance";
})(RoomStatus || (exports.RoomStatus = RoomStatus = {}));
// ============================================================================
// Service Request Types
// ============================================================================
var ServiceRequestType;
(function (ServiceRequestType) {
    ServiceRequestType["HOUSEKEEPING"] = "housekeeping";
    ServiceRequestType["ROOM_SERVICE"] = "room_service";
    ServiceRequestType["MAINTENANCE"] = "maintenance";
    ServiceRequestType["CONCIERGE"] = "concierge";
})(ServiceRequestType || (exports.ServiceRequestType = ServiceRequestType = {}));
var ServiceRequestPriority;
(function (ServiceRequestPriority) {
    ServiceRequestPriority["LOW"] = "low";
    ServiceRequestPriority["MEDIUM"] = "medium";
    ServiceRequestPriority["HIGH"] = "high";
})(ServiceRequestPriority || (exports.ServiceRequestPriority = ServiceRequestPriority = {}));
var ServiceRequestStatus;
(function (ServiceRequestStatus) {
    ServiceRequestStatus["PENDING"] = "pending";
    ServiceRequestStatus["IN_PROGRESS"] = "in_progress";
    ServiceRequestStatus["COMPLETED"] = "completed";
    ServiceRequestStatus["CANCELLED"] = "cancelled";
})(ServiceRequestStatus || (exports.ServiceRequestStatus = ServiceRequestStatus = {}));
// ============================================================================
// Maintenance Task Types
// ============================================================================
var MaintenancePriority;
(function (MaintenancePriority) {
    MaintenancePriority["LOW"] = "low";
    MaintenancePriority["MEDIUM"] = "medium";
    MaintenancePriority["HIGH"] = "high";
    MaintenancePriority["URGENT"] = "urgent";
})(MaintenancePriority || (exports.MaintenancePriority = MaintenancePriority = {}));
var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["PENDING"] = "pending";
    MaintenanceStatus["IN_PROGRESS"] = "in_progress";
    MaintenanceStatus["COMPLETED"] = "completed";
    MaintenanceStatus["CANCELLED"] = "cancelled";
})(MaintenanceStatus || (exports.MaintenanceStatus = MaintenanceStatus = {}));
// ============================================================================
// Charge Entity Types
// ============================================================================
var ChargeType;
(function (ChargeType) {
    ChargeType["ROOM"] = "room";
    ChargeType["SERVICE"] = "service";
    ChargeType["FOOD"] = "food";
    ChargeType["OTHER"] = "other";
})(ChargeType || (exports.ChargeType = ChargeType = {}));
