/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

export function registerEngineeringTools(server: any) {
  console.log("Registering Engineering Tools...");

  // Tool 1: Mechanical Engineering - Beam Deflection
  server.tool(
    "calculateBeamDeflection",
    "Calculate the maximum deflection of a simply supported beam with a center point load. Use this instead of calculating manually.",
    {
      loadNewtons: z.number().describe("The point load applied to the center of the beam in Newtons (N)"),
      lengthMeters: z.number().describe("The span length of the beam in meters (m)"),
      elasticityPa: z.number().describe("Young's Modulus of the material in Pascals (Pa)"),
      inertiaM4: z.number().describe("Area moment of inertia in meters to the fourth power (m^4)")
    },
    async ({ loadNewtons, lengthMeters, elasticityPa, inertiaM4 }: { loadNewtons: number, lengthMeters: number, elasticityPa: number, inertiaM4: number }) => {
      console.log("Executing deterministic beam deflection calculation...");
      
      // Formula: max deflection = (F * L^3) / (48 * E * I)
      const deflectionMeters = (loadNewtons * Math.pow(lengthMeters, 3)) / (48 * elasticityPa * inertiaM4);
      const deflectionMm = deflectionMeters * 1000;

      const resultText = `Deterministic Result: The maximum beam deflection is ${deflectionMeters.toExponential(4)} meters (${deflectionMm.toFixed(4)} mm).`;

      return {
        content: [{ type: "text", text: resultText }],
      };
    }
  );

  // Tool 2: HVAC - Pipe Friction Loss (Darcy-Weisbach Equation)
  server.tool(
    "calculatePipeFrictionLoss",
    "Calculate the pressure drop (friction loss) in a pipe using the Darcy-Weisbach equation.",
    {
      frictionFactor: z.number().describe("Darcy friction factor (dimensionless)"),
      lengthMeters: z.number().describe("Length of the pipe in meters (m)"),
      diameterMeters: z.number().describe("Internal diameter of the pipe in meters (m)"),
      densityKgM3: z.number().describe("Density of the fluid in kg/m^3 (e.g., Water is ~1000)"),
      velocityMS: z.number().describe("Flow velocity of the fluid in meters per second (m/s)")
    },
    async ({ frictionFactor, lengthMeters, diameterMeters, densityKgM3, velocityMS }: { frictionFactor: number, lengthMeters: number, diameterMeters: number, densityKgM3: number, velocityMS: number }) => {
      console.log("Executing deterministic pipe friction calculation...");

      // Formula: Delta P = f * (L/D) * (rho * v^2 / 2)
      const pressureDropPa = frictionFactor * (lengthMeters / diameterMeters) * ((densityKgM3 * Math.pow(velocityMS, 2)) / 2);
      
      const resultText = `Deterministic Result: The pressure drop due to friction is ${pressureDropPa.toFixed(2)} Pascals (Pa).`;

      return {
        content: [{ type: "text", text: resultText }],
      };
    }
  );

  // Tool 3: Material Properties Lookup (Simulating a standard database lookup)
  server.tool(
    "getMaterialProperties",
    "Lookup standardized mechanical properties for common engineering materials.",
    {
      materialName: z.enum(["Structural Steel (A36)", "Aluminum 6061-T6", "Titanium Ti-6Al-4V"]).describe("The name of the material to look up.")
    },
    async ({ materialName }: { materialName: string }) => {
      console.log(`Looking up standard properties for ${materialName}...`);
      
      // In a real app, this would query your RAG vector database or SQL database
      const database: Record<string, any> = {
        "Structural Steel (A36)": {
          youngsModulusPa: 200e9,
          yieldStrengthPa: 250e6,
          densityKgM3: 7850
        },
        "Aluminum 6061-T6": {
          youngsModulusPa: 69e9,
          yieldStrengthPa: 276e6,
          densityKgM3: 2700
        },
        "Titanium Ti-6Al-4V": {
          youngsModulusPa: 114e9,
          yieldStrengthPa: 880e6,
          densityKgM3: 4430
        }
      };

      const data = database[materialName] || { error: "Material not found in standards database." };

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
