import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "payment-receipts";

function getStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_RECEIPT_BUCKET ?? DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("تنظیمات Supabase Storage کامل نیست.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  };
}

function getStorageClient() {
  const { supabaseUrl, serviceRoleKey } = getStorageConfig();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function ensureBucket() {
  const client = getStorageClient();
  const { bucket } = getStorageConfig();

  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((item) => item.name === bucket);

  if (!exists) {
    await client.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }
}

function getExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export async function uploadReceiptFile(params: {
  orderId: string;
  file: File;
  userId: string;
}) {
  const { file, orderId, userId } = params;
  const { bucket } = getStorageConfig();
  const client = getStorageClient();

  await ensureBucket();

  const extension = getExtension(file.type);
  const path = `${userId}/${orderId}-${Date.now()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw new Error("آپلود رسید با خطا مواجه شد.");
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}
