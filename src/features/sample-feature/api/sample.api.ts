import { api } from "@/lib/api";
import { z } from "zod";
import { SampleItem } from "../types";

const sampleItemsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
  }),
);

// Example: GET all items
export async function getSampleItems(): Promise<SampleItem[]> {
  const res = await api.get<unknown>("/sample");
  return sampleItemsSchema.parse(res.data);
}
