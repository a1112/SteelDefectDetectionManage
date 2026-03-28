import { env } from "../config/env";

export type TestModelStatus = {
  enabled: boolean;
  running: boolean;
  current_seq?: number | null;
  current_steel_id?: string | null;
  remaining_records?: number | null;
  current_image_index?: number | null;
  steel_count?: number | null;
  max_seq?: number | null;
  defect_count?: number | null;
  database_name?: string | null;
  database_url?: string | null;
  image_top_root?: string | null;
  image_bottom_root?: string | null;
};

const getBaseUrl = () => {
  const base = env.getConfigBaseUrl();
  return base ? `${base}/config/test_model` : "/config/test_model";
};

export async function getTestModelStatus(): Promise<TestModelStatus> {
  const url = `${getBaseUrl()}/status`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load test model status: ${response.status}`);
  }
  return (await response.json()) as TestModelStatus;
}

export async function getTestModelConfig(): Promise<Record<string, any>> {
  const url = `${getBaseUrl()}/config`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load test model config: ${response.status}`);
  }
  return (await response.json()) as Record<string, any>;
}

export async function updateTestModelConfig(payload: Record<string, any>): Promise<Record<string, any>> {
  const url = `${getBaseUrl()}/config`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to update test model config: ${response.status}`);
  }
  return (await response.json()) as Record<string, any>;
}

export async function startTestModel(): Promise<void> {
  const url = `${getBaseUrl()}/start`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to start test model: ${response.status}`);
  }
}

export async function stopTestModel(): Promise<void> {
  const url = `${getBaseUrl()}/stop`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to stop test model: ${response.status}`);
  }
}

export async function addTestImages(count: number): Promise<void> {
  const url = `${getBaseUrl()}/add_images`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add images: ${response.status}`);
  }
}

export async function addTestImageOne(): Promise<void> {
  const url = `${getBaseUrl()}/add_image_one`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to add image: ${response.status}`);
  }
}

export async function addTestDefects(seqNo?: number, count?: number): Promise<void> {
  const url = `${getBaseUrl()}/add_defects`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq_no: seqNo, count }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add defects: ${response.status}`);
  }
}

export async function deleteTestImages(startSeq?: number, endSeq?: number): Promise<void> {
  const url = `${getBaseUrl()}/delete_images`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start_seq: startSeq, end_seq: endSeq }),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete images: ${response.status}`);
  }
}

export async function clearTestDatabase(): Promise<void> {
  const url = `${getBaseUrl()}/clear_database`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to clear database: ${response.status}`);
  }
}

export async function getTestModelLogs(
  limit: number = 200,
  cursor: number = 0,
): Promise<{ items: any[]; cursor: number }> {
  const url = `${getBaseUrl()}/logs?limit=${limit}&cursor=${cursor}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load logs: ${response.status}`);
  }
  return (await response.json()) as { items: any[]; cursor: number };
}

export async function clearTestModelLogs(): Promise<void> {
  const url = `${getBaseUrl()}/logs/clear`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to clear logs: ${response.status}`);
  }
}
