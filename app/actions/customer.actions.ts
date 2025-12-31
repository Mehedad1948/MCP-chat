// actions/customer.actions.ts
'use server';

import { CustomerService } from '../services/customer.service';

export async function getCustomersAction(limit?: number) {
  try {
    // In Next.js actions, we return data directly rather than using res.json()
    const customers = await CustomerService.getLatestCustomers(limit);
    return { success: true, data: JSON.parse(JSON.stringify(customers)) };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

/**
 * Fetches a single customer by ID.
 */
export async function getCustomerByIdAction(id: string) {
  try {
    const customer = await CustomerService.getCustomerById(id);
    
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    return { success: true, data: JSON.parse(JSON.stringify(customer)) };
  } catch (error) {
    console.error("Error fetching customer by ID:", error);
    return { success: false, error: "Failed to fetch customer" };
  }
}
