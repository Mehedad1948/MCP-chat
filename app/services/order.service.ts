import { MOCK_CUSTOMERS } from '../data/weather/customers.data';
import { MOCK_ORDERS } from '../data/weather/orders.data';

export class OrderService {
  static async getLatestOrders(limit?: number) {
    // Implementation to fetch latest orders with optional limit

    const sortedOrders = MOCK_ORDERS.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (limit && limit > 0) {
      return sortedOrders.slice(0, limit);
    }

    return sortedOrders;
  }

  static async getLatestOrderswithCustomerDetails(limit?: number) {
    // Implementation to fetch latest orders along with customer details
    const customers = MOCK_CUSTOMERS;

    const orders = MOCK_ORDERS.map((order) => {
      const customer = customers.find((c) => c._id === order.customer);
      return { ...order, customer: customer?.name };
    });

    const sortedOrders = orders.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (limit && limit > 0) {
      return sortedOrders.slice(0, limit);
    }

    return sortedOrders;
  }

  static async getOrderById(id: string) {
    // Implementation to fetch order by ID
    return MOCK_ORDERS.find((order) => order._id === id) || null;
  }
}
