/**
 * One-off generator for catalogs/bareeq.js from structured rows.
 * Run: node scripts/build-bareeq-catalog.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {[string, number, string, string?, boolean?][]} name, price, category, desc, soldOut */
const ROWS = [
  ["Fruity Ice Chocolate", 120, "drink", "Fruity & Chocolate"],
  ["Tropical Hibiscus", 100, "drink", "Tropical hibiscus"],
  ["Strawberry Hot Chocolate", 100, "drink", "Winter drink", false],
  ["Bueno Hot Chocolate", 100, "drink", "Bueno hot chocolate"],
  ["Aero Press", 100, "coffee", "Aero press brewing"],
  ["V60", 120, "coffee", "V60 pour-over"],
  ["Vanilla Spice Latte", 120, "coffee", "Fresh milk, cinnamon, vanilla, espresso"],
  ["قهوة تركي", 35, "coffee", "Turkish coffee"],
  ["Medjool Date Latte", 120, "coffee", "Majdool dates, espresso, fresh milk, cinnamon"],
  ["Pistachio Latte", 130, "coffee", "Pistachio, fresh milk, espresso"],
  ["Spanish Latte", 115, "coffee", "Condensed milk, espresso, milk"],
  ["White Mocha", 115, "coffee", "White mocha, espresso, milk"],
  ["Mocha", 115, "coffee", "Chocolate, fresh milk, espresso"],
  ["Macchiato", 60, "coffee", "Espresso with light foam"],
  ["Salted Caramel Latte", 115, "coffee", "Salted caramel latte"],
  ["Cappuccino", 85, "coffee", "Fresh milk, espresso, foam"],
  ["Latte", 100, "coffee", "Fresh milk and espresso"],
  ["Cortado", 70, "coffee", "Espresso, milk, foam"],
  ["Hot Caramel Macchiato", 115, "coffee", "Caramel, fresh milk, espresso"],
  ["Flat White", 80, "coffee", "Espresso, milk, light foam"],
  ["Cinnamon Caramel Latte", 115, "coffee", "Caramel, cinnamon, fresh milk, espresso"],
  ["Americano", 70, "coffee", "Espresso and hot water"],
  ["Espresso", 60, "coffee", "Specialty espresso"],
  ["Iced Americano", 70, "coffee", "Iced americano"],
  ["Iced Pistachio Latte", 130, "coffee", "Pistachio iced latte"],
  ["Iced Caramel Macchiato", 115, "coffee", "Iced caramel macchiato"],
  ["Iced Shaken White Mocha", 115, "coffee", "Iced white mocha"],
  ["Iced Mocha", 115, "coffee", "Iced mocha"],
  ["Iced Salted Caramel Latte", 115, "coffee", "Iced salted caramel"],
  ["Iced Spanish Latte", 115, "coffee", "Iced Spanish latte"],
  ["Iced Latte", 100, "coffee", "Iced latte"],
  ["Peanut Butter Blend", 120, "blended", "Peanut butter blend"],
  ["Pistachio Cream Blend", 130, "blended", "Pistachio cream blend"],
  ["Caramel Blend", 120, "blended", "Caramel blend"],
  ["White Mocha Blend", 120, "blended", "White mocha blend"],
  ["Salted Caramel Blend", 120, "blended", "Salted caramel blend"],
  ["Mocha Blend", 120, "blended", "Mocha blend"],
  ["Latte Blend", 100, "blended", "Latte blend"],
  ["Spanish Blend", 120, "blended", "Spanish blend"],
  ["Oreo Nutella Cream", 100, "blended", "Oreo and Nutella"],
  ["Strawberry Vanilla Cream", 100, "blended", "Strawberry vanilla cream"],
  ["Blueberry Cream", 90, "blended", "Blueberry cream"],
  ["Matcha Salted Caramel", 120, "tea", "Matcha salted caramel"],
  ["Hot Spanish Matcha", 120, "tea", "Spanish matcha"],
  ["Japanese Cream Spanish Matcha", 120, "tea", "Japanese matcha Spanish style"],
  ["Japanese Blueberry Matcha Cream", 120, "tea", "Blueberry matcha cream"],
  ["Japanese Iced White Chocolate Matcha", 120, "tea", "Iced white chocolate matcha"],
  ["Japanese Matcha Latte", 120, "tea", "Japanese matcha latte"],
  ["Japanese White Chocolate Matcha Blend", 120, "tea", "White chocolate matcha blend"],
  ["Japanese Cream Matcha", 120, "tea", "Cream matcha"],
  ["Sunshine Red Bull", 130, "drink", "Red Bull sunshine mix"],
  ["Red Bull", 100, "drink", "Red Bull"],
  ["Water", 10, "drink", "Water", false, true],
  ["Sunshine Blue Lemonade", 80, "drink", "Blue lemon soda"],
  ["Sunshine Strawberry", 80, "drink", "Strawberry soda"],
  ["Sunshine Peach", 80, "drink", "Peach soda"],
  ["Sunshine Blueberry", 80, "drink", "Blueberry soda"],
  ["Sunshine Passion Fruit", 80, "drink", "Passion fruit soda"],
  ["Sunshine Lemon Mint", 80, "drink", "Lemon mint soda"],
  ["Peach Iced Tea", 80, "drink", "Peach iced tea"],
  ["Lemon Passion Fruit", 80, "drink", "Lemon passion fruit"],
  ["Watermelon Juice", 80, "drink", "Watermelon juice"],
  ["Mango Smoothie", 70, "drink", "Mango smoothie"],
  ["Mango Juice", 60, "drink", "Mango juice"],
  ["Blueberry Smoothie", 80, "drink", "Blueberry smoothie"],
  ["Passion Fruit Smoothie", 80, "drink", "Passion fruit smoothie"],
  ["Mint Lemonade", 60, "drink", "Mint lemonade"],
  ["Fresh Orange Juice", 60, "drink", "Fresh orange", true],
  ["Blueberry Danish", 120, "dessert", "Blueberry Danish pastry"],
  ["Red Velvet Cake", 120, "dessert", "Red velvet cake"],
  ["Carrot Cake", 120, "dessert", "Carrot cake walnut"],
  ["Classic Cheesecake", 80, "dessert", "Plain cheesecake"],
  ["Italian Tiramisu", 120, "dessert", "Italian tiramisu"],
  ["Russian Honey Cake", 90, "dessert", "Honey cake"],
  ["Chocolate Cake Walnut", 100, "dessert", "Chocolate walnut cake"],
  ["San Sebastian Cheesecake", 90, "dessert", "San Sebastian cheesecake"],
  ["Tuna Melt Sandwich", 90, "food", "Tuna melt on brown bread"],
  ["American Donuts", 80, "food", "American donuts"],
  ["Butter Croissant", 50, "food", "Butter croissant"],
  ["Pistachio Croissant", 100, "food", "Pistachio croissant"],
  ["Turkish Chicken Sandwich", 95, "food", "Cheese, chicken, lettuce, pepper"],
  ["Turkish Cheese Croissant", 85, "food", "Savory croissant sandwich"],
  ["Nutella Croissant", 80, "food", "Nutella croissant"],
  ["Cinnamon Roll", 80, "food", "Cinnamon roll", true],
  ["Nutella Cookies", 85, "dessert", "Nutella cookies"],
  ["Kinder Cookies", 85, "dessert", "Kinder cookies"],
  ["Original Cookie", 85, "dessert", "Original cookie"],
];

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function inferTraits(name, category, price, desc) {
  const n = `${name} ${desc}`.toLowerCase();
  const iced = n.includes("iced") || n.includes("آيس") || n.includes("cold");
  const hot =
    n.includes("hot") ||
    n.includes("latte") ||
    n.includes("cappuccino") ||
    n.includes("espresso") ||
    n.includes("macchiato") ||
    (category === "coffee" && !iced);
  let temperature = "room";
  if (iced) temperature = "iced";
  else if (hot || category === "food") temperature = "hot";

  let caffeine = "none";
  if (n.includes("turkish") || n.includes("تركي") || n.includes("espresso") || n.includes("americano"))
    caffeine = n.includes("macchiato") || n.includes("cortado") || n.includes("flat white")
      ? "medium"
      : "high";
  else if (category === "coffee" || category === "tea" || n.includes("matcha"))
    caffeine = "medium";
  if (category === "blended" || n.includes("red bull")) caffeine = "medium";
  if (category === "drink" && !n.includes("tea")) caffeine = "none";

  let sweetness = "low";
  if (n.includes("mocha") || n.includes("caramel") || n.includes("nutella") || n.includes("chocolate"))
    sweetness = "high";
  if (n.includes("blend") || n.includes("cream") || category === "dessert") sweetness = "high";
  if (n.includes("americano") || n.includes("espresso") || n.includes("turkish")) sweetness = "none";

  const recommendedFor = [];
  if (category === "food") recommendedFor.push("breakfast", "lunch", "friends", "family");
  if (category === "dessert") recommendedFor.push("date", "friends", "celebration", "comfort");
  if (caffeine === "high") recommendedFor.push("working", "quickCoffee");
  if (caffeine === "medium") recommendedFor.push("studying", "friends", "meeting");
  if (temperature === "iced") recommendedFor.push("hotWeather", "gym");
  if (price <= 85) recommendedFor.push("quickCoffee", "waiting");
  if (n.includes("matcha")) recommendedFor.push("studying", "relaxing", "firstVisit");
  if (n.includes("flat white") || n.includes("cortado") || n.includes("macchiato"))
    recommendedFor.push("studying", "relaxing", "meeting", "quickCoffee");
  if (n.includes("turkish") || n.includes("تركي"))
    recommendedFor.push("quickCoffee", "waiting", "firstVisit");

  const healthy =
    n.includes("water") ||
    n.includes("lemonade") ||
    n.includes("juice") ||
    n.includes("smoothie") ||
    category === "food";

  let energy = "medium";
  if (caffeine === "high") energy = "high";
  if (caffeine === "none") energy = "low";

  return { temperature, caffeine, sweetness, energy, healthy, recommendedFor };
}

