import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "payment-receipts";
const DEFAULT_CHAT_BUCKET = "chat-attachments";

function getStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_RECEIPT_BUCKET ?? DEFAULT_BUCKET;

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  };
}

function getChatStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_CHAT_BUCKET ?? DEFAULT_CHAT_BUCKET;

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  };
}

function isStorageConfigured() {
  const { supabaseUrl, serviceRoleKey } = getStorageConfig();

  return Boolean(supabaseUrl && serviceRoleKey);
}

function getStorageClient() {
  const { supabaseUrl, serviceRoleKey } = getStorageConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("تنظیمات Supabase Storage کامل نیست.");
  }

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
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    return;
  }

  await client.storage.updateBucket(bucket, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
}

async function ensureChatBucket() {
  const client = getStorageClient();
  const { bucket } = getChatStorageConfig();

  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((item) => item.name === bucket);

  if (!exists) {
    await client.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "text/plain",
      ],
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

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";

  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

export async function uploadReceiptFile(params: {
  orderId: string;
  file: File;
  userId: string;
}) {
  const { file, orderId, userId } = params;
  const { bucket } = getStorageConfig();

  if (!isStorageConfigured()) {
    const dataUrl = await fileToDataUrl(file);

    return {
      path: `${userId}/${orderId}-inline`,
      url: dataUrl,
      storagePath: null,
    };
  }

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

  return {
    path,
    url: path,
    storagePath: path,
  };
}

function isDirectAssetUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
}

export async function getReceiptAccessUrl(params: {
  receiptUrl: string;
  receiptStoragePath?: string | null;
  expiresInSeconds?: number;
}) {
  const storagePath = params.receiptStoragePath ?? null;

  if (!isStorageConfigured()) {
    return params.receiptUrl;
  }

  const path = storagePath ?? (isDirectAssetUrl(params.receiptUrl) ? null : params.receiptUrl);

  if (!path) {
    return params.receiptUrl;
  }

  const client = getStorageClient();
  const { bucket } = getStorageConfig();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, params.expiresInSeconds ?? 60 * 15);

  if (error || !data?.signedUrl) {
    throw new Error("دریافت لینک امن رسید با خطا مواجه شد.");
  }

  return data.signedUrl;
}

export async function uploadChatAttachmentFile(params: {
  conversationId: string;
  file: File;
  userId: string;
}) {
  const { file, conversationId, userId } = params;
  const { bucket } = getChatStorageConfig();

  if (!isStorageConfigured()) {
    const dataUrl = await fileToDataUrl(file);

    return {
      path: `${userId}/${conversationId}-inline-${sanitizeFileName(file.name || "attachment")}`,
      url: dataUrl,
    };
  }

  const client = getStorageClient();

  await ensureChatBucket();

  const fallbackName = file.name ? sanitizeFileName(file.name) : `attachment.${getExtension(file.type)}`;
  const path = `${userId}/${conversationId}-${Date.now()}-${fallbackName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) {
    throw new Error("آپلود فایل گفتگو با خطا مواجه شد.");
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}
