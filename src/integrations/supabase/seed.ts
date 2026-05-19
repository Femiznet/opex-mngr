import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Database, TablesInsert } from "./types";

// Load local environment variables from your project root
dotenv.config();

// Fallback check for both Vite-prefixed keys and standard keys
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables. Please check your .env file.");
  process.exit(1);
}

// Client initialized using Service Role Key to bypass Row Level Security (RLS)
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Generic Normalizer for straightforward tables (like Tickets)
function lowercaseKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(lowercaseKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      // Keep 'snapshot' blocks completely intact for your submission_versions table
      if (key.toLowerCase() === "snapshot") {
        acc["snapshot"] = obj[key];
        return acc;
      }
      // Convert PascalCase/camelCase to snake_case (e.g., TicketOwner -> ticket_owner)
      const snakeKey = key
        .replace(/[A-Z]/g, (match, offset) => (offset > 0 ? "_" : "") + match.toLowerCase())
        .toLowerCase();
      acc[snakeKey] = lowercaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// Reads JSON data from the root data/ folder and normalizes keys to snake_case
function loadAndNormalizeJson<T>(fileName: string): T {
  const filePath = path.join(process.cwd(), "data", fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const rawData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return lowercaseKeys(rawData) as unknown as T;
}

// Cleans currency pricing strings safely, even if values are missing, null, or undefined
function parsePrice(priceStr: string | number | null | undefined): number {
  if (priceStr === null || priceStr === undefined) return 0;
  if (typeof priceStr === "number") return priceStr;

  // Ensure we are working with a string before running regex .replace
  const cleanStr = String(priceStr).replace(/,/g, "").trim();
  const parsed = parseFloat(cleanStr);

  return isNaN(parsed) ? 0 : parsed;
}

// Fixes decimal values for columns that expect integers (like qty_available)
function parseInteger(intStr: string | number | null | undefined): number {
  if (intStr === null || intStr === undefined) return 0;
  if (typeof intStr === "number") return Math.round(intStr);

  const cleanStr = String(intStr).replace(/,/g, "").trim();
  const parsed = parseFloat(cleanStr);

  return isNaN(parsed) ? 0 : Math.round(parsed);
}

async function seed() {
  console.log("🚀 Starting database seed processing...");

  try {
    // --- 1. CLEAN EXISTING DATA (Avoids Unique Constraint Conflicts) ---
    console.log("🧹 Cleaning up old database rows...");
    // Child tables must be wiped first due to foreign keys
    await supabase.from("submission_versions").delete().neq("id", 0);
    await supabase.from("submission_items").delete().neq("id", 0);
    await supabase.from("submissions").delete().neq("id", 0);
    await supabase.from("materials").delete().neq("id", 0);
    await supabase.from("categories").delete().neq("id", 0);
    await supabase.from("tickets").delete().neq("id", 0);
    console.log("✨ Database wiped fresh.");

    // --- 2. SEED TICKETS ---
    console.log("📦 Parsing tickets.json...");
    const rawTickets = loadAndNormalizeJson<TablesInsert<"tickets">[]>("tickets.json");

    // Ensure status aligns with allowed Enums ("Closed" -> "closed")
    const fixedTickets = rawTickets.map((ticket) => ({
      ...ticket,
      status: (ticket.status?.toLowerCase() as "open" | "closed") || "open",
    }));

    const { error: tktErr } = await supabase.from("tickets").insert(fixedTickets);
    if (tktErr) throw tktErr;
    console.log(`✅ Seeded ${fixedTickets.length} tickets.`);

    // --- 3. SEED CATEGORIES & MATERIALS ---
    console.log("📦 Parsing categories.json...");
    const catFilePath = path.join(process.cwd(), "data", "categories.json");
    if (!fs.existsSync(catFilePath)) {
      throw new Error(`File not found: ${catFilePath}`);
    }
    const rawCategoriesObj = JSON.parse(fs.readFileSync(catFilePath, "utf8"));

    const categoriesToInsert: TablesInsert<"categories">[] = [];
    const materialsToInsert: TablesInsert<"materials">[] = [];

    // Track sequential category IDs starting at 1
    let currentCategoryId = 1;

    for (const categoryName of Object.keys(rawCategoriesObj)) {
      categoriesToInsert.push({
        id: currentCategoryId,
        name: categoryName.toLowerCase(),
      });

      const rawMaterialsArray = rawCategoriesObj[categoryName];
      if (Array.isArray(rawMaterialsArray)) {
        for (const mat of rawMaterialsArray) {
          materialsToInsert.push({
            category_id: currentCategoryId,
            name: mat["MATERIALS"] || mat["materials"] || "Unnamed Material",
            price: parsePrice(mat["PRICES"] || mat["prices"]),
            // 🔄 FIX: Use parseInteger to convert "7.5" decimals to rounded numbers
            qty_available: parseInteger(mat["QTY AVAILABLE"] || mat["qty_available"]),
          });
        }
      }
      currentCategoryId++;
    }

    // Insert categories first
    const { error: catErr } = await supabase.from("categories").insert(categoriesToInsert);
    if (catErr) throw catErr;
    console.log(`✅ Seeded ${categoriesToInsert.length} categories.`);

    // Insert child materials linked via category_id
    const { error: matErr } = await supabase.from("materials").insert(materialsToInsert);
    if (matErr) throw matErr;
    console.log(`✅ Seeded ${materialsToInsert.length} materials.`);

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
