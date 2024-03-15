import express from "express";
import env from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";
import dayjs from "dayjs";

env.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_KEY = process.env.SUPABASE_KEY as string;

const ranges = [
  "0 - 5",
  "5 - 10",
  "10 - 20",
  "20 - 40",
  "40-99",
  "100+",
] as const;

const parkingGarages = [
  "11th Street (G13)",
  "Neyland Drive (G10)",
  "Terrace Avenue (G17)",
  "Volunteer Boulevard (G16)",
  "Volunteer Hall (G15)",
  "White Avenue (G12)",
] as const;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(express.json());

const PORT = (process.env.PORT || 8080) as number;

app.listen(PORT, () => {
  console.log(`Server is running http://localhost:${PORT}`);
});

app.get("/reports", async (req, res) => {
  const { hoursAgo } = req.query;

  let data, error;

  const hoursAgoQueryParam = typeof hoursAgo === "string";
  if (hoursAgoQueryParam) {
    // fetch reports from the last x hours
    const hours = parseInt(hoursAgo);
    const dateFilter = dayjs().subtract(hours, "hours").toISOString();

    ({ data, error } = await supabase
      .from("Reports")
      .select()
      .gt("created_at", dateFilter));
  } else {
    ({ data, error } = await supabase.from("Reports").select());
  }

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(200).json({ success: true, data: data });
});

app.get("/reports/:garage", async (req, res) => {
  const { garage } = req.params;
  const { mostRecent } = req.query;

  if (!parkingGarages.includes(garage as any)) {
    return res.status(400).json({ success: false, error: "Invalid garage" });
  }

  let data, error;

  const mostRecentQueryParam = typeof mostRecent === "string";
  if (mostRecentQueryParam) {
    // fetch most recent report for a specific garage
    ({ data, error } = await supabase
      .from("Reports")
      .select()
      .eq("parking_garage", garage)
      .order("created_at", { ascending: false })
      .limit(1));
  } else {
    // fetch all reports for a specific garage
    ({ data, error } = await supabase
      .from("Reports")
      .select()
      .eq("parking_garage", garage));
  }

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(200).json({ success: true, data: data });
});

app.post("/reports", async (req, res) => {
  const { parking_garage, reported_range } = req.body;

  const errors: string[] = [];
  if (!parking_garage || !reported_range) {
    errors.push("Missing required fields");
  }

  const isTwoKeys = Object.keys(req.body).length === 2;
  if (!isTwoKeys) {
    errors.push("Must provide only 2 fields");
  }

  if (!parkingGarages.includes(parking_garage)) {
    errors.push("Invalid parking_garage");
  }

  if (!ranges.includes(reported_range)) {
    errors.push("Invalid reported_range");
  }

  const { error } = await supabase
    .from("Reports")
    .insert({ parking_garage, reported_range });

  if (error) {
    errors.push(error.message);
  }

  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }

  return res
    .status(200)
    .json({ success: true, data: { parking_garage, reported_range } });
});
