export type SlotStatus = "AVAILABLE" | "BOOKED" | "HELD" | "BLOCKED";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Slot {
  id: string;
  instructorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
}

export interface Booking {
  id: string;
  reference: string;
  studentId: string;
  instructorId: string;
  slotId: string;
  status: BookingStatus;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  slot?: Slot;
}
