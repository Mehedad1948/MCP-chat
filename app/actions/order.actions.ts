// actions/order.actions.ts
'use server';

import { OrderService } from '../services/order.service';

/**
 * Fetches orders, optionally limited.
 */
export async function getOrdersAction(limit?: number) {
  try {
    const orders = await OrderService.getLatestOrders(limit);
    return { success: true, data: JSON.parse(JSON.stringify(orders)) };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

/**
 * Fetches orders with customer names populated.
 */
export async function getOrdersWithDetailsAction(limit?: number) {
  try {
    const orders = await OrderService.getLatestOrderswithCustomerDetails(limit);
    return { success: true, data: JSON.parse(JSON.stringify(orders)) };
  } catch (error) {
    console.error("Error fetching detailed orders:", error);
    return { success: false, error: "Failed to fetch detailed orders" };
  }
}

/**
 * Fetches a single order by ID.
 */
export async function getOrderByIdAction(id: string) {
  try {
    const order = await OrderService.getOrderById(id);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: JSON.parse(JSON.stringify(order)) };
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return { success: false, error: "Failed to fetch order" };
  }
}