const lines = [`import { defineProduct } from "./product.js";`, "", "export const products = ["];

for (const row of ROWS) {
  const [name, price, category, desc = name, soldOut = false, notRecommendable = false] = row;
  const id = `bq-${slug(name)}`;
  const traits = inferTraits(name, category, price, desc);
  const avail = soldOut ? false : true;
  const rec = notRecommendable ? false : true;
  lines.push("  defineProduct({");
  lines.push(`    id: ${JSON.stringify(id)},`);
  lines.push(`    name: ${JSON.stringify(name)},`);
  lines.push(`    category: ${JSON.stringify(category)},`);
  lines.push(`    price: ${price},`);
  lines.push(`    temperature: ${JSON.stringify(traits.temperature)},`);
  lines.push(`    sweetness: ${JSON.stringify(traits.sweetness)},`);
  lines.push(`    caffeine: ${JSON.stringify(traits.caffeine)},`);
  lines.push(`    energy: ${JSON.stringify(traits.energy)},`);
  lines.push(`    healthy: ${traits.healthy},`);
  lines.push(`    recommendedFor: ${JSON.stringify([...new Set(traits.recommendedFor)])},`);
  lines.push(`    description: ${JSON.stringify(desc)},`);
  lines.push(`    availability: ${avail},`);
  if (!rec) lines.push(`    recommendable: false,`);
  lines.push("  }),");
}

lines.push("];", "");

writeFileSync(join(__dirname, "../catalogs/bareeq.js"), lines.join("\n"), "utf8");
console.log("Wrote catalogs/bareeq.js with", ROWS.length, "products");
