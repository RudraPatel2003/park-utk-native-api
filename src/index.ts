import express from "express";
import env from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";
import dayjs from "dayjs";

env.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_KEY = process.env.SUPABASE_KEY as string;

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

  if (typeof hoursAgo === "string") {
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

app.post("/reports", async (req, res) => {
  const { parking_garage, reported_range } = req.body;

  if (!parking_garage || !reported_range) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  const isTwoKeys = Object.keys(req.body).length === 2;
  if (!isTwoKeys) {
    return res
      .status(400)
      .json({ success: false, error: "Too many fields provided" });
  }

  const { error } = await supabase
    .from("Reports")
    .insert({ parking_garage, reported_range });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res
    .status(200)
    .json({ success: true, data: { parking_garage, reported_range } });
});
